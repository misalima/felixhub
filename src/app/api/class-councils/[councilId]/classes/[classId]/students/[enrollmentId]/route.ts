import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { parseUuid } from "@/lib/class-council/validation";
import { updateStudentRecord } from "@/services/server/classCouncilService";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ councilId: string; classId: string; enrollmentId: string }> }) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { councilId, classId, enrollmentId } = await params;
    return NextResponse.json(await updateStudentRecord(parseUuid(councilId, "Conselho"), parseUuid(classId, "Turma"), parseUuid(enrollmentId, "Matrícula no conselho"), await req.json(), user.id));
  } catch (error) {
    return councilApiError(error);
  }
}
