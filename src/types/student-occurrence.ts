export type StudentOccurrenceCategory =
  | "removed_from_classroom"
  | "inappropriate_phone_use"
  | "unjustified_class_absence"
  | "disrespect_staff"
  | "violence_threat_or_bullying"
  | "other";

export type SchoolOccurrenceTargetType = "student" | "collective" | "class";

export type OccurrenceParticipant = {
  studentId: string;
  name: string;
  enrollmentNumber: string;
  classOfficialCode: string | null;
  className: string | null;
};

export type StudentOccurrence = {
  id: string;
  targetType: SchoolOccurrenceTargetType;
  studentId: string | null;
  studentName: string | null;
  enrollmentNumber: string | null;
  schoolYear: number;
  classOfficialCode: string | null;
  className: string | null;
  occurredOn: string;
  category: StudentOccurrenceCategory;
  notes: string | null;
  guardianNotified: boolean;
  createdAt: string;
  createdByName: string | null;
  participants: OccurrenceParticipant[];
};

export type OccurrenceListData = {
  items: StudentOccurrence[];
  total: number;
  nextCursor: number | null;
};

export type OccurrenceContext = {
  availableYears: number[];
  schoolYear: number;
  source: null | { councilId: string; term: number };
  classes: Array<{
    officialCode: string;
    name: string;
    students: Array<{ id: string; name: string; enrollmentNumber: string }>;
  }>;
};

export type ClassCouncilOccurrences = {
  schoolYear: number;
  classStudentIds: string[];
  classOccurrences: StudentOccurrence[];
  studentOccurrences: StudentOccurrence[];
  total: number;
};

export type StudentOccurrenceSummary = {
  count: number;
  latest: null | {
    occurredOn: string;
    category: StudentOccurrenceCategory;
  };
};
