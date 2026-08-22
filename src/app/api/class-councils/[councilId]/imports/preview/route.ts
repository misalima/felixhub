import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { CouncilDomainError, parseUuid } from "@/lib/class-council/validation";
import { createImportPreview, getPendingImportPreview } from "@/services/server/classCouncilImportService";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ councilId: string }> }) {
  try {
    await requireCouncilStaff(req);
    const { councilId } = await params;
    return NextResponse.json({ preview: await getPendingImportPreview(parseUuid(councilId, "Conselho")) });
  } catch (error) {
    return councilApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ councilId: string }> }) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { councilId } = await params;
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new CouncilDomainError("Selecione um arquivo .xlsx.");
    return NextResponse.json(await createImportPreview(parseUuid(councilId, "Conselho"), file, user.id), { status: 201 });
  } catch (error) {
    return councilApiError(error);
  }
}
