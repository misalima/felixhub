import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { parseUuid } from "@/lib/class-council/validation";
import { getPedagogicalDashboardStudents } from "@/services/server/dashboardService";
import type { DashboardStudentFilter } from "@/types/dashboard";

const metrics: DashboardStudentFilter[] = ["students", "flow", "monitoring", "retentionRisk", "completionRisk", "lowAttendance", "infrequent", "dropout", "missingGrades", "pendingInterventions"];

function optionalInteger(value: string | null, allowed?: number[]) {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || (allowed && !allowed.includes(parsed))) return Number.NaN;
  return parsed;
}

export async function GET(req: NextRequest) {
  const startedAt = performance.now();
  try {
    await requireCouncilStaff(req);
    const authenticatedAt = performance.now();
    const params = req.nextUrl.searchParams;
    const year = optionalInteger(params.get("year"));
    const term = optionalInteger(params.get("term"), [1, 2, 3, 4]);
    const gradeLevel = optionalInteger(params.get("gradeLevel"), [1, 2, 3]);
    const cursor = optionalInteger(params.get("cursor"));
    const limit = optionalInteger(params.get("limit"));
    const metricValue = params.get("metric");
    const metric = metricValue && metrics.includes(metricValue as DashboardStudentFilter) ? metricValue as DashboardStudentFilter : undefined;
    if ([year, term, gradeLevel, cursor, limit].some(Number.isNaN) || (metricValue && !metric)) return NextResponse.json({ error: "Filtros inválidos." }, { status: 400 });
    const subjectIds = params.getAll("subjectId").map((id) => parseUuid(id, "Disciplina"));
    const data = await getPedagogicalDashboardStudents(
      { year, term },
      { metric, gradeLevel: gradeLevel as 1 | 2 | 3 | undefined, subjectIds, search: params.get("q")?.slice(0, 120), cursor, limit },
    );
    const completedAt = performance.now();
    const response = NextResponse.json(data);
    response.headers.set("Server-Timing", `auth;dur=${(authenticatedAt - startedAt).toFixed(1)}, students;dur=${(completedAt - authenticatedAt).toFixed(1)}, total;dur=${(completedAt - startedAt).toFixed(1)}`);
    return response;
  } catch (error) {
    return councilApiError(error);
  }
}
