import { NextRequest } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { parseUuid } from "@/lib/class-council/validation";
import { downloadImportFile } from "@/services/server/classCouncilImportService";

export async function GET(req: NextRequest, { params }: { params: Promise<{ councilId: string; importId: string }> }) {
  try {
    await requireCouncilStaff(req);
    const { councilId, importId } = await params;
    const file = await downloadImportFile(parseUuid(councilId, "Conselho"), parseUuid(importId, "Importação"));
    const safeName = file.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\\r\n]/g, "_");
    return new Response(file.buffer, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return councilApiError(error);
  }
}
