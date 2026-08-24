import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { CouncilDomainError, parseUuid } from "@/lib/class-council/validation";
import { getCurrentClassStudentIds, getStudentProfiles } from "@/services/server/studentProfileService";

export async function GET(req: NextRequest) {
  try {
    await requireCouncilStaff(req);
    const classId = req.nextUrl.searchParams.get("class");
    const studentParam = req.nextUrl.searchParams.get("students");
    if (!classId && !studentParam) throw new CouncilDomainError("Selecione ao menos um estudante ou uma turma.");
    const studentIds = classId
      ? await getCurrentClassStudentIds(parseUuid(classId, "Turma"))
      : [...new Set((studentParam ?? "").split(",").filter(Boolean).map((studentId) => parseUuid(studentId, "Estudante")))];
    if (!studentIds.length) throw new CouncilDomainError("Nenhum estudante ativo foi encontrado para este relatório.", 404, "not_found");
    return NextResponse.json({ profiles: await getStudentProfiles(studentIds) });
  } catch (error) {
    return councilApiError(error);
  }
}
