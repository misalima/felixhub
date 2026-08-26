import type { AttendanceSituation, StudentAlerts } from "@/types/class-council";
import type { ProjectedFlowStatus, ProjectedFlowSummary } from "@/lib/class-council/calculateFlow";
import type { StudentOccurrenceSummary } from "@/types/student-occurrence";

export type DashboardPeriod = {
  councilId: string;
  year: number;
  term: number;
};

export type DashboardMetricSummary = {
  students: number;
  monitoring: number;
  retentionRisk: number;
  completionRisk: number;
  lowAttendance: number;
  infrequent: number;
  dropout: number;
  missingGrades: number;
  pendingInterventions: number;
};

export type DashboardMatrixCell = {
  gradeLevel: 1 | 2 | 3 | null;
  normalizedName: string;
  displayName: string;
  subjectIds: string[];
  offPace: number;
  analyzed: number;
  percentage: number;
};

export type DashboardClassSummary = {
  id: string;
  name: string;
  officialCode: string;
  gradeLevel: 1 | 2 | 3 | null;
  shift: string;
  students: number;
  monitoring: number;
  academicRisk: number;
  lowAttendance: number;
  infrequent: number;
  dropout: number;
  transferred: number;
  behaviorRecords: number;
  pendingInterventions: number;
  riskWithoutRecord: number;
};

export type DashboardQualityItem = {
  id: string;
  label: string;
  missingGrades: number;
  specialResults: number;
  missingAbsences: number;
};

export type DashboardMissingGradeDetail = {
  classId: string;
  className: string;
  classCode: string;
  subjectId: string;
  subjectName: string;
  missingGrades: number;
  byTerm: Array<{
    term: number;
    missingGrades: number;
  }>;
};

export type DashboardStudent = {
  studentId: string;
  enrollmentId: string;
  name: string;
  enrollmentNumber: string;
  classId: string;
  className: string;
  gradeLevel: 1 | 2 | 3 | null;
  attendanceRate: number | null;
  enrollmentStatus: string | null;
  attendanceSituation: AttendanceSituation;
  pendingInterventions: number;
  occurrences: StudentOccurrenceSummary;
  projectedFlowStatus: ProjectedFlowStatus;
  projectedFailedSubjects: number | null;
  projectedConclusion: boolean | null;
  alerts: StudentAlerts;
};

export type DashboardFlowBreakdown = ProjectedFlowSummary & {
  id: string;
  label: string;
};

export type PedagogicalDashboardData = {
  periods: DashboardPeriod[];
  selected: DashboardPeriod | null;
  source: null | {
    importId: string;
    version: number;
    generatedAt: string | null;
    confirmedAt: string | null;
    warningCount: number;
    policyVersion: number;
    policySource: string | null;
  };
  metrics: DashboardMetricSummary;
  matrix: DashboardMatrixCell[];
  classes: DashboardClassSummary[];
  quality: {
    missingAttendance: number;
    bySubject: DashboardQualityItem[];
    byClass: DashboardQualityItem[];
    missingGradeDetails: DashboardMissingGradeDetail[];
  };
  flow: {
    overall: ProjectedFlowSummary;
    byGrade: DashboardFlowBreakdown[];
    byClass: DashboardFlowBreakdown[];
  };
  students: DashboardStudent[];
};

export type PedagogicalDashboardOverviewData = Omit<PedagogicalDashboardData, "students">;

export type DashboardStudentFilter = "students" | "flow" | "monitoring" | "retentionRisk" | "completionRisk" | "lowAttendance" | "infrequent" | "dropout" | "missingGrades" | "pendingInterventions";

export type DashboardStudentsPage = {
  items: DashboardStudent[];
  total: number;
  nextCursor: number | null;
};
