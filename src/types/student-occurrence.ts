export type StudentOccurrenceCategory =
  | "removed_from_classroom"
  | "inappropriate_phone_use"
  | "unjustified_class_absence"
  | "disrespect_staff"
  | "violence_threat_or_bullying"
  | "other";

export type StudentOccurrence = {
  id: string;
  studentId: string;
  occurredOn: string;
  category: StudentOccurrenceCategory;
  notes: string | null;
  guardianNotified: boolean;
  createdAt: string;
  createdByName: string | null;
};

export type StudentOccurrenceSummary = {
  count: number;
  latest: null | {
    occurredOn: string;
    category: StudentOccurrenceCategory;
  };
};
