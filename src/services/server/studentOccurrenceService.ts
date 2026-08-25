import { collectSupabasePages } from "@/lib/class-council/pagination";
import { CouncilDomainError } from "@/lib/class-council/validation";
import { parseStudentOccurrenceInput } from "@/lib/students/occurrenceValidation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { StudentOccurrence, StudentOccurrenceCategory, StudentOccurrenceSummary } from "@/types/student-occurrence";

function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listStudentOccurrences(studentId: string): Promise<StudentOccurrence[]> {
  const { data, error } = await supabaseAdmin
    .from("student_occurrences")
    .select("id, student_id, occurred_on, category, notes, guardian_notified, created_at, created_by")
    .eq("student_id", studentId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  assertNoError(error);
  const creatorIds = [...new Set((data ?? []).map((item) => item.created_by))];
  const creatorNames = new Map<string, string | null>();
  if (creatorIds.length) {
    const { data: profiles, error: profileError } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", creatorIds);
    assertNoError(profileError);
    for (const profile of profiles ?? []) creatorNames.set(profile.id, profile.full_name);
  }
  return (data ?? []).map((item) => ({
    id: item.id,
    studentId: item.student_id,
    occurredOn: item.occurred_on,
    category: item.category as StudentOccurrenceCategory,
    notes: item.notes,
    guardianNotified: item.guardian_notified,
    createdAt: item.created_at,
    createdByName: creatorNames.get(item.created_by) ?? null,
  }));
}

export async function listStudentOccurrencesForStudents(studentIds: string[]): Promise<Map<string, StudentOccurrence[]>> {
  const uniqueIds = [...new Set(studentIds)];
  const grouped = new Map<string, StudentOccurrence[]>(uniqueIds.map((studentId) => [studentId, []]));
  if (!uniqueIds.length) return grouped;
  const { data, error } = await supabaseAdmin
    .from("student_occurrences")
    .select("id, student_id, occurred_on, category, notes, guardian_notified, created_at, created_by")
    .in("student_id", uniqueIds)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  assertNoError(error);
  const creatorIds = [...new Set((data ?? []).map((item) => item.created_by))];
  const creatorNames = new Map<string, string | null>();
  if (creatorIds.length) {
    const { data: profiles, error: profileError } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", creatorIds);
    assertNoError(profileError);
    for (const profile of profiles ?? []) creatorNames.set(profile.id, profile.full_name);
  }
  for (const item of data ?? []) {
    const occurrences = grouped.get(item.student_id) ?? [];
    occurrences.push({ id: item.id, studentId: item.student_id, occurredOn: item.occurred_on, category: item.category as StudentOccurrenceCategory, notes: item.notes, guardianNotified: item.guardian_notified, createdAt: item.created_at, createdByName: creatorNames.get(item.created_by) ?? null });
    grouped.set(item.student_id, occurrences);
  }
  return grouped;
}

export async function createStudentOccurrence(studentId: string, input: unknown, actorId: string): Promise<StudentOccurrence> {
  const parsed = parseStudentOccurrenceInput(input);

  const { data: student, error: studentError } = await supabaseAdmin.from("students").select("id").eq("id", studentId).maybeSingle();
  assertNoError(studentError);
  if (!student) throw new CouncilDomainError("Estudante não encontrado.", 404, "not_found");

  const { data, error } = await supabaseAdmin.from("student_occurrences").insert({
    student_id: studentId,
    occurred_on: parsed.occurredOn,
    category: parsed.category,
    notes: parsed.notes,
    guardian_notified: parsed.guardianNotified,
    created_by: actorId,
    updated_by: actorId,
  }).select("id, student_id, occurred_on, category, notes, guardian_notified, created_at").single();
  assertNoError(error);
  if (!data) throw new Error("A ocorrência não foi retornada após o cadastro.");
  return {
    id: data.id,
    studentId: data.student_id,
    occurredOn: data.occurred_on,
    category: data.category as StudentOccurrenceCategory,
    notes: data.notes,
    guardianNotified: data.guardian_notified,
    createdAt: data.created_at,
    createdByName: null,
  };
}

export async function listStudentOccurrenceSummaries(studentIds?: string[]): Promise<Map<string, StudentOccurrenceSummary>> {
  const uniqueStudentIds = studentIds ? [...new Set(studentIds)] : null;
  if (uniqueStudentIds?.length === 0) return new Map();

  const studentBatches = uniqueStudentIds
    ? Array.from({ length: Math.ceil(uniqueStudentIds.length / 100) }, (_, index) => uniqueStudentIds.slice(index * 100, (index + 1) * 100))
    : [null];
  const pages = await Promise.all(studentBatches.map((studentBatch) => collectSupabasePages(async (from, to) => {
    let query = supabaseAdmin
      .from("student_occurrences")
      .select("id, student_id, occurred_on, category, created_at")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id");
    if (studentBatch) query = query.in("student_id", studentBatch);
    const { data, error } = await query.range(from, to);
    assertNoError(error);
    return data ?? [];
  })));
  const rows = pages.flat();
  const summaries = new Map<string, StudentOccurrenceSummary>();
  for (const row of rows) {
    const current = summaries.get(row.student_id) ?? { count: 0, latest: null };
    current.count += 1;
    if (!current.latest) current.latest = { occurredOn: row.occurred_on, category: row.category as StudentOccurrenceCategory };
    summaries.set(row.student_id, current);
  }
  return summaries;
}
