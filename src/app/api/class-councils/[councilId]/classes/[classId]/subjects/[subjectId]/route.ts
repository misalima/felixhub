import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { parseUuid } from "@/lib/class-council/validation";
import { updateSubjectTeacher } from "@/services/server/classCouncilService";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ councilId: string; classId: string; subjectId: string }> }) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { councilId, classId, subjectId } = await params;
    const body = await req.json();
    return NextResponse.json(await updateSubjectTeacher(parseUuid(councilId, "Conselho"), parseUuid(classId, "Turma"), parseUuid(subjectId, "Disciplina"), body.teacherName, user.id));
  } catch (error) {
    return councilApiError(error);
  }
}
