import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { parseUuid } from "@/lib/class-council/validation";
import { updateIntervention } from "@/services/server/classCouncilService";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ councilId: string; interventionId: string }> }) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { councilId, interventionId } = await params;
    return NextResponse.json(await updateIntervention(parseUuid(councilId, "Conselho"), parseUuid(interventionId, "Intervenção"), await req.json(), user.id));
  } catch (error) {
    return councilApiError(error);
  }
}
