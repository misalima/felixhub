import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { parseUuid } from "@/lib/class-council/validation";
import { archiveCouncil, getCouncilOverview } from "@/services/server/classCouncilService";

export async function GET(req: NextRequest, { params }: { params: Promise<{ councilId: string }> }) {
  try {
    await requireCouncilStaff(req);
    const { councilId } = await params;
    return NextResponse.json(await getCouncilOverview(parseUuid(councilId, "Conselho")));
  } catch (error) {
    return councilApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ councilId: string }> }) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { councilId } = await params;
    return NextResponse.json(await archiveCouncil(parseUuid(councilId, "Conselho"), user.id));
  } catch (error) {
    return councilApiError(error);
  }
}
