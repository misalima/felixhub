import type { BehaviorCategory } from "@/types/class-council";
import type { Json } from "@/types/database.types";

export type CouncilCriteria = {
  lowGradeThreshold: number;
  lowGradeSubjectAlertCount: number;
  lowAttendanceThreshold: number;
};

export const COUNCIL_CRITERIA: CouncilCriteria = {
  lowGradeThreshold: 6,
  lowGradeSubjectAlertCount: 4,
  lowAttendanceThreshold: 80,
};

export function resolveCouncilCriteria(value: Json | null | undefined): CouncilCriteria {
  if (!value || Array.isArray(value) || typeof value !== "object") return COUNCIL_CRITERIA;
  const lowGradeThreshold = Number(value.low_grade_threshold);
  const lowGradeSubjectAlertCount = Number(value.low_grade_subject_alert_count);
  const lowAttendanceThreshold = Number(value.low_attendance_threshold);
  return {
    lowGradeThreshold: Number.isFinite(lowGradeThreshold) && lowGradeThreshold >= 0 && lowGradeThreshold <= 10 ? lowGradeThreshold : COUNCIL_CRITERIA.lowGradeThreshold,
    lowGradeSubjectAlertCount: Number.isInteger(lowGradeSubjectAlertCount) && lowGradeSubjectAlertCount > 0 ? lowGradeSubjectAlertCount : COUNCIL_CRITERIA.lowGradeSubjectAlertCount,
    lowAttendanceThreshold: Number.isFinite(lowAttendanceThreshold) && lowAttendanceThreshold >= 0 && lowAttendanceThreshold <= 100 ? lowAttendanceThreshold : COUNCIL_CRITERIA.lowAttendanceThreshold,
  };
}

export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export const IMPORT_BUCKET = "class-council-imports";
export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const RESULT_BATCH_SIZE = 500;

export const BEHAVIOR_LABELS: Record<BehaviorCategory, string> = {
  excessive_talking: "Conversas excessivas",
  inappropriate_phone_use: "Uso inadequado de celular",
  peer_conflicts: "Conflitos com colegas",
  disrespect_or_coexistence_difficulty: "Dificuldade de convivência",
  low_participation: "Baixa participação",
  recurring_lateness: "Atrasos recorrentes",
  sleeping_in_class: "Dorme durante a aula",
  frequently_out_of_class: "Falta ou permanece fora da sala",
  activities_not_completed: "Não realização de atividades",
  other: "Outro",
};
