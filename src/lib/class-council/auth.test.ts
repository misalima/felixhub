import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CouncilAuthError, requireCouncilStaff } from "./auth";

function request(cookies = "") {
  return new NextRequest("http://localhost/api/class-councils", { headers: cookies ? { cookie: cookies } : undefined });
}

const deps = (profile: { id: string; role: string; is_active: boolean } | null) => ({
  getUser: vi.fn(async () => ({ user: { id: "user-id" }, error: null })),
  getProfile: vi.fn(async () => ({ profile, error: null })),
});

describe("requireCouncilStaff", () => {
  it("retorna 401 sem sessão Supabase", async () => {
    await expect(requireCouncilStaff(request(), deps(null))).rejects.toMatchObject({ status: 401 } satisfies Partial<CouncilAuthError>);
  });

  it("não aceita teacher_session isolada", async () => {
    const dependencies = deps({ id: "user-id", role: "admin", is_active: true });
    await expect(requireCouncilStaff(request("teacher_session=valid"), dependencies)).rejects.toMatchObject({ status: 401 } satisfies Partial<CouncilAuthError>);
    expect(dependencies.getUser).not.toHaveBeenCalled();
  });

  it.each([
    [{ id: "user-id", role: "admin", is_active: false }],
    [{ id: "user-id", role: "professor", is_active: true }],
    [null],
  ])("retorna 403 para perfil inativo, ausente ou sem papel autorizado", async (profile) => {
    await expect(requireCouncilStaff(request("sb_access_token=token"), deps(profile))).rejects.toMatchObject({ status: 403 } satisfies Partial<CouncilAuthError>);
  });

  it.each(["admin", "gestor", "coordenador"])("autoriza perfil %s ativo", async (role) => {
    await expect(requireCouncilStaff(request("sb_access_token=token"), deps({ id: "user-id", role, is_active: true }))).resolves.toMatchObject({ user: { id: "user-id" } });
  });
});
