import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { parseUuid } from "@/lib/class-council/validation";
import { getStudentProfile } from "@/services/server/studentProfileService";

export async function GET(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    await requireCouncilStaff(req);
    const { studentId } = await params;
    return NextResponse.json(await getStudentProfile(parseUuid(studentId, "Estudante")));
  } catch (error) {
    return councilApiError(error);
  }
}
