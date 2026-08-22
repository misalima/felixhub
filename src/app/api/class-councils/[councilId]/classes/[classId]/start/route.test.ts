import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCouncilStaff: vi.fn(),
  startClassWithTeachers: vi.fn(),
}));

vi.mock("@/lib/class-council/auth", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/class-council/auth")>(),
  requireCouncilStaff: mocks.requireCouncilStaff,
}));
vi.mock("@/services/server/classCouncilService", () => ({ startClassWithTeachers: mocks.startClassWithTeachers }));

import { POST } from "./route";

const councilId = "00000000-0000-4000-8000-000000000001";
const classId = "00000000-0000-4000-8000-000000000002";
const subjectId = "00000000-0000-4000-8000-000000000003";

describe("POST /api/class-councils/:councilId/classes/:classId/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCouncilStaff.mockResolvedValue({ user: { id: "actor-id" } });
    mocks.startClassWithTeachers.mockResolvedValue({ started: true, teacherCount: 1 });
  });

  it("autoriza antes do serviço e envia apenas disciplina validada", async () => {
    const request = new NextRequest(`http://localhost/api/class-councils/${councilId}/classes/${classId}/start`, { method: "POST", body: JSON.stringify({ teachers: [{ name: "Professora A", subjectId }] }) });
    const response = await POST(request, { params: Promise.resolve({ councilId, classId }) });

    expect(response.status).toBe(200);
    expect(mocks.startClassWithTeachers).toHaveBeenCalledWith(councilId, classId, [{ name: "Professora A", subjectId }], "actor-id");
    expect(mocks.requireCouncilStaff.mock.invocationCallOrder[0]).toBeLessThan(mocks.startClassWithTeachers.mock.invocationCallOrder[0]);
  });

  it("rejeita identificador de disciplina inválido sem chamar o serviço", async () => {
    const request = new NextRequest(`http://localhost/api/class-councils/${councilId}/classes/${classId}/start`, { method: "POST", body: JSON.stringify({ teachers: [{ name: "Professora A", subjectId: "qualquer" }] }) });
    const response = await POST(request, { params: Promise.resolve({ councilId, classId }) });

    expect(response.status).toBe(400);
    expect(mocks.startClassWithTeachers).not.toHaveBeenCalled();
  });
});
