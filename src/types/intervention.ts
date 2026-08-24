import type { InterventionStatus } from "@/types/class-council";

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
};

export type InterventionReportData = {
  generatedAt: string;
  items: InterventionReportItem[];
};

