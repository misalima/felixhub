import { NextRequest, NextResponse } from "next/server";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { councilApiError } from "@/lib/class-council/api";
import { CouncilDomainError, parseUuid } from "@/lib/class-council/validation";
import { startClassWithTeachers } from "@/services/server/classCouncilService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ councilId: string; classId: string }> }) {
  try {
    const { user } = await requireCouncilStaff(req);
    const { councilId, classId } = await params;
    const body = await req.json();
    if (!Array.isArray(body.teachers)) throw new CouncilDomainError("Lista de professores inválida.");
    const teachers = body.teachers.map((teacher: unknown) => {
      if (!teacher || typeof teacher !== "object") throw new CouncilDomainError("Professor inválido.");
      const input = teacher as Record<string, unknown>;
      return { name: input.name, subjectId: parseUuid(String(input.subjectId ?? ""), "Disciplina") };
    });
    return NextResponse.json(await startClassWithTeachers(parseUuid(councilId, "Conselho"), parseUuid(classId, "Turma"), teachers, user.id));
  } catch (error) {
    return councilApiError(error);
  }
}
