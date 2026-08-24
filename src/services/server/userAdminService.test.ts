import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: {} }));

import {
  UserAdminDomainError,
  assertManagedUserUpdateAllowed,
  parseCreateManagedUserInput,
  parseUpdateManagedUserInput,
} from "./userAdminService";

describe("parseCreateManagedUserInput", () => {
  it("normaliza e valida os dados de criação", () => {
    expect(
      parseCreateManagedUserInput({
        email: "  ADMIN@ESCOLA.COM.BR ",
        fullName: "  Maria Felix  ",
        role: "gestor",
        password: "Temporaria123",
      }),
    ).toEqual({
      email: "admin@escola.com.br",
      fullName: "Maria Felix",
      role: "gestor",
      password: "Temporaria123",
    });
  });

  it.each([
    [{ email: "invalido", fullName: "Maria Felix", role: "admin", password: "Senha123" }],
    [{ email: "maria@escola.com", fullName: "M", role: "admin", password: "Senha123" }],
    [{ email: "maria@escola.com", fullName: "Maria Felix", role: "professor", password: "Senha123" }],
    [{ email: "maria@escola.com", fullName: "Maria Felix", role: "admin", password: "curta" }],
  ])("rejeita payload de criação inválido", (payload) => {
    expect(() => parseCreateManagedUserInput(payload)).toThrow(UserAdminDomainError);
  });
});

describe("parseUpdateManagedUserInput", () => {
  it.each([
    [{ role: "coordenador" }, { role: "coordenador" }],
    [{ isActive: false }, { isActive: false }],
    [{ role: "admin", isActive: true }, { role: "admin", isActive: true }],
  ])("aceita alterações administrativas válidas", (payload, expected) => {
    expect(parseUpdateManagedUserInput(payload)).toEqual(expected);
  });

  it.each([{}, { role: "professor" }, { isActive: "sim" }, null])(
    "rejeita alteração vazia ou inválida",
    (payload) => {
      expect(() => parseUpdateManagedUserInput(payload)).toThrow(UserAdminDomainError);
    },
  );
});

describe("assertManagedUserUpdateAllowed", () => {
  const base = {
    userId: "target-id",
    actorId: "admin-id",
    currentRole: "gestor",
    currentIsActive: true,
  };

  it("impede que o administrador desative a própria conta", () => {
    expect(() =>
      assertManagedUserUpdateAllowed({
        ...base,
        userId: "admin-id",
        updates: { isActive: false },
      }),
    ).toThrowError(expect.objectContaining({ code: "self_deactivation", status: 409 }));
  });

  it("impede que o administrador remova o próprio papel", () => {
    expect(() =>
      assertManagedUserUpdateAllowed({
        ...base,
        userId: "admin-id",
        currentRole: "admin",
        updates: { role: "gestor" },
      }),
    ).toThrowError(expect.objectContaining({ code: "self_demotion", status: 409 }));
  });

  it("preserva ao menos um administrador ativo", () => {
    expect(() =>
      assertManagedUserUpdateAllowed({
        ...base,
        currentRole: "admin",
        updates: { isActive: false },
        activeAdminCount: 1,
      }),
    ).toThrowError(expect.objectContaining({ code: "last_admin", status: 409 }));
  });

  it("permite alterar outro administrador quando há redundância", () => {
    expect(
      assertManagedUserUpdateAllowed({
        ...base,
        currentRole: "admin",
        updates: { role: "coordenador" },
        activeAdminCount: 2,
      }),
    ).toEqual({
      nextRole: "coordenador",
      nextIsActive: true,
      removesActiveAdmin: true,
    });
  });
});
