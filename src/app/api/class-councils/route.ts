import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { createCouncil, listCouncils } from "@/services/server/classCouncilService";

export async function GET(req: NextRequest) {
  try {
    await requireCouncilStaff(req);
    return NextResponse.json(await listCouncils());
  } catch (error) {
    return councilApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireCouncilStaff(req);
    const body = await req.json();
    return NextResponse.json(await createCouncil({ schoolYear: body.schoolYear, term: body.term, meetingDate: body.meetingDate }, user.id), { status: 201 });
  } catch (error) {
    return councilApiError(error);
  }
}
