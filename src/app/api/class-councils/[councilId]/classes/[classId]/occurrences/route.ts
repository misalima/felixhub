import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { parseUuid } from "@/lib/class-council/validation";
import { listClassCouncilOccurrences } from "@/services/server/studentOccurrenceService";

export async function GET(req: NextRequest, { params }: { params: Promise<{ councilId: string; classId: string }> }) {
  try {
    await requireCouncilStaff(req);
    const { councilId, classId } = await params;
    return NextResponse.json(await listClassCouncilOccurrences(parseUuid(councilId, "Conselho"), parseUuid(classId, "Turma")));
  } catch (error) { return councilApiError(error); }
}
