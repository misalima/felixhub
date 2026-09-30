import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireStaff } from "@/lib/auth/requireStaff";
import { parseUuid } from "@/lib/class-council/validation";
import { updateStudentSituation } from "@/services/server/studentSituationService";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { user } = await requireStaff(req);
    const { studentId } = await params;
    return NextResponse.json(await updateStudentSituation(parseUuid(studentId, "Estudante"), await req.json(), user.id));
  } catch (error) {
    return councilApiError(error);
  }
}
