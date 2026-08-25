import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { listInterventions } from "@/services/server/interventionService";
import type { InterventionStatus } from "@/types/class-council";
import type { InterventionTargetType } from "@/types/intervention";

const statuses = ["pending", "in_progress", "completed", "cancelled"] satisfies InterventionStatus[];

function optionalInteger(value: string | null) {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

export async function GET(req: NextRequest) {
  const startedAt = performance.now();
  try {
    await requireCouncilStaff(req);
    const authenticatedAt = performance.now();
    const params = req.nextUrl.searchParams;
    const yearValue = params.get("year");
    const year = yearValue === "latest" || !yearValue ? "latest" : optionalInteger(yearValue);
    const cursor = optionalInteger(params.get("cursor"));
    const limit = optionalInteger(params.get("limit"));
    const statusValue = params.get("status") ?? "all";
    const status = statusValue === "open" || statusValue === "all" || statuses.includes(statusValue as InterventionStatus) ? statusValue as "open" | "all" | InterventionStatus : null;
    const targetValue = params.get("targetType") ?? "all";
    const targetType = targetValue === "all" || targetValue === "student" || targetValue === "class" ? targetValue as "all" | InterventionTargetType : null;
    if (Number.isNaN(year) || Number.isNaN(cursor) || Number.isNaN(limit) || !status || !targetType) return NextResponse.json({ error: "Filtros inválidos." }, { status: 400 });
    const data = await listInterventions({
      year: year as number | "latest",
      status,
      classKeys: params.getAll("class"),
      targetType,
      responsible: params.get("responsible") ?? "all",
      overdueOnly: params.get("overdue") === "1",
      search: params.get("q")?.slice(0, 160),
      cursor,
      limit,
      all: params.get("all") === "1",
      metadataOnly: params.get("metadata") === "1",
    });
    const completedAt = performance.now();
    const response = NextResponse.json(data);
    response.headers.set("Server-Timing", `auth;dur=${(authenticatedAt - startedAt).toFixed(1)}, interventions;dur=${(completedAt - authenticatedAt).toFixed(1)}, total;dur=${(completedAt - startedAt).toFixed(1)}`);
    return response;
  } catch (error) {
    return councilApiError(error);
  }
}
