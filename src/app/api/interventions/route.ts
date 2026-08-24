import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { listInterventions } from "@/services/server/interventionService";

export async function GET(req: NextRequest) {
  try {
    await requireCouncilStaff(req);
    return NextResponse.json(await listInterventions());
  } catch (error) {
    return councilApiError(error);
  }
}

