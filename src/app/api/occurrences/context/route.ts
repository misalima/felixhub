import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { getOccurrenceContext } from "@/services/server/studentOccurrenceService";

export async function GET(req: NextRequest) {
  try {
    await requireCouncilStaff(req);
    const rawYear = req.nextUrl.searchParams.get("schoolYear");
    const schoolYear = rawYear ? Number(rawYear) : undefined;
    if (schoolYear !== undefined && (!Number.isInteger(schoolYear) || schoolYear < 2020 || schoolYear > 2100)) return NextResponse.json({ error: "Ano letivo inválido." }, { status: 400 });
    const response = NextResponse.json(await getOccurrenceContext(schoolYear));
    response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=300");
    return response;
  } catch (error) { return councilApiError(error); }
}
