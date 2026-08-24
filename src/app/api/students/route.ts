import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { getStudentDirectory } from "@/services/server/studentDirectoryService";

export async function GET(req: NextRequest) {
  try {
    await requireCouncilStaff(req);
    return NextResponse.json(await getStudentDirectory());
  } catch (error) {
    return councilApiError(error);
  }
}
