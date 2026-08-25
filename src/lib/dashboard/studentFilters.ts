import type { DashboardStudent, DashboardStudentFilter } from "@/types/dashboard";

export type DashboardStudentFilterInput = {
  metric?: DashboardStudentFilter;
  gradeLevel?: 1 | 2 | 3;
  subjectIds?: string[];
  search?: string;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function filterDashboardStudents(students: DashboardStudent[], query: DashboardStudentFilterInput) {
  let filtered = students;
  if (query.subjectIds?.length && query.gradeLevel) {
    const subjectIds = new Set(query.subjectIds);
    filtered = filtered.filter((student) => student.gradeLevel === query.gradeLevel && student.alerts.subjectDetails.some((detail) => subjectIds.has(detail.subjectId) && detail.offPace));
  } else if (query.metric === "monitoring") filtered = filtered.filter((student) => student.alerts.academicStatus === "monitoring");
  else if (query.metric === "retentionRisk") filtered = filtered.filter((student) => student.alerts.academicStatus === "retention_risk");
  else if (query.metric === "completionRisk") filtered = filtered.filter((student) => student.alerts.academicStatus === "completion_risk");
  else if (query.metric === "lowAttendance") filtered = filtered.filter((student) => student.alerts.lowAttendance);
  else if (query.metric === "infrequent") filtered = filtered.filter((student) => student.attendanceSituation === "infrequent");
  else if (query.metric === "dropout") filtered = filtered.filter((student) => student.attendanceSituation === "dropout");
  else if (query.metric === "missingGrades") filtered = filtered.filter((student) => student.alerts.missingGradeCount > 0);
  else if (query.metric === "pendingInterventions") filtered = filtered.filter((student) => student.pendingInterventions > 0);
  else if (query.metric === "flow") filtered = filtered.filter((student) => student.projectedFlowStatus === "projected_retained" || student.projectedFlowStatus === "abandonment");

  const search = normalize(query.search ?? "");
  return search ? filtered.filter((student) => normalize(`${student.name} ${student.enrollmentNumber} ${student.className}`).includes(search)) : filtered;
}
