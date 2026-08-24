import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateStudentAlerts } from "@/lib/class-council/calculateAlerts";
import { projectStudentFlow } from "@/lib/class-council/calculateFlow";
import { resolveCouncilCriteria } from "@/lib/class-council/constants";
import { CouncilDomainError } from "@/lib/class-council/validation";
import { listStudentOccurrences } from "@/services/server/studentOccurrenceService";
import type { ActivitiesStatus, AttendanceSituation, BehaviorCategory, InterventionStatus } from "@/types/class-council";
import type { StudentCouncilHistoryItem, StudentProfileData } from "@/types/student-profile";

function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function numberOrNull(value: number | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}

export async function getStudentProfile(studentId: string): Promise<StudentProfileData> {
  const { data: student, error: studentError } = await supabaseAdmin
    .from("students")
    .select("id, canonical_name, enrollment_number, current_situation, situation_updated_at")
    .eq("id", studentId)
    .maybeSingle();
  assertNoError(studentError);
  if (!student) throw new CouncilDomainError("Estudante não encontrado.", 404, "not_found");
  const occurrencesPromise = listStudentOccurrences(studentId);

  const { data: enrollmentRows, error: enrollmentError } = await supabaseAdmin
    .from("class_council_enrollments")
    .select("id, council_class_id, discussed, activities_status, attendance_situation, pedagogical_observation, positive_notes")
    .eq("student_id", studentId);
  assertNoError(enrollmentError);

  const enrollmentClassIds = [...new Set((enrollmentRows ?? []).map((item) => item.council_class_id))];
  if (!enrollmentClassIds.length) return emptyProfile(student, await occurrencesPromise);

  const { data: classRows, error: classError } = await supabaseAdmin
    .from("class_council_classes")
    .select("id, council_id, display_name, official_code, grade_level, shift")
    .in("id", enrollmentClassIds);
  assertNoError(classError);

  const councilIds = [...new Set((classRows ?? []).map((item) => item.council_id))];
  if (!councilIds.length) return emptyProfile(student, await occurrencesPromise);

  const { data: councilRows, error: councilError } = await supabaseAdmin
    .from("class_councils")
    .select("id, school_year, term, meeting_date, status, current_import_id, criteria")
    .in("id", councilIds)
    .not("current_import_id", "is", null)
    .is("archived_at", null);
  assertNoError(councilError);

  const classMap = new Map((classRows ?? []).map((item) => [item.id, item]));
  const councilMap = new Map((councilRows ?? []).map((item) => [item.id, item]));
  const candidates = (enrollmentRows ?? []).flatMap((enrollment) => {
    const councilClass = classMap.get(enrollment.council_class_id);
    const council = councilClass ? councilMap.get(councilClass.council_id) : null;
    return councilClass && council?.current_import_id ? [{ enrollment, councilClass, council, importId: council.current_import_id }] : [];
  });
  if (!candidates.length) return emptyProfile(student, await occurrencesPromise);

  const enrollmentIds = candidates.map((item) => item.enrollment.id);
  const importIds = [...new Set(candidates.map((item) => item.importId))];
  const { data: snapshotRows, error: snapshotError } = await supabaseAdmin
    .from("class_council_student_snapshots")
    .select("enrollment_id, import_id, imported_name, attendance_rate, enrollment_status, race_color, pcd_status")
    .in("enrollment_id", enrollmentIds)
    .in("import_id", importIds);
  assertNoError(snapshotError);

  const snapshotMap = new Map((snapshotRows ?? []).map((item) => [`${item.enrollment_id}:${item.import_id}`, item]));
  const activeCandidates = candidates.flatMap((candidate) => {
    const snapshot = snapshotMap.get(`${candidate.enrollment.id}:${candidate.importId}`);
    return snapshot ? [{ ...candidate, snapshot }] : [];
  });
  if (!activeCandidates.length) return emptyProfile(student, await occurrencesPromise);

  const activeEnrollmentIds = activeCandidates.map((item) => item.enrollment.id);
  const activeClassIds = [...new Set(activeCandidates.map((item) => item.councilClass.id))];
  const activeImportIds = [...new Set(activeCandidates.map((item) => item.importId))];
  const [subjectResponse, resultResponse, behaviorResponse, interventionResponse] = await Promise.all([
    supabaseAdmin
      .from("class_council_subjects")
      .select("id, council_class_id, display_name, teacher_name")
      .in("council_class_id", activeClassIds),
    supabaseAdmin
      .from("class_council_results")
      .select("enrollment_id, import_id, subject_id, term, grade, grade_marker, absences")
      .in("enrollment_id", activeEnrollmentIds)
      .in("import_id", activeImportIds),
    supabaseAdmin
      .from("class_council_behaviors")
      .select("id, enrollment_id, category, description")
      .in("enrollment_id", activeEnrollmentIds)
      .order("created_at"),
    supabaseAdmin
      .from("class_council_interventions")
      .select("id, origin_council_id, origin_enrollment_id, description, responsible_name, due_date, status, outcome, cancellation_reason")
      .eq("target_student_id", studentId)
      .order("created_at", { ascending: false }),
  ]);
  for (const response of [subjectResponse, resultResponse, behaviorResponse, interventionResponse]) assertNoError(response.error);

  const subjectMap = new Map((subjectResponse.data ?? []).map((item) => [item.id, item]));
  const history: StudentCouncilHistoryItem[] = activeCandidates.map(({ enrollment, councilClass, council, importId, snapshot }) => {
    const gradeLevel: 1 | 2 | 3 | null = councilClass.grade_level === 1 || councilClass.grade_level === 2 || councilClass.grade_level === 3 ? councilClass.grade_level : null;
    const attendanceRate = numberOrNull(snapshot.attendance_rate);
    const results = (resultResponse.data ?? [])
      .filter((item) => item.enrollment_id === enrollment.id && item.import_id === importId && item.term <= council.term)
      .map((item) => ({
        subjectId: item.subject_id,
        subjectName: subjectMap.get(item.subject_id)?.display_name ?? "Disciplina",
        teacherName: subjectMap.get(item.subject_id)?.teacher_name ?? null,
        term: item.term,
        grade: numberOrNull(item.grade),
        gradeMarker: item.grade_marker,
        absences: item.absences,
      }))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "pt-BR") || a.term - b.term);
    const criteria = resolveCouncilCriteria(council.criteria);
    const alerts = calculateStudentAlerts({
      name: snapshot.imported_name || student.canonical_name,
      attendanceRate,
      gradeLevel,
      results: results.map((item) => ({ term: item.term, grade: item.grade, gradeMarker: item.gradeMarker, subjectId: item.subjectId, subjectName: item.subjectName })),
    }, council.term, criteria);
    const projection = projectStudentFlow({
      id: enrollment.id,
      gradeLevel,
      enrollmentStatus: snapshot.enrollment_status,
      attendanceSituation: enrollment.attendance_situation as AttendanceSituation,
      attendanceRate,
      alerts,
    }, { partialProgressionLimit: criteria.partialProgressionLimit, attendanceRetentionThreshold: criteria.attendanceRetentionThreshold });

    return {
      council: { id: council.id, schoolYear: council.school_year, term: council.term, meetingDate: council.meeting_date, status: council.status },
      class: { id: councilClass.id, name: councilClass.display_name, officialCode: councilClass.official_code, gradeLevel, shift: councilClass.shift },
      enrollment: {
        id: enrollment.id,
        discussed: enrollment.discussed,
        activitiesStatus: enrollment.activities_status as ActivitiesStatus,
        attendanceSituation: enrollment.attendance_situation as AttendanceSituation,
        pedagogicalObservation: enrollment.pedagogical_observation,
        positiveNotes: enrollment.positive_notes,
      },
      snapshot: {
        importedName: snapshot.imported_name,
        attendanceRate,
        enrollmentStatus: snapshot.enrollment_status,
        raceColor: snapshot.race_color,
        pcdStatus: snapshot.pcd_status,
      },
      alerts,
      projection,
      results,
      behaviors: (behaviorResponse.data ?? []).filter((item) => item.enrollment_id === enrollment.id).map((item) => ({ id: item.id, category: item.category as BehaviorCategory, description: item.description })),
      interventions: (interventionResponse.data ?? [])
        .filter((item) => item.origin_council_id === council.id || item.origin_enrollment_id === enrollment.id)
        .map((item) => ({ id: item.id, description: item.description, responsibleName: item.responsible_name, dueDate: item.due_date, status: item.status as InterventionStatus, outcome: item.outcome, cancellationReason: item.cancellation_reason })),
    };
  }).sort((a, b) => b.council.schoolYear - a.council.schoolYear || b.council.term - a.council.term || b.council.meetingDate.localeCompare(a.council.meetingDate));

  const allInterventionIds = new Set(history.flatMap((item) => item.interventions.map((intervention) => intervention.id)));
  const openInterventionIds = new Set(history.flatMap((item) => item.interventions.filter((intervention) => intervention.status === "pending" || intervention.status === "in_progress").map((intervention) => intervention.id)));
  const occurrences = await occurrencesPromise;
  return {
    student: { id: student.id, name: student.canonical_name, enrollmentNumber: student.enrollment_number, currentSituation: student.current_situation as AttendanceSituation, situationUpdatedAt: student.situation_updated_at },
    latest: history[0] ?? null,
    history,
    occurrences,
    summary: {
      councils: history.length,
      behaviorRecords: history.reduce((total, item) => total + item.behaviors.length, 0),
      interventions: allInterventionIds.size,
      openInterventions: openInterventionIds.size,
      occurrences: occurrences.length,
    },
  };
}

function emptyProfile(student: { id: string; canonical_name: string; enrollment_number: string; current_situation: string; situation_updated_at: string | null }, occurrences: StudentProfileData["occurrences"]): StudentProfileData {
  return {
    student: { id: student.id, name: student.canonical_name, enrollmentNumber: student.enrollment_number, currentSituation: student.current_situation as AttendanceSituation, situationUpdatedAt: student.situation_updated_at },
    latest: null,
    history: [],
    occurrences,
    summary: { councils: 0, behaviorRecords: 0, interventions: 0, openInterventions: 0, occurrences: occurrences.length },
  };
}
