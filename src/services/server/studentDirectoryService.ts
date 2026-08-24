import { filterActiveEnrollments } from "@/lib/class-council/activeImport";
import { collectSupabasePages } from "@/lib/class-council/pagination";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { listStudentOccurrenceSummaries } from "@/services/server/studentOccurrenceService";
import type { AttendanceSituation } from "@/types/class-council";
import type { StudentDirectoryData, StudentDirectoryItem } from "@/types/student-directory";

function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function getStudentDirectory(): Promise<StudentDirectoryData> {
  const [students, occurrenceSummaries, councilResponse] = await Promise.all([
    collectSupabasePages(async (from, to) => {
      const { data, error } = await supabaseAdmin.from("students").select("id, canonical_name, enrollment_number, current_situation").order("canonical_name").order("id").range(from, to);
      assertNoError(error);
      return data ?? [];
    }),
    listStudentOccurrenceSummaries(),
    supabaseAdmin.from("class_councils").select("id, school_year, term, current_import_id").not("current_import_id", "is", null).is("archived_at", null).order("school_year", { ascending: false }).order("term", { ascending: false }).limit(1).maybeSingle(),
  ]);
  assertNoError(councilResponse.error);
  const council = councilResponse.data;
  const emptyOccurrence = { count: 0, latest: null } as const;
  if (!council?.current_import_id) return buildDirectory(students.map((student) => ({ studentId: student.id, name: student.canonical_name, enrollmentNumber: student.enrollment_number, situation: student.current_situation as AttendanceSituation, current: null, occurrences: occurrenceSummaries.get(student.id) ?? emptyOccurrence })), null);

  const { data: classes, error: classError } = await supabaseAdmin.from("class_council_classes").select("id, display_name, grade_level").eq("council_id", council.id).order("display_name");
  assertNoError(classError);
  const classIds = (classes ?? []).map((item) => item.id);
  if (!classIds.length) return buildDirectory(students.map((student) => ({ studentId: student.id, name: student.canonical_name, enrollmentNumber: student.enrollment_number, situation: student.current_situation as AttendanceSituation, current: null, occurrences: occurrenceSummaries.get(student.id) ?? emptyOccurrence })), council);

  const [enrollments, snapshots] = await Promise.all([
    collectSupabasePages(async (from, to) => {
      const { data, error } = await supabaseAdmin.from("class_council_enrollments").select("id, student_id, council_class_id, attendance_situation").in("council_class_id", classIds).order("id").range(from, to);
      assertNoError(error);
      return data ?? [];
    }),
    collectSupabasePages(async (from, to) => {
      const { data, error } = await supabaseAdmin.from("class_council_student_snapshots").select("enrollment_id, attendance_rate, enrollment_status, imported_name").eq("import_id", council.current_import_id!).order("id").range(from, to);
      assertNoError(error);
      return data ?? [];
    }),
  ]);
  const activeEnrollments = filterActiveEnrollments(enrollments, snapshots);
  const classMap = new Map((classes ?? []).map((item) => [item.id, item]));
  const snapshotMap = new Map(snapshots.map((item) => [item.enrollment_id, item]));
  const currentByStudent = new Map(activeEnrollments.map((enrollment) => {
    const councilClass = classMap.get(enrollment.council_class_id);
    const snapshot = snapshotMap.get(enrollment.id);
    const gradeLevel: 1 | 2 | 3 | null = councilClass?.grade_level === 1 || councilClass?.grade_level === 2 || councilClass?.grade_level === 3 ? councilClass.grade_level : null;
    return [enrollment.student_id, {
      classId: enrollment.council_class_id,
      className: councilClass?.display_name ?? "Turma",
      gradeLevel,
      attendanceRate: snapshot?.attendance_rate === null || snapshot?.attendance_rate === undefined ? null : Number(snapshot.attendance_rate),
      attendanceSituation: enrollment.attendance_situation as AttendanceSituation,
      enrollmentStatus: snapshot?.enrollment_status ?? null,
    }] as const;
  }));
  return buildDirectory(students.map((student) => ({
    studentId: student.id,
    name: student.canonical_name,
    enrollmentNumber: student.enrollment_number,
    situation: student.current_situation as AttendanceSituation,
    current: currentByStudent.has(student.id) ? { ...currentByStudent.get(student.id)!, attendanceSituation: student.current_situation as AttendanceSituation } : null,
    occurrences: occurrenceSummaries.get(student.id) ?? emptyOccurrence,
  })), council);
}

function buildDirectory(students: StudentDirectoryItem[], source: { id: string; school_year: number; term: number } | null): StudentDirectoryData {
  return {
    source: source ? { councilId: source.id, schoolYear: source.school_year, term: source.term } : null,
    students,
    metrics: {
      total: students.length,
      current: students.filter((student) => student.current).length,
      infrequent: students.filter((student) => student.situation === "infrequent").length,
      dropout: students.filter((student) => student.situation === "dropout").length,
      transferred: students.filter((student) => student.situation === "transferred").length,
      withOccurrences: students.filter((student) => student.occurrences.count > 0).length,
      occurrences: students.reduce((total, student) => total + student.occurrences.count, 0),
    },
  };
}
