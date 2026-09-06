import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCouncilStaff: vi.fn(),
  deleteImportVersion: vi.fn(),
}));

vi.mock("@/lib/class-council/auth", () => ({ requireCouncilStaff: mocks.requireCouncilStaff }));
vi.mock("@/services/server/classCouncilImportService", () => ({ deleteImportVersion: mocks.deleteImportVersion }));

import { DELETE } from "./route";

describe("DELETE /api/class-councils/:councilId/imports/:importId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCouncilStaff.mockResolvedValue({ user: { id: "actor-id" } });
    mocks.deleteImportVersion.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000002", fileRemoved: true });
  });

  it("exige acesso da equipe e exclui a versão informada", async () => {
    const councilId = "00000000-0000-4000-8000-000000000001";
    const importId = "00000000-0000-4000-8000-000000000002";
    const response = await DELETE(
      new NextRequest(`http://localhost/api/class-councils/${councilId}/imports/${importId}`, { method: "DELETE" }),
      { params: Promise.resolve({ councilId, importId }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.requireCouncilStaff).toHaveBeenCalledOnce();
    expect(mocks.deleteImportVersion).toHaveBeenCalledWith(councilId, importId);
    expect(mocks.requireCouncilStaff.mock.invocationCallOrder[0]).toBeLessThan(mocks.deleteImportVersion.mock.invocationCallOrder[0]);
  });
});
