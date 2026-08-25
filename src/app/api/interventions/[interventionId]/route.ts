import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { parseUuid } from "@/lib/class-council/validation";
import { updateInterventionById } from "@/services/server/interventionService";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ interventionId: string }> }) {
  const startedAt = performance.now();
  try {
    const { user } = await requireCouncilStaff(req);
    const authenticatedAt = performance.now();
    const { interventionId } = await params;
    const data = await updateInterventionById(parseUuid(interventionId, "Intervenção"), await req.json(), user.id);
    const completedAt = performance.now();
    const response = NextResponse.json(data);
    response.headers.set("Server-Timing", `auth;dur=${(authenticatedAt - startedAt).toFixed(1)}, update;dur=${(completedAt - authenticatedAt).toFixed(1)}, total;dur=${(completedAt - startedAt).toFixed(1)}`);
    return response;
  } catch (error) {
    return councilApiError(error);
  }
}
