import { normalizeTechnicalText } from "./normalize";
import type { AttendanceSituation, StudentAlerts } from "@/types/class-council";

export type ProjectedFlowStatus = "projected_approved" | "projected_retained" | "abandonment" | "insufficient_data" | "excluded_movement";

export type ProjectedFlowStudentInput = {
  id: string;
  gradeLevel: 1 | 2 | 3 | null;
  enrollmentStatus: string | null;
  attendanceSituation?: AttendanceSituation;
  attendanceRate: number | null;
  alerts: StudentAlerts;
};

export type ProjectedFlowStudent = {
  id: string;
  status: ProjectedFlowStatus;
  projectedFailedSubjects: number | null;
  projectedConclusion: boolean | null;
};

export type ProjectedFlowSummary = {
  total: number;
  resolved: number;
  projectedApproved: number;
  projectedRetained: number;
  abandonment: number;
  insufficientData: number;
  excludedMovement: number;
  projectedApprovalRate: number | null;
  coverageRate: number;
  thirdGradeResolved: number;
  thirdGradeProjectedConclusion: number;
  thirdGradeProjectedConclusionRate: number | null;
};

const abandonmentStatuses = ["ABANDONO", "ABANDONOU", "DEIXOU DE FREQUENTAR", "EVADIDO"];
const excludedMovementStatuses = ["TRANSFERIDO", "TRANSFERIDA", "FALECIDO", "FALECIDA", "CANCELADO", "CANCELADA"];

function matchesStatus(status: string, values: string[]) {
  return values.some((value) => status === value || status.includes(value));
}

export function projectStudentFlow(
  student: ProjectedFlowStudentInput,
  options: { partialProgressionLimit?: number; attendanceRetentionThreshold?: number } = {},
): ProjectedFlowStudent {
  const partialProgressionLimit = options.partialProgressionLimit ?? 4;
  const attendanceRetentionThreshold = options.attendanceRetentionThreshold ?? 75;
  if (student.attendanceSituation === "dropout") {
    return { id: student.id, status: "abandonment", projectedFailedSubjects: null, projectedConclusion: false };
  }
  if (student.attendanceSituation === "transferred") {
    return { id: student.id, status: "excluded_movement", projectedFailedSubjects: null, projectedConclusion: null };
  }
  const enrollmentStatus = normalizeTechnicalText(student.enrollmentStatus);
  if (matchesStatus(enrollmentStatus, abandonmentStatuses)) {
    return { id: student.id, status: "abandonment", projectedFailedSubjects: null, projectedConclusion: false };
  }
  if (matchesStatus(enrollmentStatus, excludedMovementStatuses)) {
    return { id: student.id, status: "excluded_movement", projectedFailedSubjects: null, projectedConclusion: null };
  }

  if (student.attendanceRate === null) {
    return { id: student.id, status: "insufficient_data", projectedFailedSubjects: null, projectedConclusion: null };
  }

  const projectionSubjects = student.alerts.subjectDetails.filter((subject) => !subject.notAssessed);
  const analyzedSubjects = projectionSubjects.filter((subject) => !subject.incomplete);
  const uncertainSubjectCount = projectionSubjects.length - analyzedSubjects.length;
  const projectedFailedSubjects = analyzedSubjects.filter((subject) => subject.offPace).length;
  const retainedByAttendance = student.attendanceRate < attendanceRetentionThreshold;
  const retainedByGrades = projectedFailedSubjects > partialProgressionLimit;
  if (retainedByAttendance || retainedByGrades) {
    return {
      id: student.id,
      status: "projected_retained",
      projectedFailedSubjects,
      projectedConclusion: student.gradeLevel === 3 ? false : null,
    };
  }
  if (!analyzedSubjects.length || projectedFailedSubjects + uncertainSubjectCount > partialProgressionLimit) {
    return { id: student.id, status: "insufficient_data", projectedFailedSubjects: null, projectedConclusion: null };
  }
  return {
    id: student.id,
    status: "projected_approved",
    projectedFailedSubjects,
    projectedConclusion: student.gradeLevel === 3
      ? uncertainSubjectCount > 0 ? null : projectedFailedSubjects === 0
      : null,
  };
}

function percentage(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;
}

export function calculateProjectedFlow(
  students: ProjectedFlowStudentInput[],
  options: { partialProgressionLimit?: number; attendanceRetentionThreshold?: number } = {},
) {
  const projections = students.map((student) => projectStudentFlow(student, options));
  const projectedApproved = projections.filter((item) => item.status === "projected_approved").length;
  const projectedRetained = projections.filter((item) => item.status === "projected_retained").length;
  const abandonment = projections.filter((item) => item.status === "abandonment").length;
  const insufficientData = projections.filter((item) => item.status === "insufficient_data").length;
  const excludedMovement = projections.filter((item) => item.status === "excluded_movement").length;
  const resolved = projectedApproved + projectedRetained + abandonment;
  const eligiblePopulation = students.length - excludedMovement;
  const thirdGradeIds = new Set(students.filter((student) => student.gradeLevel === 3).map((student) => student.id));
  const thirdGradeResolvedItems = projections.filter((item) => thirdGradeIds.has(item.id) && item.projectedConclusion !== null);
  const thirdGradeProjectedConclusion = thirdGradeResolvedItems.filter((item) => item.projectedConclusion === true).length;
  const summary: ProjectedFlowSummary = {
    total: students.length,
    resolved,
    projectedApproved,
    projectedRetained,
    abandonment,
    insufficientData,
    excludedMovement,
    projectedApprovalRate: percentage(projectedApproved, resolved),
    coverageRate: percentage(resolved, eligiblePopulation) ?? 0,
    thirdGradeResolved: thirdGradeResolvedItems.length,
    thirdGradeProjectedConclusion,
    thirdGradeProjectedConclusionRate: percentage(thirdGradeProjectedConclusion, thirdGradeResolvedItems.length),
  };
  return { summary, students: projections };
}
