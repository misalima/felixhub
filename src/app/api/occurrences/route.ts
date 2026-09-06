import { NextRequest, NextResponse } from "next/server";
import { councilApiError } from "@/lib/class-council/api";
import { requireCouncilStaff } from "@/lib/class-council/auth";
import { parseUuid } from "@/lib/class-council/validation";
import { STUDENT_OCCURRENCE_CATEGORIES } from "@/lib/students/occurrences";
import { createOccurrence, listOccurrences } from "@/services/server/studentOccurrenceService";
import type { SchoolOccurrenceTargetType, StudentOccurrenceCategory } from "@/types/student-occurrence";

function integer(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

export async function GET(req: NextRequest) {
  const startedAt = performance.now();
  try {
    await requireCouncilStaff(req);
    const authenticatedAt = performance.now();
    const params = req.nextUrl.searchParams;
    const schoolYear = integer(params.get("schoolYear"), new Date().getFullYear());
    const cursor = integer(params.get("cursor"), 0);
    const limit = integer(params.get("limit"), 30);
    const targetValue = params.get("targetType") ?? "all";
    const targetType = targetValue === "all" || targetValue === "student" || targetValue === "collective" || targetValue === "class" ? targetValue as "all" | SchoolOccurrenceTargetType : null;
    const categoryValue = params.get("category");
    const category = categoryValue && STUDENT_OCCURRENCE_CATEGORIES.includes(categoryValue as StudentOccurrenceCategory) ? categoryValue as StudentOccurrenceCategory : undefined;
    if (Number.isNaN(schoolYear) || schoolYear < 2020 || schoolYear > 2100 || Number.isNaN(cursor) || Number.isNaN(limit) || !targetType || (categoryValue && !category)) {
      return NextResponse.json({ error: "Filtros inválidos." }, { status: 400 });
    }
    const classOfficialCode = params.get("classOfficialCode")?.slice(0, 200) || undefined;
    if (classOfficialCode && !/^[\p{L}\p{N}_ -]+$/u.test(classOfficialCode)) return NextResponse.json({ error: "Turma inválida." }, { status: 400 });
    const data = await listOccurrences({
      schoolYear, cursor, limit, targetType, category,
      studentId: params.get("studentId") ? parseUuid(params.get("studentId")!, "Estudante") : undefined,
      classOfficialCode,
    });
    const completedAt = performance.now();
    const response = NextResponse.json(data);
    response.headers.set("Server-Timing", `auth;dur=${(authenticatedAt - startedAt).toFixed(1)}, occurrences;dur=${(completedAt - authenticatedAt).toFixed(1)}, total;dur=${(completedAt - startedAt).toFixed(1)}`);
    return response;
  } catch (error) { return councilApiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireCouncilStaff(req);
    return NextResponse.json(await createOccurrence(await req.json(), user.id), { status: 201 });
  } catch (error) { return councilApiError(error); }
}
