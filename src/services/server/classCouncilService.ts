import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { filterActiveEnrollments } from "@/lib/class-council/activeImport";
import { calculateStudentAlerts, compareStudentPriority } from "@/lib/class-council/calculateAlerts";
import { COUNCIL_CRITERIA, resolveCouncilCriteria } from "@/lib/class-council/constants";
import { collectSupabasePages, SUPABASE_READ_PAGE_SIZE } from "@/lib/class-council/pagination";
import { parsePerformanceReport } from "@/lib/class-council/parsePerformanceReport";
import { isPcdStatus } from "@/lib/class-council/normalize";
import { CouncilDomainError, optionalText } from "@/lib/class-council/validation";
import { assertClassCanComplete, assertCouncilCanComplete, findNextOpenClass } from "@/lib/class-council/stateRules";
import { downloadImportFile } from "@/services/server/classCouncilImportService";
import type { ActivitiesStatus, BehaviorCategory, InterventionStatus } from "@/types/class-council";
import type { Database, Json } from "@/types/database.types";

function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

type CouncilEnrollmentRow = Pick<Database["public"]["Tables"]["class_council_enrollments"]["Row"], "id" | "council_class_id" | "student_id"> & {
  students: Pick<Database["public"]["Tables"]["students"]["Row"], "enrollment_number" | "canonical_name">;
};
type CouncilSnapshotRow = Pick<Database["public"]["Tables"]["class_council_student_snapshots"]["Row"], "enrollment_id" | "attendance_rate" | "imported_name" | "report_position">;
type CouncilResultRow = Pick<Database["public"]["Tables"]["class_council_results"]["Row"], "enrollment_id" | "subject_id" | "term" | "grade" | "grade_marker" | "absences">;

async function listCouncilEnrollments(classIds: string[]): Promise<CouncilEnrollmentRow[]> {
  if (!classIds.length) return [];
  return collectSupabasePages(async (from, to) => {
    const { data, error } = await supabaseAdmin
      .from("class_council_enrollments")
      .select("id, council_class_id, student_id, students(enrollment_number, canonical_name)")
      .in("council_class_id", classIds)
      .order("id")
      .range(from, to);
    assertNoError(error);
    return (data ?? []) as CouncilEnrollmentRow[];
  });
}

async function listImportSnapshots(importId: string): Promise<CouncilSnapshotRow[]> {
  return collectSupabasePages(async (from, to) => {
    const { data, error } = await supabaseAdmin
      .from("class_council_student_snapshots")
      .select("enrollment_id, attendance_rate, imported_name, report_position")
      .eq("import_id", importId)
      .order("id")
      .range(from, to);
    assertNoError(error);
    return data ?? [];
  });
}

async function listImportResults(importId: string, enrollmentIds?: string[], throughTerm?: number): Promise<CouncilResultRow[]> {
  if (enrollmentIds && !enrollmentIds.length) return [];

  let countQuery = supabaseAdmin
    .from("class_council_results")
    .select("id", { count: "exact", head: true })
    .eq("import_id", importId);
  if (enrollmentIds) countQuery = countQuery.in("enrollment_id", enrollmentIds);
  if (throughTerm !== undefined) countQuery = countQuery.lte("term", throughTerm);
  const { count, error: countError } = await countQuery;
  assertNoError(countError);
  if (!count) return [];

  const pageStarts = Array.from({ length: Math.ceil(count / SUPABASE_READ_PAGE_SIZE) }, (_, index) => index * SUPABASE_READ_PAGE_SIZE);
  const rows: CouncilResultRow[] = [];
  const concurrency = 6;
  for (let index = 0; index < pageStarts.length; index += concurrency) {
    const pages = await Promise.all(pageStarts.slice(index, index + concurrency).map(async (from) => {
      let query = supabaseAdmin
      .from("class_council_results")
      .select("enrollment_id, subject_id, term, grade, grade_marker, absences")
      .eq("import_id", importId)
      .order("id");
      if (enrollmentIds) query = query.in("enrollment_id", enrollmentIds);
      if (throughTerm !== undefined) query = query.lte("term", throughTerm);
      const { data, error } = await query.range(from, from + SUPABASE_READ_PAGE_SIZE - 1);
      assertNoError(error);
      return data ?? [];
    }));
    for (const page of pages) rows.push(...page);
  }
  return rows;
}

async function getReportStudentPositions(councilId: string, importId: string, schoolYear: number, term: number, officialClassCode: string) {
  try {
    const { buffer } = await downloadImportFile(councilId, importId);
    const parsed = await parsePerformanceReport(buffer, { schoolYear, term, offering: "regular" });
    const parsedClass = parsed.classes.find((item) => item.officialCode === officialClassCode);
    if (!parsedClass) return new Map<string, number>();
    return new Map(parsedClass.students.map((student, index) => [student.enrollmentNumber, index]));
  } catch {
    // Importações anteriores à coluna report_position continuam acessíveis
    // mesmo se o arquivo privado estiver temporariamente indisponível.
    return new Map<string, number>();
  }
}

export async function listCouncils() {
  const { data, error } = await supabaseAdmin
    .from("class_councils")
    .select("id, school_year, term, offering, meeting_date, status, current_import_id, created_at, class_council_classes(id, status)")
    .is("archived_at", null)
    .order("meeting_date", { ascending: false })
    .limit(50);
  assertNoError(error);
  return (data ?? []).map((council) => ({
    ...council,
    classCount: council.current_import_id ? council.class_council_classes.length : 0,
    completedClassCount: council.current_import_id ? council.class_council_classes.filter((item) => item.status === "completed").length : 0,
    class_council_classes: undefined,
  }));
}

export async function createCouncil(input: { schoolYear: number; term: number; meetingDate: string }, actorId: string) {
  const schoolYear = Number(input.schoolYear);
  const term = Number(input.term);
  if (!Number.isInteger(schoolYear) || schoolYear < 2020 || schoolYear > 2100) throw new CouncilDomainError("Ano letivo inválido.");
  if (![1, 2, 3, 4].includes(term)) throw new CouncilDomainError("Bimestre inválido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.meetingDate)) throw new CouncilDomainError("Data do conselho inválida.");
  const { data, error } = await supabaseAdmin
    .from("class_councils")
    .insert({
      school_year: schoolYear,
      term,
      offering: "regular",
      meeting_date: input.meetingDate,
      created_by: actorId,
      updated_by: actorId,
      criteria: {
        low_grade_threshold: COUNCIL_CRITERIA.lowGradeThreshold,
        low_grade_subject_alert_count: COUNCIL_CRITERIA.lowGradeSubjectAlertCount,
        low_attendance_threshold: COUNCIL_CRITERIA.lowAttendanceThreshold,
      },
    })
    .select("id, school_year, term, offering, meeting_date, status")
    .single();
  if (error?.code === "23505") throw new CouncilDomainError("Já existe um conselho ativo para este ano e bimestre.", 409, "council_exists");
  assertNoError(error);
  return data;
}

export async function getCouncilOverview(councilId: string) {
  const { data: council, error: councilError } = await supabaseAdmin
    .from("class_councils")
    .select("id, school_year, term, offering, meeting_date, status, criteria, current_import_id")
    .eq("id", councilId)
    .is("archived_at", null)
    .maybeSingle();
  assertNoError(councilError);
  if (!council) throw new CouncilDomainError("Conselho não encontrado.", 404, "not_found");

  const { data: classes, error: classesError } = await supabaseAdmin
    .from("class_council_classes")
    .select("id, official_code, display_name, grade_label, shift, status, completed_at")
    .eq("council_id", councilId)
    .order("display_name");
  assertNoError(classesError);
  const classIds = (classes ?? []).map((item) => item.id);
  if (!council.current_import_id || !classIds.length) {
    return { council, classes: [], metrics: { students: 0, atRisk: 0, lowAttendance: 0, worsened: 0, pendingInterventions: 0 }, subjectRanking: [], studentDetails: [], interventionDetails: [] };
  }

  const [enrollments, snapshotRows, resultRows, subjectResponse, interventionResponse] = await Promise.all([
    listCouncilEnrollments(classIds),
    listImportSnapshots(council.current_import_id),
    listImportResults(council.current_import_id, undefined, council.term),
    supabaseAdmin.from("class_council_subjects").select("id, council_class_id, display_name").in("council_class_id", classIds),
    supabaseAdmin.from("class_council_interventions").select("id, status, description, responsible_name, due_date, origin_class_id, origin_enrollment_id, target_type").eq("origin_council_id", councilId).in("status", ["pending", "in_progress"]),
  ]);
  for (const response of [subjectResponse, interventionResponse]) assertNoError(response.error);

  const snapshots = new Map(snapshotRows.map((item) => [item.enrollment_id, {
    ...item,
    attendance_rate: item.attendance_rate === null ? null : Number(item.attendance_rate),
  }]));
  const activeEnrollments = filterActiveEnrollments(enrollments, snapshotRows);
  const criteria = resolveCouncilCriteria(council.criteria);
  const resultsByEnrollment = new Map<string, Array<{ term: number; grade: number | null; subject_id: string }>>();
  for (const result of resultRows) {
    const results = resultsByEnrollment.get(result.enrollment_id) ?? [];
    results.push({ term: result.term, grade: result.grade === null ? null : Number(result.grade), subject_id: result.subject_id });
    resultsByEnrollment.set(result.enrollment_id, results);
  }
  const classMetrics = new Map<string, { studentCount: number; atRiskCount: number }>();
  let atRisk = 0;
  let lowAttendance = 0;
  let worsened = 0;
  const classNames = new Map((classes ?? []).map((item) => [item.id, item.display_name]));
  const studentDetails: Array<{
    enrollmentId: string;
    name: string;
    enrollmentNumber: string;
    classId: string;
    className: string;
    attendanceRate: number | null;
    alerts: ReturnType<typeof calculateStudentAlerts>;
  }> = [];
  for (const enrollment of activeEnrollments) {
    const snapshot = snapshots.get(enrollment.id);
    const attendanceRate = snapshot?.attendance_rate === null || snapshot?.attendance_rate === undefined ? null : Number(snapshot.attendance_rate);
    const name = snapshot?.imported_name ?? enrollment.students.canonical_name;
    const alerts = calculateStudentAlerts({ name, attendanceRate, results: resultsByEnrollment.get(enrollment.id) ?? [] }, council.term, criteria);
    const metric = classMetrics.get(enrollment.council_class_id) ?? { studentCount: 0, atRiskCount: 0 };
    metric.studentCount += 1;
    if (alerts.atRisk) metric.atRiskCount += 1;
    classMetrics.set(enrollment.council_class_id, metric);
    atRisk += Number(alerts.atRisk);
    lowAttendance += Number(alerts.lowAttendance);
    worsened += Number(alerts.evolution === "worsened");
    studentDetails.push({
      enrollmentId: enrollment.id,
      name,
      enrollmentNumber: enrollment.students.enrollment_number,
      classId: enrollment.council_class_id,
      className: classNames.get(enrollment.council_class_id) ?? "Turma",
      attendanceRate,
      alerts,
    });
  }
  const subjects = new Map((subjectResponse.data ?? []).map((subject) => [subject.id, subject]));
  const subjectCounts = new Map<string, { name: string; low: number; numeric: number }>();
  for (const result of resultRows) {
    if (result.term !== council.term || result.grade === null) continue;
    const subject = subjects.get(result.subject_id);
    if (!subject) continue;
    const key = subject.display_name;
    const count = subjectCounts.get(key) ?? { name: subject.display_name, low: 0, numeric: 0 };
    count.numeric += 1;
    if (Number(result.grade) < criteria.lowGradeThreshold) count.low += 1;
    subjectCounts.set(key, count);
  }
  const studentNamesByEnrollment = new Map(studentDetails.map((student) => [student.enrollmentId, student.name]));
  return {
    council,
    classes: (classes ?? []).filter((item) => classMetrics.has(item.id)).map((item) => ({ ...item, ...classMetrics.get(item.id)! })),
    metrics: {
      students: activeEnrollments.length,
      atRisk,
      lowAttendance,
      worsened,
      pendingInterventions: interventionResponse.data?.length ?? 0,
    },
    studentDetails: studentDetails.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    interventionDetails: (interventionResponse.data ?? []).map((intervention) => ({
      ...intervention,
      className: classNames.get(intervention.origin_class_id) ?? "Turma",
      studentName: intervention.origin_enrollment_id ? studentNamesByEnrollment.get(intervention.origin_enrollment_id) ?? null : null,
    })),
    subjectRanking: [...subjectCounts.values()].map((item) => ({ ...item, percentage: item.numeric ? Math.round((item.low / item.numeric) * 1000) / 10 : 0 })).sort((a, b) => b.low - a.low).slice(0, 12),
  };
}

export async function archiveCouncil(councilId: string, actorId: string) {
  const archivedAt = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("class_councils")
    .update({ status: "archived", archived_at: archivedAt, updated_by: actorId })
    .eq("id", councilId)
    .is("archived_at", null)
    .select("id, status, archived_at")
    .maybeSingle();
  assertNoError(error);
  if (!data) throw new CouncilDomainError("Conselho não encontrado ou já excluído.", 404, "not_found");

  const { error: auditError } = await supabaseAdmin.from("class_council_audit_log").insert({
    council_id: councilId,
    actor_id: actorId,
    event_type: "council_archived",
    entity_type: "council",
    entity_id: councilId,
  });
  assertNoError(auditError);
  return data;
}

export async function getClassWorkspace(councilId: string, classId: string) {
  const { data: council, error: councilError } = await supabaseAdmin.from("class_councils").select("id, term, status, current_import_id, school_year, criteria").eq("id", councilId).is("archived_at", null).maybeSingle();
  assertNoError(councilError);
  if (!council?.current_import_id) throw new CouncilDomainError("O conselho ainda não possui importação confirmada.", 409, "import_required");
  const { data: councilClass, error: classError } = await supabaseAdmin
    .from("class_council_classes")
    .select("*")
    .eq("id", classId)
    .eq("council_id", councilId)
    .maybeSingle();
  assertNoError(classError);
  if (!councilClass) throw new CouncilDomainError("Turma não encontrada.", 404, "not_found");

  const enrollmentResponse = await supabaseAdmin
    .from("class_council_enrollments")
    .select("id, student_id, discussed, activities_status, pedagogical_observation, positive_notes, students(id, enrollment_number, canonical_name)")
    .eq("council_class_id", classId);
  assertNoError(enrollmentResponse.error);
  const enrollmentIds = (enrollmentResponse.data ?? []).map((item) => item.id);

  const [snapshotResponse, resultRows, subjectResponse, participantResponse, behaviorResponse, interventionResponse, classNavigationResponse] = await Promise.all([
    supabaseAdmin.from("class_council_student_snapshots").select("enrollment_id, imported_name, attendance_rate, enrollment_status, pcd_status, report_position").eq("import_id", council.current_import_id).in("enrollment_id", enrollmentIds),
    listImportResults(council.current_import_id, enrollmentIds, council.term),
    supabaseAdmin.from("class_council_subjects").select("id, display_name, normalized_name, teacher_name").eq("council_class_id", classId).order("display_name"),
    supabaseAdmin.from("class_council_participants").select("id, name, role_or_subject, position").eq("council_class_id", classId).order("position"),
    supabaseAdmin.from("class_council_behaviors").select("id, enrollment_id, category, description").in("enrollment_id", enrollmentIds),
    supabaseAdmin.from("class_council_interventions").select("id, origin_enrollment_id, target_type, description, responsible_name, due_date, status, outcome, cancellation_reason").eq("origin_class_id", classId).order("created_at"),
    supabaseAdmin.from("class_council_classes").select("id, display_name, status").eq("council_id", councilId).order("display_name"),
  ]);
  for (const response of [snapshotResponse, subjectResponse, participantResponse, behaviorResponse, interventionResponse, classNavigationResponse]) assertNoError(response.error);
  const reportPositions = (snapshotResponse.data ?? []).some((snapshot) => snapshot.report_position === null)
    ? await getReportStudentPositions(councilId, council.current_import_id, council.school_year, council.term, councilClass.official_code)
    : new Map<string, number>();

  const snapshots = new Map((snapshotResponse.data ?? []).map((item) => [item.enrollment_id, item]));
  const resultsByEnrollment = new Map<string, CouncilResultRow[]>();
  for (const result of resultRows) {
    const list = resultsByEnrollment.get(result.enrollment_id) ?? [];
    list.push(result);
    resultsByEnrollment.set(result.enrollment_id, list);
  }
  const behaviorsByEnrollment = new Map<string, typeof behaviorResponse.data>();
  for (const behavior of behaviorResponse.data ?? []) {
    const list = behaviorsByEnrollment.get(behavior.enrollment_id) ?? [];
    list.push(behavior);
    behaviorsByEnrollment.set(behavior.enrollment_id, list);
  }
  const interventionsByEnrollment = new Map<string, typeof interventionResponse.data>();
  for (const intervention of interventionResponse.data ?? []) {
    if (!intervention.origin_enrollment_id) continue;
    const list = interventionsByEnrollment.get(intervention.origin_enrollment_id) ?? [];
    list.push(intervention);
    interventionsByEnrollment.set(intervention.origin_enrollment_id, list);
  }
  const subjectMap = new Map((subjectResponse.data ?? []).map((item) => [item.id, item]));
  const activeClassEnrollments = filterActiveEnrollments(enrollmentResponse.data ?? [], snapshotResponse.data ?? []);
  const criteria = resolveCouncilCriteria(council.criteria);
  const students = activeClassEnrollments.map((enrollment) => {
    const snapshot = snapshots.get(enrollment.id);
    const results = (resultsByEnrollment.get(enrollment.id) ?? []).map((result) => ({
      ...result,
      grade: result.grade === null ? null : Number(result.grade),
      subjectName: subjectMap.get(result.subject_id)?.display_name ?? "Disciplina",
    }));
    const name = snapshot?.imported_name ?? enrollment.students.canonical_name;
    const alerts = calculateStudentAlerts({ name, attendanceRate: snapshot?.attendance_rate === null || snapshot?.attendance_rate === undefined ? null : Number(snapshot.attendance_rate), results }, council.term, criteria);
    return {
      enrollmentId: enrollment.id,
      studentId: enrollment.student_id,
      enrollmentNumber: enrollment.students.enrollment_number,
      reportPosition: snapshot?.report_position ?? reportPositions.get(enrollment.students.enrollment_number) ?? null,
      name,
      isPcd: isPcdStatus(snapshot?.pcd_status),
      attendanceRate: snapshot?.attendance_rate === null || snapshot?.attendance_rate === undefined ? null : Number(snapshot.attendance_rate),
      enrollmentStatus: snapshot?.enrollment_status ?? null,
      discussed: enrollment.discussed,
      activitiesStatus: enrollment.activities_status,
      pedagogicalObservation: enrollment.pedagogical_observation,
      positiveNotes: enrollment.positive_notes,
      alerts,
      results,
      behaviors: behaviorsByEnrollment.get(enrollment.id) ?? [],
      interventions: interventionsByEnrollment.get(enrollment.id) ?? [],
    };
  }).sort(compareStudentPriority);

  const currentTermLowCounts = students.map((student) => student.alerts.currentLowGradeCount);
  return {
    council,
    class: councilClass,
    nextClass: findNextOpenClass(classNavigationResponse.data ?? [], classId),
    readOnly: councilClass.status === "completed" || council.status === "completed",
    subjects: subjectResponse.data ?? [],
    participants: participantResponse.data ?? [],
    classInterventions: (interventionResponse.data ?? []).filter((item) => item.target_type === "class"),
    students,
    visualizations: {
      distribution: [...new Set(currentTermLowCounts)].sort((a, b) => a - b).map((count) => ({ count, students: currentTermLowCounts.filter((value) => value === count).length })),
      evolution: {
        improved: students.filter((item) => item.alerts.evolution === "improved").length,
        stable: students.filter((item) => item.alerts.evolution === "stable").length,
        worsened: students.filter((item) => item.alerts.evolution === "worsened").length,
        unavailable: students.filter((item) => item.alerts.evolution === "unavailable").length,
      },
    },
  };
}

async function requireEditableClass(councilId: string, classId: string) {
  const { data, error } = await supabaseAdmin.from("class_council_classes").select("id, status, council_id, class_councils!inner(archived_at)").eq("id", classId).eq("council_id", councilId).is("class_councils.archived_at", null).maybeSingle();
  assertNoError(error);
  if (!data) throw new CouncilDomainError("Turma não encontrada.", 404, "not_found");
  if (data.status === "completed") throw new CouncilDomainError("A turma concluída está disponível somente para leitura.", 409, "class_read_only");
  return data;
}

export async function updateClassNotes(councilId: string, classId: string, input: Record<string, unknown>, actorId: string) {
  await requireEditableClass(councilId, classId);
  const allowed = ["class_strengths", "general_difficulties", "behavior_and_coexistence", "learning_aspects", "collective_strategies"] as const;
  const updates = Object.fromEntries(allowed.filter((field) => field in input).map((field) => [field, optionalText(input[field])])) as Record<string, string | null>;
  const { data, error } = await supabaseAdmin.from("class_council_classes").update({ ...updates, status: "in_progress", updated_by: actorId }).eq("id", classId).select("*").single();
  assertNoError(error);
  await markCouncilInProgress(councilId, actorId);
  return data;
}

export async function replaceParticipants(councilId: string, classId: string, participants: Array<{ name: string; roleOrSubject?: string | null }>, actorId: string) {
  await requireEditableClass(councilId, classId);
  const normalized = participants.map((item, position) => ({ name: optionalText(item.name, 200), role_or_subject: optionalText(item.roleOrSubject, 200), position }));
  if (normalized.some((item) => !item.name)) throw new CouncilDomainError("O nome de cada participante é obrigatório.");
  const { error } = await supabaseAdmin.rpc("replace_class_council_participants", {
    p_council_id: councilId,
    p_class_id: classId,
    p_participants: normalized as unknown as Json,
    p_actor_id: actorId,
  });
  assertNoError(error);
  return normalized;
}

export async function updateSubjectTeacher(councilId: string, classId: string, subjectId: string, teacherName: unknown, actorId: string) {
  await requireEditableClass(councilId, classId);
  const { data, error } = await supabaseAdmin.from("class_council_subjects").update({ teacher_name: optionalText(teacherName, 200), updated_by: actorId }).eq("id", subjectId).eq("council_class_id", classId).select("id, teacher_name").maybeSingle();
  assertNoError(error);
  if (!data) throw new CouncilDomainError("Disciplina não encontrada.", 404, "not_found");
  await supabaseAdmin.from("class_council_classes").update({ status: "in_progress", updated_by: actorId }).eq("id", classId);
  await markCouncilInProgress(councilId, actorId);
  return data;
}

export async function startClassWithTeachers(councilId: string, classId: string, teachers: Array<{ name: unknown; subjectId: string }>, actorId: string) {
  const councilClass = await requireEditableClass(councilId, classId);
  if (councilClass.status !== "not_started") throw new CouncilDomainError("Esta turma já foi iniciada.", 409, "class_already_started");
  if (!Array.isArray(teachers) || teachers.length < 1 || teachers.length > 50) throw new CouncilDomainError("Informe ao menos um professor presente.");

  const normalized = teachers.map((teacher) => ({
    name: optionalText(teacher.name, 200),
    subjectId: teacher.subjectId,
  }));
  if (normalized.some((teacher) => !teacher.name)) throw new CouncilDomainError("O nome de cada professor é obrigatório.");
  if (new Set(normalized.map((teacher) => teacher.subjectId)).size !== normalized.length) throw new CouncilDomainError("Cada disciplina pode ser informada apenas uma vez.");

  const { data: subjects, error: subjectsError } = await supabaseAdmin.from("class_council_subjects").select("id").eq("council_class_id", classId).in("id", normalized.map((teacher) => teacher.subjectId));
  assertNoError(subjectsError);
  if ((subjects ?? []).length !== normalized.length) throw new CouncilDomainError("Selecione apenas disciplinas válidas desta turma.");
  const { data: started, error: startError } = await supabaseAdmin.rpc("start_class_council_class", {
    p_council_id: councilId,
    p_class_id: classId,
    p_teachers: normalized.map((teacher) => ({ name: teacher.name!, subject_id: teacher.subjectId })) as unknown as Json,
    p_actor_id: actorId,
  });
  assertNoError(startError);
  if (!started) throw new CouncilDomainError("Esta turma já foi iniciada.", 409, "class_already_started");

  return { started: true, teacherCount: normalized.length };
}

export async function updateStudentRecord(councilId: string, classId: string, enrollmentId: string, input: { discussed?: boolean; activitiesStatus?: ActivitiesStatus; pedagogicalObservation?: unknown; positiveNotes?: unknown; behaviors?: Array<{ category: BehaviorCategory; description?: unknown }> }, actorId: string) {
  await requireEditableClass(councilId, classId);
  const { data: enrollment, error: enrollmentError } = await supabaseAdmin.from("class_council_enrollments").select("id").eq("id", enrollmentId).eq("council_class_id", classId).maybeSingle();
  assertNoError(enrollmentError);
  if (!enrollment) throw new CouncilDomainError("Estudante não encontrado nesta turma.", 404, "not_found");
  const validActivities = ["not_informed", "regular", "irregular", "does_not_do"];
  if (input.activitiesStatus && !validActivities.includes(input.activitiesStatus)) throw new CouncilDomainError("Situação das atividades inválida.");
  const hasPedagogicalContent = Boolean(input.activitiesStatus && input.activitiesStatus !== "not_informed") || optionalText(input.pedagogicalObservation) !== null || optionalText(input.positiveNotes) !== null || Boolean(input.behaviors?.length);
  const update = {
    ...(typeof input.discussed === "boolean" ? { discussed: input.discussed } : hasPedagogicalContent ? { discussed: true } : {}),
    ...(input.activitiesStatus ? { activities_status: input.activitiesStatus } : {}),
    ...("pedagogicalObservation" in input ? { pedagogical_observation: optionalText(input.pedagogicalObservation) } : {}),
    ...("positiveNotes" in input ? { positive_notes: optionalText(input.positiveNotes) } : {}),
    updated_by: actorId,
  };
  const { error } = await supabaseAdmin.from("class_council_enrollments").update(update).eq("id", enrollmentId);
  assertNoError(error);
  if (input.behaviors) {
    const allowed: BehaviorCategory[] = ["excessive_talking", "inappropriate_phone_use", "peer_conflicts", "disrespect_or_coexistence_difficulty", "low_participation", "recurring_lateness", "sleeping_in_class", "frequently_out_of_class", "activities_not_completed", "other"];
    if (input.behaviors.some((item) => !allowed.includes(item.category))) throw new CouncilDomainError("Categoria de comportamento inválida.");
    const { data: existing, error: existingError } = await supabaseAdmin.from("class_council_behaviors").select("category, created_by").eq("enrollment_id", enrollmentId);
    assertNoError(existingError);
    if (input.behaviors.length) {
      const creators = new Map((existing ?? []).map((item) => [item.category, item.created_by]));
      const { error: behaviorError } = await supabaseAdmin.from("class_council_behaviors").upsert(input.behaviors.map((item) => ({ enrollment_id: enrollmentId, category: item.category, description: optionalText(item.description), created_by: creators.get(item.category) ?? actorId, updated_by: actorId })), { onConflict: "enrollment_id,category" });
      assertNoError(behaviorError);
    }
    const requested = new Set(input.behaviors.map((item) => item.category));
    const removed = (existing ?? []).filter((item) => !requested.has(item.category as BehaviorCategory)).map((item) => item.category);
    if (removed.length) {
      const { error: deleteError } = await supabaseAdmin.from("class_council_behaviors").delete().eq("enrollment_id", enrollmentId).in("category", removed);
      assertNoError(deleteError);
    }
  }
  await supabaseAdmin.from("class_council_classes").update({ status: "in_progress", updated_by: actorId }).eq("id", classId);
  await markCouncilInProgress(councilId, actorId);
  return { saved: true };
}

export async function createIntervention(councilId: string, classId: string, input: { enrollmentId?: string; description: unknown; responsibleName?: unknown; dueDate?: unknown }, actorId: string) {
  await requireEditableClass(councilId, classId);
  const description = optionalText(input.description);
  if (!description) throw new CouncilDomainError("A descrição da intervenção é obrigatória.");
  const { data: councilClass, error: classError } = await supabaseAdmin.from("class_council_classes").select("official_code, council_id, class_councils(school_year)").eq("id", classId).eq("council_id", councilId).single();
  assertNoError(classError);
  if (!councilClass) throw new CouncilDomainError("Turma não encontrada.", 404, "not_found");
  let studentId: string | null = null;
  if (input.enrollmentId) {
    const { data, error } = await supabaseAdmin.from("class_council_enrollments").select("student_id").eq("id", input.enrollmentId).eq("council_class_id", classId).maybeSingle();
    assertNoError(error);
    if (!data) throw new CouncilDomainError("Estudante não encontrado.", 404, "not_found");
    studentId = data.student_id;
  }
  const targetType = input.enrollmentId ? "student" : "class";
  const { data, error } = await supabaseAdmin.from("class_council_interventions").insert({
    target_type: targetType,
    origin_council_id: councilId,
    origin_class_id: classId,
    origin_enrollment_id: input.enrollmentId ?? null,
    target_student_id: studentId,
    target_class_official_code: targetType === "class" ? councilClass.official_code : null,
    target_school_year: targetType === "class" ? councilClass.class_councils.school_year : null,
    description,
    responsible_name: optionalText(input.responsibleName, 200),
    due_date: optionalText(input.dueDate, 10),
    created_by: actorId,
    updated_by: actorId,
  }).select("*").single();
  assertNoError(error);
  await supabaseAdmin.from("class_council_classes").update({ status: "in_progress", updated_by: actorId }).eq("id", classId);
  await markCouncilInProgress(councilId, actorId);
  return data;
}

export async function updateIntervention(councilId: string, interventionId: string, input: { status?: InterventionStatus; outcome?: unknown; cancellationReason?: unknown; responsibleName?: unknown; dueDate?: unknown }, actorId: string) {
  const { count: activeCouncilCount, error: activeCouncilError } = await supabaseAdmin.from("class_councils").select("id", { count: "exact", head: true }).eq("id", councilId).is("archived_at", null);
  assertNoError(activeCouncilError);
  if (!activeCouncilCount) throw new CouncilDomainError("Conselho não encontrado.", 404, "not_found");
  const allowed: InterventionStatus[] = ["pending", "in_progress", "completed", "cancelled"];
  if (input.status && !allowed.includes(input.status)) throw new CouncilDomainError("Situação da intervenção inválida.");
  const updates = {
    ...(input.status ? { status: input.status } : {}),
    ...("outcome" in input ? { outcome: optionalText(input.outcome) } : {}),
    ...("cancellationReason" in input ? { cancellation_reason: optionalText(input.cancellationReason) } : {}),
    ...("responsibleName" in input ? { responsible_name: optionalText(input.responsibleName, 200) } : {}),
    ...("dueDate" in input ? { due_date: optionalText(input.dueDate, 10) } : {}),
    updated_by: actorId,
  };
  const { data, error } = await supabaseAdmin.from("class_council_interventions").update(updates).eq("id", interventionId).eq("origin_council_id", councilId).select("*").maybeSingle();
  assertNoError(error);
  if (!data) throw new CouncilDomainError("Intervenção não encontrada.", 404, "not_found");
  return data;
}

export async function completeClass(councilId: string, classId: string, actorId: string) {
  await requireEditableClass(councilId, classId);
  const { count, error: countError } = await supabaseAdmin.from("class_council_participants").select("id", { count: "exact", head: true }).eq("council_class_id", classId);
  assertNoError(countError);
  assertClassCanComplete(count ?? 0);
  const { data, error } = await supabaseAdmin.from("class_council_classes").update({ status: "completed", completed_by: actorId, updated_by: actorId }).eq("id", classId).eq("council_id", councilId).neq("status", "completed").select("id, status, completed_at").maybeSingle();
  assertNoError(error);
  if (!data) throw new CouncilDomainError("A turma não foi encontrada ou já está concluída.", 409, "invalid_transition");
  await supabaseAdmin.from("class_council_audit_log").insert({ council_id: councilId, council_class_id: classId, actor_id: actorId, event_type: "class_completed", entity_type: "class", entity_id: classId });
  return data;
}

export async function reopenClass(councilId: string, classId: string, actorId: string) {
  const { data: reopened, error } = await supabaseAdmin.rpc("reopen_class_council_class", {
    p_council_id: councilId,
    p_class_id: classId,
    p_actor_id: actorId,
  });
  assertNoError(error);
  if (!reopened) throw new CouncilDomainError("A turma não está concluída, não foi encontrada ou o conselho já foi concluído.", 409, "invalid_transition");
  return { id: classId, status: "in_progress" as const };
}

export async function completeCouncil(councilId: string, actorId: string) {
  const { data: council, error: councilError } = await supabaseAdmin.from("class_councils").select("current_import_id").eq("id", councilId).is("archived_at", null).maybeSingle();
  assertNoError(councilError);
  if (!council) throw new CouncilDomainError("Conselho não encontrado.", 404, "not_found");
  const { data: classes, error: classesError } = await supabaseAdmin.from("class_council_classes").select("id, status").eq("council_id", councilId);
  assertNoError(classesError);
  const classIds = (classes ?? []).map((item) => item.id);
  const [enrollments, snapshots] = council.current_import_id && classIds.length
    ? await Promise.all([listCouncilEnrollments(classIds), listImportSnapshots(council.current_import_id)])
    : [[], []];
  const activeEnrollmentIds = new Set(snapshots.map((snapshot) => snapshot.enrollment_id));
  const activeClassIds = new Set(enrollments.filter((enrollment) => activeEnrollmentIds.has(enrollment.id)).map((enrollment) => enrollment.council_class_id));
  const activeClassStatuses = (classes ?? []).filter((item) => activeClassIds.has(item.id)).map((item) => item.status);
  assertCouncilCanComplete({ hasCurrentImport: Boolean(council.current_import_id), classStatuses: activeClassStatuses });
  const { data, error } = await supabaseAdmin.from("class_councils").update({ status: "completed", completed_by: actorId, updated_by: actorId }).eq("id", councilId).not("current_import_id", "is", null).neq("status", "completed").select("id, status, completed_at").maybeSingle();
  assertNoError(error);
  if (!data) throw new CouncilDomainError("O conselho não pode ser concluído neste estado.", 409, "invalid_transition");
  await supabaseAdmin.from("class_council_audit_log").insert({ council_id: councilId, actor_id: actorId, event_type: "council_completed", entity_type: "council", entity_id: councilId });
  return data;
}

async function markCouncilInProgress(councilId: string, actorId: string) {
  await supabaseAdmin.from("class_councils").update({ status: "in_progress", updated_by: actorId }).eq("id", councilId).in("status", ["draft", "preparation"]);
}
