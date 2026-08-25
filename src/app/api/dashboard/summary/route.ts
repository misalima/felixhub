import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { getPedagogicalDashboardOverview } from "@/services/server/dashboardService";

function optionalInteger(value: string | null, allowed?: number[]) {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || (allowed && !allowed.includes(parsed))) return Number.NaN;
  return parsed;
}

export async function GET(req: NextRequest) {
  const startedAt = performance.now();
  try {
    await requireCouncilStaff(req);
    const authenticatedAt = performance.now();
    const year = optionalInteger(req.nextUrl.searchParams.get("year"));
    const term = optionalInteger(req.nextUrl.searchParams.get("term"), [1, 2, 3, 4]);
    if (Number.isNaN(year) || Number.isNaN(term)) return NextResponse.json({ error: "Filtros inválidos." }, { status: 400 });
    const data = await getPedagogicalDashboardOverview({ year, term });
    const completedAt = performance.now();
    const response = NextResponse.json(data);
    response.headers.set("Server-Timing", `auth;dur=${(authenticatedAt - startedAt).toFixed(1)}, dashboard;dur=${(completedAt - authenticatedAt).toFixed(1)}, total;dur=${(completedAt - startedAt).toFixed(1)}`);
    return response;
  } catch (error) {
    return councilApiError(error);
  }
}
