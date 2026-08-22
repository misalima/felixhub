import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { CouncilDomainError, parseUuid } from "@/lib/class-council/validation";
import { replaceParticipants } from "@/services/server/classCouncilService";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ councilId: string; classId: string }> }) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { councilId, classId } = await params;
    const body = await req.json();
    if (!Array.isArray(body.participants)) throw new CouncilDomainError("Lista de participantes inválida.");
    return NextResponse.json(await replaceParticipants(parseUuid(councilId, "Conselho"), parseUuid(classId, "Turma"), body.participants, user.id));
  } catch (error) {
    return councilApiError(error);
  }
}
