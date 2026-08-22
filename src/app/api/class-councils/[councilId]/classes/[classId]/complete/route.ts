import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { parseUuid } from "@/lib/class-council/validation";
import { completeClass } from "@/services/server/classCouncilService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ councilId: string; classId: string }> }) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { councilId, classId } = await params;
    return NextResponse.json(await completeClass(parseUuid(councilId, "Conselho"), parseUuid(classId, "Turma"), user.id));
  } catch (error) {
    return councilApiError(error);
  }
}
