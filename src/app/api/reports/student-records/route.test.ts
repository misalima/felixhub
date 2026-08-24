import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ requireCouncilStaff: vi.fn(), getCurrentClassStudentIds: vi.fn(), getStudentProfiles: vi.fn() }));

vi.mock("@/lib/class-council/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/class-council/auth")>()),
  requireCouncilStaff: mocks.requireCouncilStaff,
}));
vi.mock("@/services/server/studentProfileService", () => ({
  getCurrentClassStudentIds: mocks.getCurrentClassStudentIds,
  getStudentProfiles: mocks.getStudentProfiles,
}));

import { GET } from "./route";

const firstStudent = "00000000-0000-4000-8000-000000000001";
const secondStudent = "00000000-0000-4000-8000-000000000002";
const classId = "00000000-0000-4000-8000-000000000010";

describe("GET /api/reports/student-records", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCouncilStaff.mockResolvedValue({ user: { id: "actor-id" } });
    mocks.getStudentProfiles.mockResolvedValue([{ student: { id: firstStudent } }]);
  });

  it("resolve a turma no servidor sem enviar a lista de estudantes pela URL", async () => {
    mocks.getCurrentClassStudentIds.mockResolvedValue([firstStudent, secondStudent]);
    const response = await GET(new NextRequest(`http://localhost/api/reports/student-records?class=${classId}`));

    expect(response.status).toBe(200);
    expect(mocks.getCurrentClassStudentIds).toHaveBeenCalledWith(classId);
    expect(mocks.getStudentProfiles).toHaveBeenCalledWith([firstStudent, secondStudent]);
  });

  it("aceita uma seleção específica e remove IDs repetidos", async () => {
    const response = await GET(new NextRequest(`http://localhost/api/reports/student-records?students=${firstStudent},${secondStudent},${firstStudent}`));

    expect(response.status).toBe(200);
    expect(mocks.getCurrentClassStudentIds).not.toHaveBeenCalled();
    expect(mocks.getStudentProfiles).toHaveBeenCalledWith([firstStudent, secondStudent]);
  });

  it("não consulta prontuários quando o acesso é rejeitado", async () => {
    mocks.requireCouncilStaff.mockRejectedValue(new Error("unauthorized"));
    await GET(new NextRequest(`http://localhost/api/reports/student-records?class=${classId}`));

    expect(mocks.getCurrentClassStudentIds).not.toHaveBeenCalled();
    expect(mocks.getStudentProfiles).not.toHaveBeenCalled();
  });
});
