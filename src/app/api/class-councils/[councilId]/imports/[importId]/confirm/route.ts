import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { parseUuid } from "@/lib/class-council/validation";
import { confirmImport } from "@/services/server/classCouncilImportService";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ councilId: string; importId: string }> }) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { councilId, importId } = await params;
    const body = await req.json().catch(() => ({}));
    const displayNames = body.displayNames && typeof body.displayNames === "object" ? body.displayNames as Record<string, string> : {};
    return NextResponse.json(await confirmImport(parseUuid(councilId, "Conselho"), parseUuid(importId, "Importação"), user.id, displayNames));
  } catch (error) {
    return councilApiError(error);
  }
}
