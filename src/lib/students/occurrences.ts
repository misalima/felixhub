import type { StudentOccurrenceCategory } from "@/types/student-occurrence";

export const STUDENT_OCCURRENCE_CATEGORIES: StudentOccurrenceCategory[] = [
  "removed_from_classroom",
  "inappropriate_phone_use",
  "unjustified_class_absence",
  "disrespect_staff",
  "violence_threat_or_bullying",
  "other",
];

export const STUDENT_OCCURRENCE_LABELS: Record<StudentOccurrenceCategory, string> = {
  removed_from_classroom: "Retirada da sala de aula",
  inappropriate_phone_use: "Uso indevido de celular",
  unjustified_class_absence: "Ausência injustificada durante a aula",
  disrespect_staff: "Desrespeito a professor ou funcionário",
  violence_threat_or_bullying: "Violência, ameaça ou bullying",
  other: "Outra ocorrência",
};
