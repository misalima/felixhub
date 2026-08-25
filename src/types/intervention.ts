import type { BehaviorCategory, InterventionStatus } from "@/types/class-council";

export type InterventionTargetType = "student" | "class";

export type InterventionReportItem = {
  id: string;
  targetType: InterventionTargetType;
  description: string;
  responsibleName: string | null;
  dueDate: string | null;
  status: InterventionStatus;
  outcome: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  origin: {
    councilId: string;
    schoolYear: number;
    term: number;
    meetingDate: string;
    classId: string;
    className: string;
    classCode: string;
  };
  student: null | {
    id: string;
    name: string;
    enrollmentNumber: string;
  };
  councilContext: null | {
    lowGradeCount: number;
    behaviors: Array<{
      category: BehaviorCategory;
      description: string | null;
    }>;
    pedagogicalObservation: string | null;
  };
};

export type InterventionReportData = {
  generatedAt: string;
  items: InterventionReportItem[];
  total: number;
  nextCursor: number | null;
  meta: {
    years: number[];
    effectiveYear: number | null;
    classes: Array<{ key: string; year: number; name: string; code: string }>;
    responsibles: Array<{ year: number; name: string }>;
    summary: {
      pending: number;
      inProgress: number;
      overdue: number;
      withoutResponsible: number;
      withoutDueDate: number;
    };
  };
};
