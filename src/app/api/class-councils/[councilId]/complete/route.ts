import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { parseUuid } from "@/lib/class-council/validation";
import { completeCouncil } from "@/services/server/classCouncilService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ councilId: string }> }) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { councilId } = await params;
    return NextResponse.json(await completeCouncil(parseUuid(councilId, "Conselho"), user.id));
  } catch (error) {
    return councilApiError(error);
  }
}
