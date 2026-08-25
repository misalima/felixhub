import { describe, expect, it } from "vitest";
import { filterDashboardStudents } from "@/lib/dashboard/studentFilters";
import type { StudentAlerts } from "@/types/class-council";
import type { DashboardStudent } from "@/types/dashboard";

const baseAlerts: StudentAlerts = {
  currentLowGradeCount: 0,
  previousLowGradeCount: null,
  academicAlert: false,
  academicRisk: false,
  academicStatus: "normal",
  lowAttendance: false,
  attendanceRisk: false,
  attendanceStatus: "normal",
  atRisk: false,
  priorityCombined: false,
  offPaceSubjectCount: 0,
  pressureSubjectCount: 0,
  criticalSubjectCount: 0,
  missingGradeCount: 0,
  specialResultCount: 0,
  subjectDetails: [],
  evolution: "unavailable",
  reasons: [],
};

function student(overrides: Partial<DashboardStudent> & Pick<DashboardStudent, "studentId" | "name">): DashboardStudent {
  return {
    enrollmentId: overrides.studentId,
    enrollmentNumber: "100",
    classId: "class-1",
    className: "1ª A",
    gradeLevel: 1,
    attendanceRate: 90,
    enrollmentStatus: null,
    attendanceSituation: "regular",
    pendingInterventions: 0,
    occurrences: { count: 0, latest: null },
    projectedFlowStatus: "projected_approved",
    projectedFailedSubjects: 0,
    projectedConclusion: null,
    alerts: baseAlerts,
    ...overrides,
  } as DashboardStudent;
}

describe("filterDashboardStudents", () => {
  const students = [
    student({ studentId: "1", name: "Álvaro Lima", pendingInterventions: 2 }),
    student({ studentId: "2", name: "Beatriz Souza", alerts: { ...baseAlerts, academicStatus: "monitoring" } }),
    student({ studentId: "3", name: "Carlos Santos", gradeLevel: 2, alerts: { ...baseAlerts, academicStatus: "retention_risk", academicRisk: true, subjectDetails: [{ subjectId: "math", subjectName: "Matemática", accumulatedPoints: 5, expectedPoints: 12, requiredAverage: 7, missingGradeCount: 0, specialResultCount: 0, incomplete: false, notAssessed: false, offPace: true, underPressure: false, critical: false }] } }),
  ];

  it("filtra métricas operacionais", () => {
    expect(filterDashboardStudents(students, { metric: "pendingInterventions" }).map((item) => item.studentId)).toEqual(["1"]);
    expect(filterDashboardStudents(students, { metric: "monitoring" }).map((item) => item.studentId)).toEqual(["2"]);
  });

  it("combina série e disciplina na célula da matriz", () => {
    expect(filterDashboardStudents(students, { gradeLevel: 2, subjectIds: ["math"] }).map((item) => item.studentId)).toEqual(["3"]);
    expect(filterDashboardStudents(students, { gradeLevel: 1, subjectIds: ["math"] })).toEqual([]);
  });

  it("pesquisa sem diferenciar acentos", () => {
    expect(filterDashboardStudents(students, { search: "alvaro" }).map((item) => item.studentId)).toEqual(["1"]);
  });
});
