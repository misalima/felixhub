import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { filterActiveEnrollments } from "@/lib/class-council/activeImport";
import { calculateStudentAlerts } from "@/lib/class-council/calculateAlerts";
import { calculateProjectedFlow, type ProjectedFlowStudentInput } from "@/lib/class-council/calculateFlow";
import { resolveCouncilCriteria } from "@/lib/class-council/constants";
import { SUPABASE_READ_PAGE_SIZE } from "@/lib/class-council/pagination";
import { listStudentOccurrenceSummaries } from "@/services/server/studentOccurrenceService";
import type { DashboardClassSummary, DashboardMatrixCell, DashboardPeriod, DashboardQualityItem, DashboardStudent, PedagogicalDashboardData } from "@/types/dashboard";

function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

type DashboardFilters = { year?: number; term?: number };

export async function listDashboardPeriods(): Promise<DashboardPeriod[]> {
  const { data, error } = await supabaseAdmin
    .from("class_councils")
    .select("id, school_year, term")
    .not("current_import_id", "is", null)
    .is("archived_at", null)
    .order("school_year", { ascending: false })
    .order("term", { ascending: false });
  assertNoError(error);
  return (data ?? []).map((item) => ({ councilId: item.id, year: item.school_year, term: item.term }));
}

async function readAllResults(importId: string) {
  const rows: Array<{ enrollment_id: string; subject_id: string; term: number; grade: number | null; grade_marker: string | null; absences: number | null }> = [];
  for (let from = 0; ; from += SUPABASE_READ_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("class_council_results")
      .select("enrollment_id, subject_id, term, grade, grade_marker, absences")
      .eq("import_id", importId)
      .order("id")
      .range(from, from + SUPABASE_READ_PAGE_SIZE - 1);
    assertNoError(error);
    rows.push(...(data ?? []).map((item) => ({ ...item, grade: item.grade === null ? null : Number(item.grade) })));
    if (!data || data.length < SUPABASE_READ_PAGE_SIZE) break;
  }
  return rows;
}

async function readBehaviorEnrollmentIds(classIds: string[]) {
  if (!classIds.length) return [];
  const rows: Array<{ enrollment_id: string }> = [];
  for (let from = 0; ; from += SUPABASE_READ_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("class_council_behaviors")
      .select("id, enrollment_id, class_council_enrollments!inner(council_class_id)")
      .in("class_council_enrollments.council_class_id", classIds)
      .order("id")
      .range(from, from + SUPABASE_READ_PAGE_SIZE - 1);
    assertNoError(error);
    rows.push(...(data ?? []).map((item) => ({ enrollment_id: item.enrollment_id })));
    if (!data || data.length < SUPABASE_READ_PAGE_SIZE) break;
  }
  return rows;
}

function emptyDashboard(periods: DashboardPeriod[]): PedagogicalDashboardData {
  const emptyFlow = calculateProjectedFlow([]).summary;
  return {
    periods,
    selected: null,
    source: null,
    metrics: { students: 0, monitoring: 0, retentionRisk: 0, completionRisk: 0, lowAttendance: 0, infrequent: 0, dropout: 0, missingGrades: 0, pendingInterventions: 0 },
    matrix: [],
    classes: [],
    quality: { missingAttendance: 0, bySubject: [], byClass: [] },
    flow: { overall: emptyFlow, byGrade: [], byClass: [] },
    students: [],
  };
}

function qualityItem(map: Map<string, DashboardQualityItem>, id: string, label: string) {
  const current = map.get(id) ?? { id, label, missingGrades: 0, specialResults: 0, missingAbsences: 0 };
  map.set(id, current);
  return current;
}

export async function getPedagogicalDashboard(filters: DashboardFilters = {}): Promise<PedagogicalDashboardData> {
  const periods = await listDashboardPeriods();
  const selected = periods.find((period) =>
    (filters.year === undefined || period.year === filters.year)
    && (filters.term === undefined || period.term === filters.term),
  ) ?? null;
  if (!selected) return emptyDashboard(periods);

  const { data: council, error: councilError } = await supabaseAdmin
    .from("class_councils")
    .select("id, school_year, term, criteria, current_import_id")
    .eq("id", selected.councilId)
    .single();
  assertNoError(councilError);
  if (!council) return emptyDashboard(periods);
  if (!council.current_import_id) return emptyDashboard(periods);

  const { data: classes, error: classError } = await supabaseAdmin
    .from("class_council_classes")
    .select("id, official_code, display_name, grade_level, shift")
    .eq("council_id", council.id)
    .order("display_name");
  assertNoError(classError);
  const classIds = (classes ?? []).map((item) => item.id);
  if (!classIds.length) return emptyDashboard(periods);

  const [enrollmentResponse, snapshotResponse, subjectResponse, importResponse, interventionResponse, results, occurrenceSummaries] = await Promise.all([
    supabaseAdmin.from("class_council_enrollments").select("id, council_class_id, student_id, discussed, activities_status, attendance_situation, pedagogical_observation, positive_notes, students(enrollment_number, canonical_name, current_situation)").in("council_class_id", classIds),
    supabaseAdmin.from("class_council_student_snapshots").select("enrollment_id, imported_name, attendance_rate, enrollment_status").eq("import_id", council.current_import_id),
    supabaseAdmin.from("class_council_subjects").select("id, council_class_id, normalized_name, display_name").in("council_class_id", classIds),
    supabaseAdmin.from("class_council_imports").select("id, version, source_generated_at, confirmed_at, warning_count").eq("id", council.current_import_id).single(),
    supabaseAdmin.from("class_council_interventions").select("id, origin_class_id, origin_enrollment_id, status").eq("origin_council_id", council.id).in("status", ["pending", "in_progress"]),
    readAllResults(council.current_import_id),
    listStudentOccurrenceSummaries(),
  ]);
  for (const response of [enrollmentResponse, snapshotResponse, subjectResponse, importResponse, interventionResponse]) assertNoError(response.error);

  const activeEnrollments = filterActiveEnrollments(enrollmentResponse.data ?? [], snapshotResponse.data ?? []);
  const activeEnrollmentIds = activeEnrollments.map((item) => item.id);
  const behaviorRows = await readBehaviorEnrollmentIds(classIds);

  const criteria = resolveCouncilCriteria(council.criteria);
  const classMap = new Map((classes ?? []).map((item) => [item.id, item]));
  const subjectMap = new Map((subjectResponse.data ?? []).map((item) => [item.id, item]));
  const snapshots = new Map((snapshotResponse.data ?? []).map((item) => [item.enrollment_id, item]));
  const resultsByEnrollment = new Map<string, typeof results>();
  for (const result of results) {
    const current = resultsByEnrollment.get(result.enrollment_id) ?? [];
    current.push(result);
    resultsByEnrollment.set(result.enrollment_id, current);
  }
  const behaviorsByEnrollment = new Map<string, number>();
  for (const behavior of behaviorRows) behaviorsByEnrollment.set(behavior.enrollment_id, (behaviorsByEnrollment.get(behavior.enrollment_id) ?? 0) + 1);
  const pendingByEnrollment = new Map<string, number>();
  const pendingByClass = new Map<string, number>();
  for (const intervention of interventionResponse.data ?? []) {
    pendingByClass.set(intervention.origin_class_id, (pendingByClass.get(intervention.origin_class_id) ?? 0) + 1);
    if (intervention.origin_enrollment_id) pendingByEnrollment.set(intervention.origin_enrollment_id, (pendingByEnrollment.get(intervention.origin_enrollment_id) ?? 0) + 1);
  }

  const baseDashboardStudents = activeEnrollments.map((enrollment) => {
    const snapshot = snapshots.get(enrollment.id);
    const councilClass = classMap.get(enrollment.council_class_id)!;
    const alertResults = (resultsByEnrollment.get(enrollment.id) ?? []).filter((result) => result.term <= council.term).map((result) => ({
      term: result.term,
      grade: result.grade,
      gradeMarker: result.grade_marker,
      subjectId: result.subject_id,
      subjectName: subjectMap.get(result.subject_id)?.display_name ?? "Disciplina",
    }));
    const gradeLevel = councilClass.grade_level as 1 | 2 | 3 | null;
    const attendanceRate = snapshot?.attendance_rate === null || snapshot?.attendance_rate === undefined ? null : Number(snapshot.attendance_rate);
    const name = snapshot?.imported_name ?? enrollment.students.canonical_name;
    return {
      studentId: enrollment.student_id,
      enrollmentId: enrollment.id,
      name,
      enrollmentNumber: enrollment.students.enrollment_number,
      classId: councilClass.id,
      className: councilClass.display_name,
      gradeLevel,
      attendanceRate,
      enrollmentStatus: snapshot?.enrollment_status ?? null,
      attendanceSituation: enrollment.students.current_situation as DashboardStudent["attendanceSituation"],
      pendingInterventions: pendingByEnrollment.get(enrollment.id) ?? 0,
      occurrences: occurrenceSummaries.get(enrollment.student_id) ?? { count: 0, latest: null },
      alerts: calculateStudentAlerts({ name, attendanceRate, gradeLevel, results: alertResults }, council.term, criteria),
    };
  });
  const flowOptions = { partialProgressionLimit: criteria.partialProgressionLimit, attendanceRetentionThreshold: criteria.attendanceRetentionThreshold };
  const flowInputs: ProjectedFlowStudentInput[] = baseDashboardStudents.map((student) => ({
    id: student.enrollmentId,
    gradeLevel: student.gradeLevel,
    enrollmentStatus: student.enrollmentStatus,
    attendanceSituation: student.attendanceSituation,
    attendanceRate: student.attendanceRate,
    alerts: student.alerts,
  }));
  const overallFlow = calculateProjectedFlow(flowInputs, flowOptions);
  const projectedFlowByStudent = new Map(overallFlow.students.map((item) => [item.id, item]));
  const dashboardStudents: DashboardStudent[] = baseDashboardStudents.map((student) => {
    const projection = projectedFlowByStudent.get(student.enrollmentId)!;
    return { ...student, projectedFlowStatus: projection.status, projectedFailedSubjects: projection.projectedFailedSubjects, projectedConclusion: projection.projectedConclusion };
  });
  const flowByGrade = ([1, 2, 3] as const).map((gradeLevel) => {
    const summary = calculateProjectedFlow(flowInputs.filter((student) => student.gradeLevel === gradeLevel), flowOptions).summary;
    return { id: String(gradeLevel), label: `${gradeLevel}ª série`, ...summary };
  }).filter((item) => item.total > 0);
  const flowByClass = (classes ?? []).map((item) => {
    const classEnrollmentIds = new Set(baseDashboardStudents.filter((student) => student.classId === item.id).map((student) => student.enrollmentId));
    const summary = calculateProjectedFlow(flowInputs.filter((student) => classEnrollmentIds.has(student.id)), flowOptions).summary;
    return { id: item.id, label: item.display_name, ...summary };
  }).filter((item) => item.total > 0).sort((a, b) => (a.projectedApprovalRate ?? 101) - (b.projectedApprovalRate ?? 101));

  const matrixMap = new Map<string, DashboardMatrixCell>();
  for (const student of dashboardStudents) {
    for (const detail of student.alerts.subjectDetails) {
      if (detail.incomplete) continue;
      const subject = subjectMap.get(detail.subjectId);
      if (!subject) continue;
      const key = `${student.gradeLevel ?? "unknown"}:${subject.normalized_name}`;
      const cell = matrixMap.get(key) ?? { gradeLevel: student.gradeLevel, normalizedName: subject.normalized_name, displayName: subject.display_name, subjectIds: [], offPace: 0, analyzed: 0, percentage: 0 };
      if (!cell.subjectIds.includes(subject.id)) cell.subjectIds.push(subject.id);
      cell.analyzed += 1;
      cell.offPace += Number(detail.offPace);
      matrixMap.set(key, cell);
    }
  }
  const matrix = [...matrixMap.values()].map((cell) => ({ ...cell, percentage: cell.analyzed ? Math.round((cell.offPace / cell.analyzed) * 1000) / 10 : 0 }));

  const bySubject = new Map<string, DashboardQualityItem>();
  const byClass = new Map<string, DashboardQualityItem>();
  const activeEnrollmentSet = new Set(activeEnrollmentIds);
  for (const result of results.filter((item) => item.term <= council.term && activeEnrollmentSet.has(item.enrollment_id))) {
    const subject = subjectMap.get(result.subject_id);
    const enrollment = activeEnrollments.find((item) => item.id === result.enrollment_id);
    const councilClass = enrollment ? classMap.get(enrollment.council_class_id) : null;
    if (!subject || !councilClass) continue;
    const subjectQuality = qualityItem(bySubject, subject.normalized_name, subject.display_name);
    const classQuality = qualityItem(byClass, councilClass.id, councilClass.display_name);
    const isMissing = result.grade === null && (!result.grade_marker || result.grade_marker === "*");
    const isSpecial = result.grade === null && Boolean(result.grade_marker && result.grade_marker !== "*");
    if (isMissing) { subjectQuality.missingGrades += 1; classQuality.missingGrades += 1; }
    if (isSpecial) { subjectQuality.specialResults += 1; classQuality.specialResults += 1; }
    if (result.absences === null) { subjectQuality.missingAbsences += 1; classQuality.missingAbsences += 1; }
  }

  const classSummaries: DashboardClassSummary[] = (classes ?? []).map((item) => {
    const classStudents = dashboardStudents.filter((student) => student.classId === item.id);
    const classEnrollments = activeEnrollments.filter((enrollment) => enrollment.council_class_id === item.id);
    return {
      id: item.id,
      name: item.display_name,
      officialCode: item.official_code,
      gradeLevel: item.grade_level as 1 | 2 | 3 | null,
      shift: item.shift,
      students: classStudents.length,
      monitoring: classStudents.filter((student) => student.alerts.academicStatus === "monitoring").length,
      academicRisk: classStudents.filter((student) => student.alerts.academicRisk).length,
      lowAttendance: classStudents.filter((student) => student.alerts.lowAttendance).length,
      infrequent: classStudents.filter((student) => student.attendanceSituation === "infrequent").length,
      dropout: classStudents.filter((student) => student.attendanceSituation === "dropout").length,
      transferred: classStudents.filter((student) => student.attendanceSituation === "transferred").length,
      behaviorRecords: classEnrollments.reduce((total, enrollment) => total + (behaviorsByEnrollment.get(enrollment.id) ?? 0), 0),
      pendingInterventions: pendingByClass.get(item.id) ?? 0,
      riskWithoutRecord: classEnrollments.filter((enrollment) => {
        const student = dashboardStudents.find((itemStudent) => itemStudent.enrollmentId === enrollment.id);
        if (!student?.alerts.academicRisk) return false;
        return !enrollment.discussed
          && enrollment.activities_status === "not_informed"
          && !enrollment.pedagogical_observation
          && !enrollment.positive_notes
          && !(pendingByEnrollment.get(enrollment.id) ?? 0)
          && !(behaviorsByEnrollment.get(enrollment.id) ?? 0);
      }).length,
    };
  }).filter((item) => item.students > 0).sort((a, b) => b.academicRisk - a.academicRisk || b.monitoring - a.monitoring || a.name.localeCompare(b.name, "pt-BR"));

  const importRecord = importResponse.data;
  if (!importRecord) return emptyDashboard(periods);
  return {
    periods,
    selected,
    source: {
      importId: importRecord.id,
      version: importRecord.version,
      generatedAt: importRecord.source_generated_at,
      confirmedAt: importRecord.confirmed_at,
      warningCount: importRecord.warning_count,
      policyVersion: criteria.policyVersion,
      policySource: criteria.sourceReference,
    },
    metrics: {
      students: dashboardStudents.length,
      monitoring: dashboardStudents.filter((student) => student.alerts.academicStatus === "monitoring").length,
      retentionRisk: dashboardStudents.filter((student) => student.alerts.academicStatus === "retention_risk").length,
      completionRisk: dashboardStudents.filter((student) => student.alerts.academicStatus === "completion_risk").length,
      lowAttendance: dashboardStudents.filter((student) => student.alerts.lowAttendance).length,
      infrequent: dashboardStudents.filter((student) => student.attendanceSituation === "infrequent").length,
      dropout: dashboardStudents.filter((student) => student.attendanceSituation === "dropout").length,
      missingGrades: [...bySubject.values()].reduce((total, item) => total + item.missingGrades, 0),
      pendingInterventions: interventionResponse.data?.length ?? 0,
    },
    matrix: matrix.sort((a, b) => (a.gradeLevel ?? 9) - (b.gradeLevel ?? 9) || a.displayName.localeCompare(b.displayName, "pt-BR")),
    classes: classSummaries,
    quality: {
      missingAttendance: dashboardStudents.filter((student) => student.attendanceRate === null).length,
      bySubject: [...bySubject.values()].sort((a, b) => b.missingGrades - a.missingGrades || a.label.localeCompare(b.label, "pt-BR")),
      byClass: [...byClass.values()].sort((a, b) => b.missingGrades - a.missingGrades || a.label.localeCompare(b.label, "pt-BR")),
    },
    flow: { overall: overallFlow.summary, byGrade: flowByGrade, byClass: flowByClass },
    students: dashboardStudents.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  };
}
