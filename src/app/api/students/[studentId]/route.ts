import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireStaff } from "@/lib/auth/requireStaff";
import { parseUuid } from "@/lib/class-council/validation";
import { getStudentProfile } from "@/services/server/studentProfileService";

export async function GET(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    await requireStaff(req);
    const { studentId } = await params;
    return NextResponse.json(await getStudentProfile(parseUuid(studentId, "Estudante")));
  } catch (error) {
    return councilApiError(error);
  }
}
