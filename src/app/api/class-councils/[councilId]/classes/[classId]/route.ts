import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { parseUuid } from "@/lib/class-council/validation";
import { getClassWorkspace, updateClassNotes } from "@/services/server/classCouncilService";

type RouteParams = { params: Promise<{ councilId: string; classId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireCouncilStaff(req);
    const { councilId, classId } = await params;
    return NextResponse.json(await getClassWorkspace(parseUuid(councilId, "Conselho"), parseUuid(classId, "Turma")));
  } catch (error) {
    return councilApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { councilId, classId } = await params;
    return NextResponse.json(await updateClassNotes(parseUuid(councilId, "Conselho"), parseUuid(classId, "Turma"), await req.json(), user.id));
  } catch (error) {
    return councilApiError(error);
  }
}
