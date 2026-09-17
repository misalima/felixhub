import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireStaff } from "@/lib/auth/requireStaff";
import { parseUuid } from "@/lib/class-council/validation";
import { createStudentOccurrence } from "@/services/server/studentOccurrenceService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { user } = await requireStaff(req);
    const { studentId } = await params;
    return NextResponse.json(await createStudentOccurrence(parseUuid(studentId, "Estudante"), await req.json(), user.id), { status: 201 });
  } catch (error) {
    return councilApiError(error);
  }
}
