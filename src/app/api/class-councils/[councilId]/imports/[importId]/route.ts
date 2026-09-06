import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { parseUuid } from "@/lib/class-council/validation";
import { deleteImportVersion } from "@/services/server/classCouncilImportService";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ councilId: string; importId: string }> }) {
  try {
    await requireCouncilStaff(req);
    const { councilId, importId } = await params;
    return NextResponse.json(await deleteImportVersion(
      parseUuid(councilId, "Conselho"),
      parseUuid(importId, "Importação"),
    ));
  } catch (error) {
    return councilApiError(error);
  }
}
