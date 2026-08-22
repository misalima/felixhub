import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCouncilStaff: vi.fn(),
  archiveCouncil: vi.fn(),
  getCouncilOverview: vi.fn(),
}));

vi.mock("@/lib/class-council/auth", () => ({ requireCouncilStaff: mocks.requireCouncilStaff }));
vi.mock("@/services/server/classCouncilService", () => ({
  archiveCouncil: mocks.archiveCouncil,
  getCouncilOverview: mocks.getCouncilOverview,
}));

import { DELETE } from "./route";

describe("DELETE /api/class-councils/:councilId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCouncilStaff.mockResolvedValue({ user: { id: "actor-id" } });
    mocks.archiveCouncil.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001", status: "archived" });
  });

  it("executa o guard antes de arquivar e usa o usuário autenticado como autor", async () => {
    const councilId = "00000000-0000-4000-8000-000000000001";
    const response = await DELETE(new NextRequest(`http://localhost/api/class-councils/${councilId}`, { method: "DELETE" }), { params: Promise.resolve({ councilId }) });

    expect(response.status).toBe(200);
    expect(mocks.requireCouncilStaff).toHaveBeenCalledOnce();
    expect(mocks.archiveCouncil).toHaveBeenCalledWith(councilId, "actor-id");
    expect(mocks.requireCouncilStaff.mock.invocationCallOrder[0]).toBeLessThan(mocks.archiveCouncil.mock.invocationCallOrder[0]);
  });
});
