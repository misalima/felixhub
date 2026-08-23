import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { classCouncilPdfFileName, generateClassCouncilPdf } from "@/lib/class-council/generateClassCouncilPdf";
import { CouncilDomainError, parseUuid } from "@/lib/class-council/validation";
import { getClassWorkspace } from "@/services/server/classCouncilService";

export const runtime = "nodejs";

function contentDisposition(fileName: string) {
  const asciiName = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/º/g, "o")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/["\\]/g, "-");
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ councilId: string; classId: string }> }) {
  try {
    await requireCouncilStaff(req);
    const { councilId, classId } = await params;
    const data = await getClassWorkspace(parseUuid(councilId, "Conselho"), parseUuid(classId, "Turma"));
    if (data.council.status !== "completed") {
      throw new CouncilDomainError("Conclua o conselho antes de baixar os PDFs das turmas.", 409, "council_not_completed");
    }
    const pdf = await generateClassCouncilPdf(data);
    const fileName = classCouncilPdfFileName(data);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": contentDisposition(fileName),
        "Content-Length": String(pdf.length),
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return councilApiError(error);
  }
}
