import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ requireCouncilStaff: vi.fn(), reopenCouncil: vi.fn() }));
vi.mock("@/lib/class-council/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/class-council/auth")>()),
  requireCouncilStaff: mocks.requireCouncilStaff,
}));
vi.mock("@/services/server/classCouncilService", () => ({ reopenCouncil: mocks.reopenCouncil }));

import { POST } from "./route";

describe("POST /api/class-councils/:councilId/reopen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCouncilStaff.mockResolvedValue({ user: { id: "actor-id" } });
    mocks.reopenCouncil.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001", status: "reopened" });
  });

  it("autoriza antes de reabrir e usa o usuário autenticado", async () => {
    const councilId = "00000000-0000-4000-8000-000000000001";
    const response = await POST(new NextRequest(`http://localhost/api/class-councils/${councilId}/reopen`, { method: "POST" }), { params: Promise.resolve({ councilId }) });
    expect(response.status).toBe(200);
    expect(mocks.reopenCouncil).toHaveBeenCalledWith(councilId, "actor-id");
    expect(mocks.requireCouncilStaff.mock.invocationCallOrder[0]).toBeLessThan(mocks.reopenCouncil.mock.invocationCallOrder[0]);
  });

  it("não chama o service quando o guard rejeita a sessão", async () => {
    mocks.requireCouncilStaff.mockRejectedValue(new Error("unauthorized"));
    const councilId = "00000000-0000-4000-8000-000000000001";
    await POST(new NextRequest(`http://localhost/api/class-councils/${councilId}/reopen`, { method: "POST" }), { params: Promise.resolve({ councilId }) });
    expect(mocks.reopenCouncil).not.toHaveBeenCalled();
  });
});
