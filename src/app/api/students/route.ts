import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireStaff } from "@/lib/auth/requireStaff";
import { getStudentDirectory } from "@/services/server/studentDirectoryService";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);
    return NextResponse.json(await getStudentDirectory());
  } catch (error) {
    return councilApiError(error);
  }
}
