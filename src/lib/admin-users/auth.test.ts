import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AdminAuthError, requireAdmin } from "./auth";

function request(cookies = "") {
  return new NextRequest("http://localhost/api/admin/users", {
    headers: cookies ? { cookie: cookies } : undefined,
  });
}

const deps = (profile: { id: string; role: string; is_active: boolean } | null) => ({
  getUser: vi.fn(async () => ({ user: { id: "admin-id" }, error: null })),
  getProfile: vi.fn(async () => ({ profile, error: null })),
});

describe("requireAdmin", () => {
  it("retorna 401 quando não existe sessão", async () => {
    const dependencies = deps(null);

    await expect(requireAdmin(request(), dependencies)).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<AdminAuthError>);
    expect(dependencies.getUser).not.toHaveBeenCalled();
  });

  it.each([
    [{ id: "admin-id", role: "admin", is_active: false }],
    [{ id: "admin-id", role: "gestor", is_active: true }],
    [{ id: "admin-id", role: "coordenador", is_active: true }],
    [null],
  ])("retorna 403 para perfil inativo, ausente ou não administrador", async (profile) => {
    await expect(
      requireAdmin(request("sb_access_token=token"), deps(profile)),
    ).rejects.toMatchObject({ status: 403 } satisfies Partial<AdminAuthError>);
  });

  it("autoriza somente administrador ativo", async () => {
    const dependencies = deps({ id: "admin-id", role: "admin", is_active: true });

    await expect(
      requireAdmin(request("sb_access_token=token"), dependencies),
    ).resolves.toMatchObject({ user: { id: "admin-id" }, profile: { role: "admin" } });
    expect(dependencies.getUser).toHaveBeenCalledWith("token");
    expect(dependencies.getProfile).toHaveBeenCalledWith("admin-id");
  });
});
