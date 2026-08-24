import type { BehaviorCategory } from "@/types/class-council";
import type { Json } from "@/types/database.types";

export type CouncilCriteria = {
  riskModelVersion: 1 | 2;
  policyVersion: number;
  lowGradeThreshold: number;
  lowGradeSubjectAlertCount: number;
  lowAttendanceThreshold: number;
  annualRequiredPoints: number;
  termExpectedPoints: number;
  partialProgressionLimit: number;
  grade12AttentionCount: number;
  grade3AttentionCount: number;
  pressureRequiredAverage: number;
  criticalRequiredAverage: number;
  attendanceAttentionThreshold: number;
  attendanceRetentionThreshold: number;
  sourceReference: string | null;
};

export const COUNCIL_CRITERIA: CouncilCriteria = {
  riskModelVersion: 2,
  policyVersion: 1,
  lowGradeThreshold: 6,
  lowGradeSubjectAlertCount: 4,
  lowAttendanceThreshold: 80,
  annualRequiredPoints: 24,
  termExpectedPoints: 6,
  partialProgressionLimit: 4,
  grade12AttentionCount: 3,
  grade3AttentionCount: 2,
  pressureRequiredAverage: 7,
  criticalRequiredAverage: 8,
  attendanceAttentionThreshold: 80,
  attendanceRetentionThreshold: 75,
  sourceReference: "Portaria SEDUC n. 1.133/2026",
};

export function resolveCouncilCriteria(value: Json | null | undefined): CouncilCriteria {
  if (!value || Array.isArray(value) || typeof value !== "object") return COUNCIL_CRITERIA;
  const numberInRange = (key: string, fallback: number, minimum: number, maximum = Number.POSITIVE_INFINITY) => {
    const parsed = Number(value[key]);
    return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
  };
  const lowGradeThreshold = Number(value.low_grade_threshold);
  const lowGradeSubjectAlertCount = Number(value.low_grade_subject_alert_count);
  const lowAttendanceThreshold = Number(value.low_attendance_threshold);
  const riskModelVersion = Number(value.risk_model_version) === 2 ? 2 : 1;
  return {
    riskModelVersion,
    policyVersion: numberInRange("policy_version", COUNCIL_CRITERIA.policyVersion, 1),
    lowGradeThreshold: Number.isFinite(lowGradeThreshold) && lowGradeThreshold >= 0 && lowGradeThreshold <= 10 ? lowGradeThreshold : COUNCIL_CRITERIA.lowGradeThreshold,
    lowGradeSubjectAlertCount: Number.isInteger(lowGradeSubjectAlertCount) && lowGradeSubjectAlertCount > 0 ? lowGradeSubjectAlertCount : COUNCIL_CRITERIA.lowGradeSubjectAlertCount,
    lowAttendanceThreshold: Number.isFinite(lowAttendanceThreshold) && lowAttendanceThreshold >= 0 && lowAttendanceThreshold <= 100 ? lowAttendanceThreshold : COUNCIL_CRITERIA.lowAttendanceThreshold,
    annualRequiredPoints: numberInRange("annual_required_points", COUNCIL_CRITERIA.annualRequiredPoints, 1),
    termExpectedPoints: numberInRange("term_expected_points", COUNCIL_CRITERIA.termExpectedPoints, 0.01, 10),
    partialProgressionLimit: numberInRange("partial_progression_limit", COUNCIL_CRITERIA.partialProgressionLimit, 0),
    grade12AttentionCount: numberInRange("grade_1_2_attention_count", COUNCIL_CRITERIA.grade12AttentionCount, 1),
    grade3AttentionCount: numberInRange("grade_3_attention_count", COUNCIL_CRITERIA.grade3AttentionCount, 1),
    pressureRequiredAverage: numberInRange("pressure_required_average", COUNCIL_CRITERIA.pressureRequiredAverage, 0, 10),
    criticalRequiredAverage: numberInRange("critical_required_average", COUNCIL_CRITERIA.criticalRequiredAverage, 0, 10),
    attendanceAttentionThreshold: numberInRange("attendance_attention_threshold", lowAttendanceThreshold || COUNCIL_CRITERIA.attendanceAttentionThreshold, 0, 100),
    attendanceRetentionThreshold: numberInRange("attendance_retention_threshold", COUNCIL_CRITERIA.attendanceRetentionThreshold, 0, 100),
    sourceReference: typeof value.source_reference === "string" ? value.source_reference : null,
  };
}

export function councilCriteriaToJson(criteria: CouncilCriteria): Json {
  return {
    risk_model_version: criteria.riskModelVersion,
    policy_version: criteria.policyVersion,
    low_grade_threshold: criteria.lowGradeThreshold,
    low_grade_subject_alert_count: criteria.lowGradeSubjectAlertCount,
    low_attendance_threshold: criteria.lowAttendanceThreshold,
    annual_required_points: criteria.annualRequiredPoints,
    term_expected_points: criteria.termExpectedPoints,
    partial_progression_limit: criteria.partialProgressionLimit,
    grade_1_2_attention_count: criteria.grade12AttentionCount,
    grade_3_attention_count: criteria.grade3AttentionCount,
    pressure_required_average: criteria.pressureRequiredAverage,
    critical_required_average: criteria.criticalRequiredAverage,
    attendance_attention_threshold: criteria.attendanceAttentionThreshold,
    attendance_retention_threshold: criteria.attendanceRetentionThreshold,
    source_reference: criteria.sourceReference,
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
