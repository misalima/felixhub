export type CouncilStatus = "draft" | "preparation" | "in_progress" | "completed" | "reopened" | "archived";
export type CouncilClassStatus = "not_started" | "in_progress" | "completed";
export type ActivitiesStatus = "not_informed" | "regular" | "irregular" | "does_not_do";
export type AttendanceSituation = "regular" | "infrequent" | "dropout" | "transferred";
export type InterventionStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type BehaviorCategory =
  | "excessive_talking"
  | "inappropriate_phone_use"
  | "peer_conflicts"
  | "disrespect_or_coexistence_difficulty"
  | "low_participation"
  | "recurring_lateness"
  | "sleeping_in_class"
  | "frequently_out_of_class"
  | "activities_not_completed"
  | "other";

export type ImportIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  classCode?: string;
  enrollmentNumber?: string;
  row?: number;
  column?: number;
};

export type ParsedResult = {
  subjectKey: string;
  term: number;
  grade: number | null;
  gradeMarker: string | null;
  absences: number | null;
};

export type ParsedStudent = {
  enrollmentNumber: string;
  name: string;
  raceColor: string | null;
  pcdStatus: string | null;
  enrollmentStatus: string | null;
  attendanceRate: number | null;
  results: ParsedResult[];
};

export type ParsedSubject = {
  key: string;
  displayName: string;
  gradeColumn: number;
  absenceColumn: number;
};

export type ParsedClass = {
  officialCode: string;
  displayName: string;
  displayNameNeedsConfirmation: boolean;
  gradeLabel: string;
  gradeLevel: 1 | 2 | 3 | null;
  shift: "morning" | "afternoon" | "evening";
  offering: "regular";
  subjects: ParsedSubject[];
  students: ParsedStudent[];
};

export type ImportSummary = {
  classCount: number;
  studentCount: number;
  subjectCount: number;
  resultCount: number;
  numericGradeCount: number;
  markerCount: number;
  absenceCount: number;
  blockingErrorCount: number;
  warningCount: number;
};

export type ParsedPerformanceReport = {
  metadata: {
    generatedAt: string | null;
    detectedSchoolYear: number | null;
    worksheetNames: string[];
  };
  classes: ParsedClass[];
  issues: ImportIssue[];
  summary: ImportSummary;
};

export type ImportComparisonCategory =
  | "classes_added"
  | "classes_removed"
  | "students_added"
  | "students_removed"
  | "students_moved"
  | "student_names_changed"
  | "enrollment_statuses_changed"
  | "attendance_changed"
  | "subjects_added"
  | "subjects_removed"
  | "grades_changed"
  | "absences_changed";

export type ImportComparisonGroup = {
  category: ImportComparisonCategory;
  label: string;
  count: number;
  examples: string[];
};

export type ImportComparison = {
  previousImportId: string;
  previousVersion: number;
  totalChanges: number;
  groups: ImportComparisonGroup[];
};

export type StudentAlertInput = {
  name: string;
  attendanceRate: number | null;
  gradeLevel?: 1 | 2 | 3 | null;
  results: Array<{
    term: number;
    grade: number | null;
    gradeMarker?: string | null;
    subjectId?: string;
    subjectKey?: string;
    subjectName?: string;
  }>;
};

export type AcademicRiskStatus = "normal" | "monitoring" | "retention_risk" | "completion_risk";
export type AttendanceRiskStatus = "normal" | "attention" | "risk" | "unknown";

export type SubjectRiskDetail = {
  subjectId: string;
  subjectName: string;
  accumulatedPoints: number;
  expectedPoints: number;
  requiredAverage: number | null;
  incomplete: boolean;
  missingGradeCount: number;
  specialResultCount: number;
  notAssessed: boolean;
  offPace: boolean;
  underPressure: boolean;
  critical: boolean;
};

export type StudentAlerts = {
  currentLowGradeCount: number;
  previousLowGradeCount: number | null;
  academicAlert: boolean;
  academicRisk: boolean;
  academicStatus: AcademicRiskStatus;
  lowAttendance: boolean;
  attendanceRisk: boolean;
  attendanceStatus: AttendanceRiskStatus;
  atRisk: boolean;
  priorityCombined: boolean;
  offPaceSubjectCount: number;
  pressureSubjectCount: number;
  criticalSubjectCount: number;
  missingGradeCount: number;
  specialResultCount: number;
  subjectDetails: SubjectRiskDetail[];
  evolution: "improved" | "stable" | "worsened" | "unavailable";
  reasons: string[];
};

export type ImportPreviewResponse = {
  importId: string;
  version: number;
  fileSha256: string;
  summary: ImportSummary;
  issues: ImportIssue[];
  comparison: ImportComparison | null;
  classes: Array<{
    officialCode: string;
    displayName: string;
    displayNameNeedsConfirmation: boolean;
    studentCount: number;
    subjectCount: number;
  }>;
};

export type Result = { subject_id: string; subjectName: string; term: number; grade: number | null; grade_marker: string | null; absences: number | null };
export type SubjectResultSummary = { subjectId: string; subjectName: string; result: Result | undefined };
export type Behavior = { category: BehaviorCategory; description: string | null };
export type Intervention = { id: string; description: string; responsible_name: string | null; due_date: string | null; status: InterventionStatus; outcome: string | null; cancellation_reason: string | null; optimistic?: boolean };
export type InterventionPatch = { status?: InterventionStatus; outcome?: string; cancellationReason?: string; responsibleName?: string; dueDate?: string };
export type Student = { enrollmentId: string; studentId: string; enrollmentNumber: string; reportPosition: number | null; name: string; isPcd: boolean; raceColor: string | null; attendanceRate: number | null; enrollmentStatus: string | null; discussed: boolean; activitiesStatus: ActivitiesStatus; attendanceSituation: AttendanceSituation; pedagogicalObservation: string | null; positiveNotes: string | null; alerts: StudentAlerts; results: Result[]; behaviors: Behavior[]; interventions: Intervention[] };
export type ClassWorkspaceData = {
  council: { id: string; term: number; status: string; school_year: number; meeting_date: string; offering: string };
  class: { id: string; display_name: string; official_code: string; status: string; class_strengths: string | null; general_difficulties: string | null; behavior_and_coexistence: string | null; learning_aspects: string | null; collective_strategies: string | null };
  nextClass: { id: string; display_name: string; status: string } | null;
  readOnly: boolean;
  subjects: Array<{ id: string; display_name: string; teacher_name: string | null }>;
  participants: Array<{ id: string; name: string; role_or_subject: string | null }>;
  classInterventions: Intervention[];
  students: Student[];
  visualizations: { distribution: Array<{ count: number; students: number }>; evolution: Record<"improved" | "stable" | "worsened" | "unavailable", number> };
};
