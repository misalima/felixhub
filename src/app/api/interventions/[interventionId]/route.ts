import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { parseUuid } from "@/lib/class-council/validation";
import { updateInterventionById } from "@/services/server/interventionService";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ interventionId: string }> }) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { interventionId } = await params;
    return NextResponse.json(await updateInterventionById(parseUuid(interventionId, "Intervenção"), await req.json(), user.id));
  } catch (error) {
    return councilApiError(error);
  }
}

