import { filterActiveEnrollments } from "@/lib/class-council/activeImport";
import { collectSupabasePages } from "@/lib/class-council/pagination";
import { CouncilDomainError } from "@/lib/class-council/validation";
import { parseSchoolOccurrenceInput, parseStudentOccurrenceInput } from "@/lib/students/occurrenceValidation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ClassCouncilOccurrences, OccurrenceContext, OccurrenceListData, SchoolOccurrenceTargetType, StudentOccurrence, StudentOccurrenceCategory, StudentOccurrenceSummary } from "@/types/student-occurrence";

type StudentRelation = { canonical_name: string; enrollment_number: string };
type ParticipantRow = {
  student_id: string; class_official_code: string | null; class_name: string | null;
  students?: StudentRelation | StudentRelation[] | null;
};
type OccurrenceRow = {
  id: string; target_type: string; student_id: string | null; school_year: number;
  class_official_code: string | null; class_name: string | null; occurred_on: string;
  category: string; notes: string | null; guardian_notified: boolean;
  created_at: string; created_by: string; students?: StudentRelation | StudentRelation[] | null;
  school_occurrence_students?: ParticipantRow[] | null;
};

export type ListOccurrencesOptions = {
  schoolYear: number;
  targetType?: "all" | SchoolOccurrenceTargetType;
  studentId?: string;
  classOfficialCode?: string;
  category?: StudentOccurrenceCategory;
  cursor?: number;
  limit?: number;
};

const OCCURRENCE_SELECT = "id, target_type, student_id, school_year, class_official_code, class_name, occurred_on, category, notes, guardian_notified, created_at, created_by, students!student_occurrences_student_id_fkey(canonical_name, enrollment_number), school_occurrence_students(student_id, class_official_code, class_name, students!school_occurrence_students_student_id_fkey(canonical_name, enrollment_number))";

function assertNoError(error: { message: string } | null) { if (error) throw new Error(error.message); }
function relation<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }

async function mapOccurrenceRows(rows: OccurrenceRow[]): Promise<StudentOccurrence[]> {
  const creatorIds = [...new Set(rows.map((item) => item.created_by))];
  const creatorNames = new Map<string, string | null>();
  if (creatorIds.length) {
    const { data, error } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", creatorIds);
    assertNoError(error);
    for (const profile of data ?? []) creatorNames.set(profile.id, profile.full_name);
  }
  return rows.map((item) => {
    const student = relation(item.students);
    return {
      id: item.id, targetType: item.target_type as SchoolOccurrenceTargetType, studentId: item.student_id,
      studentName: student?.canonical_name ?? null, enrollmentNumber: student?.enrollment_number ?? null,
      schoolYear: item.school_year, classOfficialCode: item.class_official_code, className: item.class_name,
      occurredOn: item.occurred_on, category: item.category as StudentOccurrenceCategory, notes: item.notes,
      guardianNotified: item.guardian_notified, createdAt: item.created_at,
      createdByName: creatorNames.get(item.created_by) ?? null,
      participants: (item.school_occurrence_students ?? []).map((participant) => {
        const participantStudent = relation(participant.students);
        return {
          studentId: participant.student_id,
          name: participantStudent?.canonical_name ?? "Estudante",
          enrollmentNumber: participantStudent?.enrollment_number ?? "",
          classOfficialCode: participant.class_official_code,
          className: participant.class_name,
        };
      }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    };
  });
}

async function latestCouncilForYear(schoolYear?: number) {
  let query = supabaseAdmin.from("class_councils").select("id, school_year, term, current_import_id")
    .not("current_import_id", "is", null).is("archived_at", null)
    .order("school_year", { ascending: false }).order("term", { ascending: false });
  if (schoolYear) query = query.eq("school_year", schoolYear);
  const { data, error } = await query.limit(1).maybeSingle();
  assertNoError(error);
  return data;
}

export async function getOccurrenceContext(requestedYear?: number): Promise<OccurrenceContext> {
  const [council, yearsResponse, occurrenceYearsResponse] = await Promise.all([
    latestCouncilForYear(requestedYear),
    supabaseAdmin.from("class_councils").select("school_year").not("current_import_id", "is", null).is("archived_at", null).order("school_year", { ascending: false }),
    supabaseAdmin.rpc("list_school_occurrence_years"),
  ]);
  assertNoError(yearsResponse.error);
  assertNoError(occurrenceYearsResponse.error);
  const availableYears = [...new Set([...(yearsResponse.data ?? []).map((item) => item.school_year), ...(occurrenceYearsResponse.data ?? []).map((item) => item.school_year)])].sort((a, b) => b - a);
  const schoolYear = requestedYear ?? council?.school_year ?? new Date().getFullYear();
  if (!council?.current_import_id) return { availableYears, schoolYear, source: null, classes: [] };

  const [classesResponse, snapshots] = await Promise.all([
    supabaseAdmin.from("class_council_classes").select("id, official_code, display_name").eq("council_id", council.id).order("display_name"),
    collectSupabasePages(async (from, to) => {
      const { data, error } = await supabaseAdmin.from("class_council_student_snapshots").select("enrollment_id").eq("import_id", council.current_import_id!).order("id").range(from, to);
      assertNoError(error); return data ?? [];
    }),
  ]);
  assertNoError(classesResponse.error);
  const classRows = classesResponse.data ?? [];
  const classIds = classRows.map((item) => item.id);
  if (!classIds.length || !snapshots.length) return { availableYears, schoolYear, source: { councilId: council.id, term: council.term }, classes: [] };

  const enrollmentIds = snapshots.map((item) => item.enrollment_id);
  const batches = Array.from({ length: Math.ceil(enrollmentIds.length / 100) }, (_, index) => enrollmentIds.slice(index * 100, (index + 1) * 100));
  const enrollmentPages = await Promise.all(batches.map(async (ids) => {
    const { data, error } = await supabaseAdmin.from("class_council_enrollments")
      .select("id, council_class_id, student_id, students(canonical_name, enrollment_number)").in("id", ids).in("council_class_id", classIds);
    assertNoError(error); return data ?? [];
  }));
  const studentsByClass = new Map<string, OccurrenceContext["classes"][number]["students"]>();
  for (const enrollment of enrollmentPages.flat()) {
    const student = relation(enrollment.students);
    if (!student) continue;
    const values = studentsByClass.get(enrollment.council_class_id) ?? [];
    values.push({ id: enrollment.student_id, name: student.canonical_name, enrollmentNumber: student.enrollment_number });
    studentsByClass.set(enrollment.council_class_id, values);
  }
  return {
    availableYears, schoolYear, source: { councilId: council.id, term: council.term },
    classes: classRows.filter((item) => studentsByClass.has(item.id)).map((item) => ({
      officialCode: item.official_code, name: item.display_name,
      students: (studentsByClass.get(item.id) ?? []).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    })),
  };
}

export async function listOccurrences(options: ListOccurrencesOptions): Promise<OccurrenceListData> {
  const cursor = Math.max(0, options.cursor ?? 0);
  const limit = Math.min(100, Math.max(1, options.limit ?? 30));
  let collectiveClassIds: string[] = [];
  if (options.classOfficialCode) {
    if (!/^[\p{L}\p{N}_ -]+$/u.test(options.classOfficialCode)) throw new CouncilDomainError("Turma inválida.");
    const rows = await collectSupabasePages(async (from, to) => {
      const { data, error } = await supabaseAdmin.from("school_occurrence_students").select("occurrence_id, school_occurrences!inner(school_year)")
        .eq("class_official_code", options.classOfficialCode!).eq("school_occurrences.school_year", options.schoolYear).order("occurrence_id").range(from, to);
      assertNoError(error); return data ?? [];
    });
    collectiveClassIds = [...new Set(rows.map((item) => item.occurrence_id))];
  }
  let query = supabaseAdmin.from("school_occurrences").select(OCCURRENCE_SELECT, { count: "exact" })
    .eq("school_year", options.schoolYear).order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false }).order("id").range(cursor, cursor + limit - 1);
  if (options.targetType && options.targetType !== "all") query = query.eq("target_type", options.targetType);
  if (options.studentId) query = query.eq("student_id", options.studentId);
  if (options.classOfficialCode) query = collectiveClassIds.length
    ? query.or(`class_official_code.eq.${options.classOfficialCode},id.in.(${collectiveClassIds.join(",")})`)
    : query.eq("class_official_code", options.classOfficialCode);
  if (options.category) query = query.eq("category", options.category);
  const { data, error, count } = await query;
  assertNoError(error);
  const items = await mapOccurrenceRows((data ?? []) as OccurrenceRow[]);
  const total = count ?? 0;
  return { items, total, nextCursor: cursor + items.length < total ? cursor + items.length : null };
}

export async function listStudentOccurrences(studentId: string): Promise<StudentOccurrence[]> {
  return (await listStudentOccurrencesForStudents([studentId])).get(studentId) ?? [];
}

export async function listStudentOccurrencesForStudents(studentIds: string[], schoolYear?: number): Promise<Map<string, StudentOccurrence[]>> {
  const uniqueIds = [...new Set(studentIds)];
  const grouped = new Map<string, StudentOccurrence[]>(uniqueIds.map((studentId) => [studentId, []]));
  if (!uniqueIds.length) return grouped;
  const batches = Array.from({ length: Math.ceil(uniqueIds.length / 100) }, (_, index) => uniqueIds.slice(index * 100, (index + 1) * 100));
  const [individualPages, participantPages] = await Promise.all([
    Promise.all(batches.map((ids) => collectSupabasePages(async (from, to) => {
      let query = supabaseAdmin.from("school_occurrences").select(OCCURRENCE_SELECT).eq("target_type", "student").in("student_id", ids)
        .order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).range(from, to);
      if (schoolYear) query = query.eq("school_year", schoolYear);
      const { data, error } = await query;
      assertNoError(error); return (data ?? []) as OccurrenceRow[];
    }))),
    Promise.all(batches.map((ids) => collectSupabasePages(async (from, to) => {
      let query = supabaseAdmin.from("school_occurrence_students").select("occurrence_id, school_occurrences!inner(school_year)").in("student_id", ids).order("occurrence_id").range(from, to);
      if (schoolYear) query = query.eq("school_occurrences.school_year", schoolYear);
      const { data, error } = await query;
      assertNoError(error); return data ?? [];
    }))),
  ]);
  const collectiveIds = [...new Set(participantPages.flat(2).map((item) => item.occurrence_id))];
  const collectiveBatches = Array.from({ length: Math.ceil(collectiveIds.length / 100) }, (_, index) => collectiveIds.slice(index * 100, (index + 1) * 100));
  const collectivePages = await Promise.all(collectiveBatches.map((ids) => collectSupabasePages(async (from, to) => {
    let query = supabaseAdmin.from("school_occurrences").select(OCCURRENCE_SELECT).eq("target_type", "collective").in("id", ids)
      .order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).range(from, to);
    if (schoolYear) query = query.eq("school_year", schoolYear);
    const { data, error } = await query;
    assertNoError(error); return (data ?? []) as OccurrenceRow[];
  })));
  const items = await mapOccurrenceRows([...individualPages.flat(2), ...collectivePages.flat()]);
  const requestedIds = new Set(uniqueIds);
  for (const item of items) {
    if (item.targetType === "student" && item.studentId) grouped.get(item.studentId)?.push(item);
    if (item.targetType === "collective") for (const participant of item.participants) if (requestedIds.has(participant.studentId)) grouped.get(participant.studentId)?.push(item);
  }
  for (const values of grouped.values()) values.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt));
  return grouped;
}

async function resolveStudentClass(studentId: string, schoolYear: number) {
  const council = await latestCouncilForYear(schoolYear);
  if (!council?.current_import_id) return null;
  const { data: enrollment, error } = await supabaseAdmin.from("class_council_enrollments")
    .select("id, class:class_council_classes!inner(council_id, official_code, display_name)")
    .eq("student_id", studentId).eq("class_council_classes.council_id", council.id).maybeSingle();
  assertNoError(error);
  if (!enrollment) return null;
  const { count, error: snapshotError } = await supabaseAdmin.from("class_council_student_snapshots")
    .select("id", { count: "exact", head: true }).eq("import_id", council.current_import_id).eq("enrollment_id", enrollment.id);
  assertNoError(snapshotError);
  const schoolClass = relation(enrollment.class);
  return count && schoolClass ? { officialCode: schoolClass.official_code, name: schoolClass.display_name } : null;
}

async function resolveClassContext(schoolYear: number, officialCode: string) {
  const council = await latestCouncilForYear(schoolYear);
  if (!council?.current_import_id) return null;
  const { data: schoolClass, error } = await supabaseAdmin.from("class_council_classes")
    .select("id, official_code, display_name").eq("council_id", council.id).eq("official_code", officialCode).maybeSingle();
  assertNoError(error);
  if (!schoolClass) return null;
  const { data: enrollments, error: enrollmentError } = await supabaseAdmin.from("class_council_enrollments").select("id").eq("council_class_id", schoolClass.id).limit(1000);
  assertNoError(enrollmentError);
  const enrollmentIds = (enrollments ?? []).map((item) => item.id);
  if (!enrollmentIds.length) return null;
  const { count, error: snapshotError } = await supabaseAdmin.from("class_council_student_snapshots")
    .select("id", { count: "exact", head: true }).eq("import_id", council.current_import_id).in("enrollment_id", enrollmentIds);
  assertNoError(snapshotError);
  return count ? { officialCode: schoolClass.official_code, name: schoolClass.display_name } : null;
}

export async function createOccurrence(input: unknown, actorId: string): Promise<StudentOccurrence> {
  const parsed = parseSchoolOccurrenceInput(input);
  let student: { id: string; canonical_name: string; enrollment_number: string } | null = null;
  let classContext: { officialCode: string; name: string } | null = null;
  if (parsed.targetType === "collective") {
    const context = await getOccurrenceContext(parsed.schoolYear);
    const availableStudents = new Map(context.classes.flatMap((schoolClass) => schoolClass.students.map((student) => [student.id, { ...student, classOfficialCode: schoolClass.officialCode, className: schoolClass.name }] as const)));
    const participants = parsed.studentIds.map((studentId) => {
      const selected = availableStudents.get(studentId);
      if (!selected) throw new CouncilDomainError("Um dos estudantes selecionados não pertence à versão ativa do ano letivo.", 409, "student_not_in_active_import");
      return { student_id: selected.id, class_official_code: selected.classOfficialCode, class_name: selected.className };
    });
    const { data: occurrenceId, error } = await supabaseAdmin.rpc("create_collective_school_occurrence", {
      p_school_year: parsed.schoolYear, p_occurred_on: parsed.occurredOn, p_category: parsed.category,
      p_notes: parsed.notes, p_guardian_notified: parsed.guardianNotified, p_actor_id: actorId, p_students: participants,
    });
    assertNoError(error);
    if (!occurrenceId) throw new Error("A ocorrência coletiva não foi retornada após o cadastro.");
    const { data, error: occurrenceError } = await supabaseAdmin.from("school_occurrences").select(OCCURRENCE_SELECT).eq("id", occurrenceId).single();
    assertNoError(occurrenceError);
    const [created] = await mapOccurrenceRows([data as OccurrenceRow]);
    return created;
  } else if (parsed.targetType === "student" && parsed.studentId) {
    const response = await supabaseAdmin.from("students").select("id, canonical_name, enrollment_number").eq("id", parsed.studentId).maybeSingle();
    assertNoError(response.error);
    if (!response.data) throw new CouncilDomainError("Estudante não encontrado.", 404, "not_found");
    student = response.data;
    classContext = await resolveStudentClass(parsed.studentId, parsed.schoolYear);
  } else if (parsed.classOfficialCode) {
    const selectedClass = await resolveClassContext(parsed.schoolYear, parsed.classOfficialCode);
    if (!selectedClass) throw new CouncilDomainError("Turma não encontrada na versão ativa do ano letivo.", 404, "not_found");
    classContext = selectedClass;
  }
  const { data, error } = await supabaseAdmin.from("school_occurrences").insert({
    target_type: parsed.targetType, student_id: parsed.studentId, school_year: parsed.schoolYear,
    class_official_code: classContext?.officialCode ?? null, class_name: classContext?.name ?? null,
    occurred_on: parsed.occurredOn, category: parsed.category, notes: parsed.notes,
    guardian_notified: parsed.guardianNotified, created_by: actorId, updated_by: actorId,
  }).select(OCCURRENCE_SELECT).single();
  assertNoError(error);
  if (!data) throw new Error("A ocorrência não foi retornada após o cadastro.");
  const [created] = await mapOccurrenceRows([{ ...data, students: student } as OccurrenceRow]);
  return created;
}

export async function createStudentOccurrence(studentId: string, input: unknown, actorId: string): Promise<StudentOccurrence> {
  const parsed = parseStudentOccurrenceInput(input);
  return createOccurrence({ ...(input as Record<string, unknown>), ...parsed, targetType: "student", studentId, schoolYear: Number(parsed.occurredOn.slice(0, 4)) }, actorId);
}

export async function listStudentOccurrenceSummaries(studentIds?: string[], schoolYear?: number): Promise<Map<string, StudentOccurrenceSummary>> {
  const uniqueStudentIds = studentIds ? [...new Set(studentIds)] : null;
  if (uniqueStudentIds?.length === 0) return new Map();
  const { data, error } = await supabaseAdmin.rpc("list_student_occurrence_summaries", { p_student_ids: uniqueStudentIds, p_school_year: schoolYear ?? null });
  assertNoError(error);
  return new Map((data ?? []).map((row) => [row.student_id, {
    count: Number(row.occurrence_count), latest: { occurredOn: row.latest_occurred_on, category: row.latest_category as StudentOccurrenceCategory },
  }]));
}

export async function listClassCouncilOccurrences(councilId: string, classId: string): Promise<ClassCouncilOccurrences> {
  const { data: councilClass, error } = await supabaseAdmin.from("class_council_classes")
    .select("id, official_code, council:class_councils!inner(id, school_year, current_import_id)").eq("id", classId).eq("council_id", councilId).maybeSingle();
  assertNoError(error);
  const council = relation(councilClass?.council);
  if (!councilClass || !council?.current_import_id) throw new CouncilDomainError("Turma ou importação ativa não encontrada.", 404, "not_found");
  const { data: enrollments, error: enrollmentError } = await supabaseAdmin.from("class_council_enrollments").select("id, student_id, council_class_id").eq("council_class_id", classId);
  assertNoError(enrollmentError);
  const enrollmentRows = enrollments ?? [];
  const enrollmentIds = enrollmentRows.map((item) => item.id);
  const { data: snapshots, error: snapshotError } = enrollmentIds.length
    ? await supabaseAdmin.from("class_council_student_snapshots").select("enrollment_id").eq("import_id", council.current_import_id).in("enrollment_id", enrollmentIds)
    : { data: [], error: null };
  assertNoError(snapshotError);
  const studentIds = filterActiveEnrollments(enrollmentRows, snapshots ?? []).map((item) => item.student_id);
  const [byStudent, classRows] = await Promise.all([
    listStudentOccurrencesForStudents(studentIds, council.school_year),
    collectSupabasePages(async (from, to) => {
      const { data, error: classError } = await supabaseAdmin.from("school_occurrences").select(OCCURRENCE_SELECT)
        .eq("target_type", "class").eq("school_year", council.school_year).eq("class_official_code", councilClass.official_code)
        .order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).range(from, to);
      assertNoError(classError); return (data ?? []) as OccurrenceRow[];
    }),
  ]);
  const classOccurrences = await mapOccurrenceRows(classRows);
  const studentOccurrences = [...new Map(studentIds.flatMap((studentId) => byStudent.get(studentId) ?? []).map((item) => [item.id, item])).values()]
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt));
  return { schoolYear: council.school_year, classStudentIds: studentIds, classOccurrences, studentOccurrences, total: classOccurrences.length + studentOccurrences.length };
}
