import type { ProjectedFlowStudent } from "@/lib/class-council/calculateFlow";
import type { ActivitiesStatus, AttendanceSituation, BehaviorCategory, InterventionStatus, StudentAlerts } from "@/types/class-council";
import type { StudentOccurrence } from "@/types/student-occurrence";

export type StudentCouncilResult = {
  subjectId: string;
  subjectName: string;
  teacherName: string | null;
  term: number;
  grade: number | null;
  gradeMarker: string | null;
  absences: number | null;
};

export type StudentCouncilHistoryItem = {
  council: {
    id: string;
    schoolYear: number;
    term: number;
    meetingDate: string;
    status: string;
  };
  class: {
    id: string;
    name: string;
    officialCode: string;
    gradeLevel: 1 | 2 | 3 | null;
    shift: string;
  };
  enrollment: {
    id: string;
    discussed: boolean;
    activitiesStatus: ActivitiesStatus;
    attendanceSituation: AttendanceSituation;
    pedagogicalObservation: string | null;
    positiveNotes: string | null;
  };
  snapshot: {
    importedName: string;
    attendanceRate: number | null;
    enrollmentStatus: string | null;
    raceColor: string | null;
    pcdStatus: string | null;
  };
  alerts: StudentAlerts;
  projection: ProjectedFlowStudent;
  results: StudentCouncilResult[];
  behaviors: Array<{
    id: string;
    category: BehaviorCategory;
    description: string | null;
  }>;
  interventions: Array<{
    id: string;
    description: string;
    responsibleName: string | null;
    dueDate: string | null;
    status: InterventionStatus;
    outcome: string | null;
    cancellationReason: string | null;
  }>;
};

export type StudentProfileData = {
  student: {
    id: string;
    name: string;
    enrollmentNumber: string;
    currentSituation: AttendanceSituation;
    situationUpdatedAt: string | null;
  };
  latest: StudentCouncilHistoryItem | null;
  history: StudentCouncilHistoryItem[];
  occurrences: StudentOccurrence[];
  summary: {
    councils: number;
    behaviorRecords: number;
    interventions: number;
    openInterventions: number;
    occurrences: number;
  };
};
