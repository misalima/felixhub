import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { parseUuid } from "@/lib/class-council/validation";
import { updateStudentSituation } from "@/services/server/studentSituationService";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { studentId } = await params;
    return NextResponse.json(await updateStudentSituation(parseUuid(studentId, "Estudante"), await req.json(), user.id));
  } catch (error) {
    return councilApiError(error);
  }
}
