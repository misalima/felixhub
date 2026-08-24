import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { getPedagogicalDashboard } from "@/services/server/dashboardService";

function optionalInteger(value: string | null, allowed?: number[]) {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || (allowed && !allowed.includes(parsed))) return Number.NaN;
  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    await requireCouncilStaff(req);
    const year = optionalInteger(req.nextUrl.searchParams.get("year"));
    const term = optionalInteger(req.nextUrl.searchParams.get("term"), [1, 2, 3, 4]);
    if (Number.isNaN(year) || Number.isNaN(term)) return NextResponse.json({ error: "Filtros inválidos." }, { status: 400 });
    return NextResponse.json(await getPedagogicalDashboard({ year, term }));
  } catch (error) {
    return councilApiError(error);
  }
}
