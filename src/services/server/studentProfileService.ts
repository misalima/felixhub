import { filterActiveEnrollments } from "@/lib/class-council/activeImport";
import { calculateStudentAlerts } from "@/lib/class-council/calculateAlerts";
import { projectStudentFlow } from "@/lib/class-council/calculateFlow";
import { resolveCouncilCriteria } from "@/lib/class-council/constants";
import { CouncilDomainError } from "@/lib/class-council/validation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { listStudentOccurrencesForStudents } from "@/services/server/studentOccurrenceService";
import { listInterventions } from "@/services/server/interventionService";
import type { ActivitiesStatus, AttendanceSituation, BehaviorCategory } from "@/types/class-council";
import type { StudentCouncilHistoryItem, StudentProfileData } from "@/types/student-profile";

const MAX_BATCH_STUDENTS = 60;

function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function numberOrNull(value: number | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}

export async function getCurrentClassStudentIds(classId: string): Promise<string[]> {
  const { data: councilClass, error: classError } = await supabaseAdmin.from("class_council_classes").select("id, council_id").eq("id", classId).maybeSingle();
  assertNoError(classError);
  if (!councilClass) throw new CouncilDomainError("Turma não encontrada.", 404, "not_found");
  const { data: council, error: councilError } = await supabaseAdmin.from("class_councils").select("current_import_id").eq("id", councilClass.council_id).is("archived_at", null).maybeSingle();
  assertNoError(councilError);
  if (!council?.current_import_id) return [];
  const { data: enrollments, error: enrollmentError } = await supabaseAdmin.from("class_council_enrollments").select("id, student_id, council_class_id").eq("council_class_id", classId);
  assertNoError(enrollmentError);
  if (!enrollments?.length) return [];
  const { data: snapshots, error: snapshotError } = await supabaseAdmin.from("class_council_student_snapshots").select("enrollment_id, enrollment_status").eq("import_id", council.current_import_id).in("enrollment_id", enrollments.map((item) => item.id));
  assertNoError(snapshotError);
  return filterActiveEnrollments(enrollments, snapshots ?? []).map((item) => item.student_id);
}

export async function getStudentProfile(studentId: string): Promise<StudentProfileData> {
  const profiles = await getStudentProfiles([studentId]);
  if (!profiles[0]) throw new CouncilDomainError("Estudante não encontrado.", 404, "not_found");
  return profiles[0];
}

export async function getStudentProfiles(studentIds: string[]): Promise<StudentProfileData[]> {
  const uniqueIds = [...new Set(studentIds)];
  if (!uniqueIds.length) return [];
  if (uniqueIds.length > MAX_BATCH_STUDENTS) throw new CouncilDomainError(`Selecione no máximo ${MAX_BATCH_STUDENTS} estudantes por relatório.`);

  const [studentResponse, occurrenceMap, interventionReport] = await Promise.all([
    supabaseAdmin.from("students").select("id, canonical_name, enrollment_number, current_situation, situation_updated_at").in("id", uniqueIds),
    listStudentOccurrencesForStudents(uniqueIds),
    listInterventions({ studentIds: uniqueIds, all: true }),
  ]);
  assertNoError(studentResponse.error);
  const studentMap = new Map((studentResponse.data ?? []).map((student) => [student.id, student]));
  const orderedStudents = uniqueIds.flatMap((studentId) => studentMap.has(studentId) ? [studentMap.get(studentId)!] : []);
  if (!orderedStudents.length) return [];

  const { data: enrollmentRows, error: enrollmentError } = await supabaseAdmin
    .from("class_council_enrollments")
    .select("id, student_id, council_class_id, discussed, activities_status, attendance_situation, pedagogical_observation, positive_notes")
    .in("student_id", orderedStudents.map((student) => student.id));
  assertNoError(enrollmentError);
  const enrollmentClassIds = [...new Set((enrollmentRows ?? []).map((item) => item.council_class_id))];

  const classRows = enrollmentClassIds.length ? await supabaseAdmin.from("class_council_classes").select("id, council_id, display_name, official_code, grade_level, shift").in("id", enrollmentClassIds) : { data: [], error: null };
  assertNoError(classRows.error);
  const councilIds = [...new Set((classRows.data ?? []).map((item) => item.council_id))];
  const councilRows = councilIds.length ? await supabaseAdmin.from("class_councils").select("id, school_year, term, meeting_date, status, current_import_id, criteria").in("id", councilIds).not("current_import_id", "is", null).is("archived_at", null) : { data: [], error: null };
  assertNoError(councilRows.error);

  const classMap = new Map((classRows.data ?? []).map((item) => [item.id, item]));
  const councilMap = new Map((councilRows.data ?? []).map((item) => [item.id, item]));
  const candidates = (enrollmentRows ?? []).flatMap((enrollment) => {
    const councilClass = classMap.get(enrollment.council_class_id);
    const council = councilClass ? councilMap.get(councilClass.council_id) : null;
    return councilClass && council?.current_import_id ? [{ enrollment, councilClass, council, importId: council.current_import_id }] : [];
  });

  const candidateEnrollmentIds = candidates.map((item) => item.enrollment.id);
  const importIds = [...new Set(candidates.map((item) => item.importId))];
  const snapshotResponse = candidateEnrollmentIds.length && importIds.length
    ? await supabaseAdmin.from("class_council_student_snapshots").select("enrollment_id, import_id, imported_name, attendance_rate, enrollment_status, race_color, pcd_status").in("enrollment_id", candidateEnrollmentIds).in("import_id", importIds)
    : { data: [], error: null };
  assertNoError(snapshotResponse.error);
  const snapshotMap = new Map((snapshotResponse.data ?? []).map((item) => [`${item.enrollment_id}:${item.import_id}`, item]));
  const activeCandidates = candidates.flatMap((candidate) => {
    const snapshot = snapshotMap.get(`${candidate.enrollment.id}:${candidate.importId}`);
    return snapshot ? [{ ...candidate, snapshot }] : [];
  });

  const activeEnrollmentIds = activeCandidates.map((item) => item.enrollment.id);
  const activeClassIds = [...new Set(activeCandidates.map((item) => item.councilClass.id))];
  const activeImportIds = [...new Set(activeCandidates.map((item) => item.importId))];
  const [subjectResponse, resultResponse, behaviorResponse] = await Promise.all([
    activeClassIds.length ? supabaseAdmin.from("class_council_subjects").select("id, council_class_id, display_name, teacher_name").in("council_class_id", activeClassIds) : Promise.resolve({ data: [], error: null }),
    activeEnrollmentIds.length && activeImportIds.length ? supabaseAdmin.from("class_council_results").select("enrollment_id, import_id, subject_id, term, grade, grade_marker, absences").in("enrollment_id", activeEnrollmentIds).in("import_id", activeImportIds) : Promise.resolve({ data: [], error: null }),
    activeEnrollmentIds.length ? supabaseAdmin.from("class_council_behaviors").select("id, enrollment_id, category, description").in("enrollment_id", activeEnrollmentIds).order("created_at") : Promise.resolve({ data: [], error: null }),
  ]);
  for (const response of [subjectResponse, resultResponse, behaviorResponse]) assertNoError(response.error);

  const subjectMap = new Map((subjectResponse.data ?? []).map((item) => [item.id, item]));
  const resultsByEnrollmentImport = new Map<string, typeof resultResponse.data>();
  for (const result of resultResponse.data ?? []) {
    const key = `${result.enrollment_id}:${result.import_id}`;
    const current = resultsByEnrollmentImport.get(key) ?? [];
    current.push(result);
    resultsByEnrollmentImport.set(key, current);
  }
  const behaviorsByEnrollment = new Map<string, typeof behaviorResponse.data>();
  for (const behavior of behaviorResponse.data ?? []) {
    const current = behaviorsByEnrollment.get(behavior.enrollment_id) ?? [];
    current.push(behavior);
    behaviorsByEnrollment.set(behavior.enrollment_id, current);
  }
  const interventionsByStudent = new Map<string, StudentProfileData["interventions"]>();
  for (const intervention of interventionReport.items) {
    if (!intervention.student || !uniqueIds.includes(intervention.student.id)) continue;
    const current = interventionsByStudent.get(intervention.student.id) ?? [];
    current.push(intervention);
    interventionsByStudent.set(intervention.student.id, current);
  }

  return orderedStudents.map((student) => {
    const studentInterventions = interventionsByStudent.get(student.id) ?? [];
    const occurrences = occurrenceMap.get(student.id) ?? [];
    const history: StudentCouncilHistoryItem[] = activeCandidates.filter((candidate) => candidate.enrollment.student_id === student.id).map(({ enrollment, councilClass, council, importId, snapshot }) => {
      const gradeLevel: 1 | 2 | 3 | null = councilClass.grade_level === 1 || councilClass.grade_level === 2 || councilClass.grade_level === 3 ? councilClass.grade_level : null;
      const attendanceRate = numberOrNull(snapshot.attendance_rate);
      const results = (resultsByEnrollmentImport.get(`${enrollment.id}:${importId}`) ?? []).filter((item) => item.term <= council.term).map((item) => ({ subjectId: item.subject_id, subjectName: subjectMap.get(item.subject_id)?.display_name ?? "Disciplina", teacherName: subjectMap.get(item.subject_id)?.teacher_name ?? null, term: item.term, grade: numberOrNull(item.grade), gradeMarker: item.grade_marker, absences: item.absences })).sort((a, b) => a.subjectName.localeCompare(b.subjectName, "pt-BR") || a.term - b.term);
      const criteria = resolveCouncilCriteria(council.criteria);
      const alerts = calculateStudentAlerts({ name: snapshot.imported_name || student.canonical_name, attendanceRate, gradeLevel, results: results.map((item) => ({ term: item.term, grade: item.grade, gradeMarker: item.gradeMarker, subjectId: item.subjectId, subjectName: item.subjectName })) }, council.term, criteria);
      const projection = projectStudentFlow({ id: enrollment.id, gradeLevel, enrollmentStatus: snapshot.enrollment_status, attendanceSituation: enrollment.attendance_situation as AttendanceSituation, attendanceRate, alerts }, { partialProgressionLimit: criteria.partialProgressionLimit, attendanceRetentionThreshold: criteria.attendanceRetentionThreshold });
      return {
        council: { id: council.id, schoolYear: council.school_year, term: council.term, meetingDate: council.meeting_date, status: council.status },
        class: { id: councilClass.id, name: councilClass.display_name, officialCode: councilClass.official_code, gradeLevel, shift: councilClass.shift },
        enrollment: { id: enrollment.id, discussed: enrollment.discussed, activitiesStatus: enrollment.activities_status as ActivitiesStatus, attendanceSituation: enrollment.attendance_situation as AttendanceSituation, pedagogicalObservation: enrollment.pedagogical_observation, positiveNotes: enrollment.positive_notes },
        snapshot: { importedName: snapshot.imported_name, attendanceRate, enrollmentStatus: snapshot.enrollment_status, raceColor: snapshot.race_color, pcdStatus: snapshot.pcd_status },
        alerts,
        projection,
        results,
        behaviors: (behaviorsByEnrollment.get(enrollment.id) ?? []).map((item) => ({ id: item.id, category: item.category as BehaviorCategory, description: item.description })),
        interventions: studentInterventions.filter((item) => item.origin?.councilId === council.id).map((item) => ({ id: item.id, description: item.description, responsibleName: item.responsibleName, dueDate: item.dueDate, status: item.status, outcome: item.outcome, cancellationReason: item.cancellationReason })),
      };
    }).sort((a, b) => b.council.schoolYear - a.council.schoolYear || b.council.term - a.council.term || b.council.meetingDate.localeCompare(a.council.meetingDate));
    return buildProfile(student, history, studentInterventions, occurrences);
  });
}

function buildProfile(student: { id: string; canonical_name: string; enrollment_number: string; current_situation: string; situation_updated_at: string | null }, history: StudentCouncilHistoryItem[], interventions: StudentProfileData["interventions"], occurrences: StudentProfileData["occurrences"]): StudentProfileData {
  return {
    student: { id: student.id, name: student.canonical_name, enrollmentNumber: student.enrollment_number, currentSituation: student.current_situation as AttendanceSituation, situationUpdatedAt: student.situation_updated_at },
    latest: history[0] ?? null,
    history,
    interventions,
    occurrences,
    summary: { councils: history.length, behaviorRecords: history.reduce((total, item) => total + item.behaviors.length, 0), interventions: interventions.length, openInterventions: interventions.filter((item) => item.status === "pending" || item.status === "in_progress").length, occurrences: occurrences.length },
  };
}
