import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCouncilStaff: vi.fn(),
  getClassWorkspace: vi.fn(),
  generateClassCouncilPdf: vi.fn(),
  classCouncilPdfFileName: vi.fn(),
}));

vi.mock("@/lib/class-council/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/class-council/auth")>()),
  requireCouncilStaff: mocks.requireCouncilStaff,
}));
vi.mock("@/services/server/classCouncilService", () => ({ getClassWorkspace: mocks.getClassWorkspace }));
vi.mock("@/lib/class-council/generateClassCouncilPdf", () => ({
  generateClassCouncilPdf: mocks.generateClassCouncilPdf,
  classCouncilPdfFileName: mocks.classCouncilPdfFileName,
}));

import { GET } from "./route";

describe("GET /api/class-councils/:councilId/classes/:classId/pdf", () => {
  const councilId = "00000000-0000-4000-8000-000000000001";
  const classId = "00000000-0000-4000-8000-000000000002";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCouncilStaff.mockResolvedValue({ user: { id: "actor-id" } });
    mocks.getClassWorkspace.mockResolvedValue({ council: { status: "completed" }, class: { display_name: "1MA" } });
    mocks.generateClassCouncilPdf.mockResolvedValue(Buffer.from("%PDF-1.7\nPDF de teste"));
    mocks.classCouncilPdfFileName.mockReturnValue("Conselho de Classe - 2º Bimestre 2026 - Turma 1MA.pdf");
  });

  it("autoriza antes de carregar dados e devolve um PDF para download", async () => {
    const response = await GET(new NextRequest(`http://localhost/api/class-councils/${councilId}/classes/${classId}/pdf`), { params: Promise.resolve({ councilId, classId }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("content-disposition")).toContain("Turma%201MA.pdf");
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 4).toString()).toBe("%PDF");
    expect(mocks.getClassWorkspace).toHaveBeenCalledWith(councilId, classId);
    expect(mocks.requireCouncilStaff.mock.invocationCallOrder[0]).toBeLessThan(mocks.getClassWorkspace.mock.invocationCallOrder[0]);
  });

  it("não consulta nem gera o PDF quando o guard rejeita a sessão", async () => {
    mocks.requireCouncilStaff.mockRejectedValue(new Error("unauthorized"));
    await GET(new NextRequest(`http://localhost/api/class-councils/${councilId}/classes/${classId}/pdf`), { params: Promise.resolve({ councilId, classId }) });
    expect(mocks.getClassWorkspace).not.toHaveBeenCalled();
    expect(mocks.generateClassCouncilPdf).not.toHaveBeenCalled();
  });

  it("não gera PDF enquanto o conselho não estiver concluído", async () => {
    mocks.getClassWorkspace.mockResolvedValue({ council: { status: "in_progress" }, class: { display_name: "1MA" } });
    const response = await GET(new NextRequest(`http://localhost/api/class-councils/${councilId}/classes/${classId}/pdf`), { params: Promise.resolve({ councilId, classId }) });
    expect(response.status).toBe(409);
    expect(mocks.generateClassCouncilPdf).not.toHaveBeenCalled();
  });
});
