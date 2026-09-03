import { COUNCIL_CRITERIA, type CouncilCriteria } from "./constants";
import { isMissingGradeResult, isNotAssessedGradeMarker, isSpecialGradeResult } from "./gradeResults";
import type { StudentAlertInput, StudentAlerts, SubjectRiskDetail } from "@/types/class-council";

const SCHOOL_TERMS = 4;

export function countLowGrades(input: StudentAlertInput, term: number, criteria: CouncilCriteria = COUNCIL_CRITERIA): number {
  return input.results.reduce(
    (total, result) => total + (result.term === term && typeof result.grade === "number" && result.grade < criteria.lowGradeThreshold ? 1 : 0),
    0,
  );
}

function legacyAlerts(input: StudentAlertInput, currentTerm: number, criteria: CouncilCriteria): StudentAlerts {
  const currentLowGradeCount = countLowGrades(input, currentTerm, criteria);
  const previousTerms = [...new Set(input.results.filter((result) => result.term < currentTerm).map((result) => result.term))].sort((a, b) => b - a);
  const previousLowGradeCount = previousTerms.length ? countLowGrades(input, previousTerms[0], criteria) : null;
  const academicAlert = currentLowGradeCount >= criteria.lowGradeSubjectAlertCount;
  const lowAttendance = typeof input.attendanceRate === "number" && input.attendanceRate < criteria.lowAttendanceThreshold;
  const atRisk = academicAlert || lowAttendance;
  const evolution = compareEvolution(currentLowGradeCount, previousLowGradeCount);
  const reasons: string[] = [];
  const formattedThreshold = formatNumber(criteria.lowGradeThreshold, 1);
  if (academicAlert) reasons.push(`${currentLowGradeCount} disciplinas com nota abaixo de ${formattedThreshold}`);
  if (lowAttendance) reasons.push(`Frequência anual de ${formatNumber(input.attendanceRate!)}% (abaixo de ${formatNumber(criteria.lowAttendanceThreshold)}%)`);
  return {
    currentLowGradeCount,
    previousLowGradeCount,
    academicAlert,
    academicRisk: academicAlert,
    academicStatus: academicAlert ? (input.gradeLevel === 3 ? "completion_risk" : "retention_risk") : "normal",
    lowAttendance,
    attendanceRisk: lowAttendance,
    attendanceStatus: lowAttendance ? "risk" : typeof input.attendanceRate === "number" ? "normal" : "unknown",
    atRisk,
    priorityCombined: academicAlert && lowAttendance,
    offPaceSubjectCount: currentLowGradeCount,
    pressureSubjectCount: currentLowGradeCount,
    criticalSubjectCount: 0,
    missingGradeCount: input.results.filter((result) => result.term <= currentTerm && isMissingGradeResult(result)).length,
    specialResultCount: input.results.filter((result) => result.term <= currentTerm && isSpecialGradeResult(result)).length,
    subjectDetails: [],
    evolution,
    reasons,
  };
}

function subjectGroups(input: StudentAlertInput) {
  const groups = new Map<string, typeof input.results>();
  input.results.forEach((result, index) => {
    const key = result.subjectId ?? result.subjectKey ?? result.subjectName ?? `result-${index}`;
    const group = groups.get(key) ?? [];
    group.push(result);
    groups.set(key, group);
  });
  return groups;
}

function buildSubjectDetails(input: StudentAlertInput, term: number, criteria: CouncilCriteria): SubjectRiskDetail[] {
  return [...subjectGroups(input)].map(([subjectId, results]) => {
    const throughTerm = results.filter((result) => result.term <= term);
    const byTerm = new Map(throughTerm.map((result) => [result.term, result]));
    let accumulatedPoints = 0;
    let missingGradeCount = 0;
    let specialResultCount = 0;
    let notAssessedResultCount = 0;
    for (let current = 1; current <= term; current += 1) {
      const result = byTerm.get(current);
      if (typeof result?.grade === "number") accumulatedPoints += result.grade;
      else if (result && isSpecialGradeResult(result)) {
        specialResultCount += 1;
        if (isNotAssessedGradeMarker(result.gradeMarker)) notAssessedResultCount += 1;
      }
      else missingGradeCount += 1;
    }
    const notAssessed = term > 0 && notAssessedResultCount === term;
    const incomplete = !notAssessed && (missingGradeCount > 0 || specialResultCount > 0);
    const expectedPoints = criteria.termExpectedPoints * term;
    const remainingTerms = SCHOOL_TERMS - term;
    const requiredAverage = notAssessed || incomplete || remainingTerms === 0
      ? null
      : Math.max(0, (criteria.annualRequiredPoints - accumulatedPoints) / remainingTerms);
    const failedAtClosing = term === SCHOOL_TERMS && accumulatedPoints < criteria.annualRequiredPoints;
    return {
      subjectId,
      subjectName: throughTerm.find((result) => result.subjectName)?.subjectName ?? subjectId,
      accumulatedPoints: round(accumulatedPoints),
      expectedPoints: round(expectedPoints),
      requiredAverage: requiredAverage === null ? null : round(requiredAverage),
      incomplete,
      missingGradeCount,
      specialResultCount,
      notAssessed,
      offPace: !notAssessed && !incomplete && accumulatedPoints < expectedPoints,
      underPressure: !notAssessed && !incomplete && (failedAtClosing || (requiredAverage !== null && requiredAverage > criteria.pressureRequiredAverage)),
      critical: !notAssessed && !incomplete && (failedAtClosing || (requiredAverage !== null && requiredAverage > criteria.criticalRequiredAverage)),
    };
  });
}

function classifyAcademic(
  gradeLevel: 1 | 2 | 3 | null | undefined,
  currentTerm: number,
  offPaceCount: number,
  pressureCount: number,
  criticalCount: number,
  criteria: CouncilCriteria,
): StudentAlerts["academicStatus"] {
  if (gradeLevel === 3) {
    if (currentTerm === SCHOOL_TERMS && offPaceCount > 0) return "completion_risk";
    if (pressureCount >= 4 || criticalCount >= 3) return "completion_risk";
    if (offPaceCount >= criteria.grade3AttentionCount) return "monitoring";
    return "normal";
  }
  if (currentTerm === SCHOOL_TERMS && offPaceCount > criteria.partialProgressionLimit) return "retention_risk";
  if (currentTerm < SCHOOL_TERMS && pressureCount > criteria.partialProgressionLimit) return "retention_risk";
  if (offPaceCount >= criteria.grade12AttentionCount) return "monitoring";
  return "normal";
}

function compareEvolution(current: number, previous: number | null): StudentAlerts["evolution"] {
  if (previous === null) return "unavailable";
  if (current > previous) return "worsened";
  if (current < previous) return "improved";
  return "stable";
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatNumber(value: number, minimumFractionDigits = 0): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits, maximumFractionDigits: 2 });
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function calculateStudentAlerts(input: StudentAlertInput, currentTerm: number, criteria: CouncilCriteria = COUNCIL_CRITERIA): StudentAlerts {
  if (criteria.riskModelVersion === 1) return legacyAlerts(input, currentTerm, criteria);

  const subjectDetails = buildSubjectDetails(input, currentTerm, criteria);
  const previousDetails = currentTerm > 1 ? buildSubjectDetails(input, currentTerm - 1, criteria) : null;
  const offPaceSubjectCount = subjectDetails.filter((detail) => detail.offPace).length;
  const pressureSubjectCount = subjectDetails.filter((detail) => detail.underPressure).length;
  const criticalSubjectCount = subjectDetails.filter((detail) => detail.critical).length;
  const previousLowGradeCount = previousDetails ? previousDetails.filter((detail) => detail.offPace).length : null;
  const academicStatus = classifyAcademic(input.gradeLevel, currentTerm, offPaceSubjectCount, pressureSubjectCount, criticalSubjectCount, criteria);
  const academicAlert = academicStatus !== "normal";
  const academicRisk = academicStatus === "retention_risk" || academicStatus === "completion_risk";
  const attendanceStatus: StudentAlerts["attendanceStatus"] = typeof input.attendanceRate !== "number"
    ? "unknown"
    : input.attendanceRate < criteria.attendanceRetentionThreshold
      ? "risk"
      : input.attendanceRate < criteria.attendanceAttentionThreshold
        ? "attention"
        : "normal";
  const lowAttendance = attendanceStatus === "attention" || attendanceStatus === "risk";
  const attendanceRisk = attendanceStatus === "risk";
  const missingGradeCount = subjectDetails.reduce((total, detail) => total + detail.missingGradeCount, 0);
  const specialResultCount = subjectDetails.reduce((total, detail) => total + detail.specialResultCount, 0);
  const evolution = compareEvolution(offPaceSubjectCount, previousLowGradeCount);
  const reasons: string[] = [];

  if (academicStatus === "monitoring") {
    reasons.push(`${plural(offPaceSubjectCount, "disciplina fora", "disciplinas fora")} do ritmo esperado`);
  } else if (academicStatus === "retention_risk") {
    reasons.push(`${plural(pressureSubjectCount, "disciplina exige", "disciplinas exigem")} média superior a ${formatNumber(criteria.pressureRequiredAverage)}`);
  } else if (academicStatus === "completion_risk") {
    reasons.push(currentTerm === SCHOOL_TERMS
      ? plural(offPaceSubjectCount, "disciplina ainda não foi integralizada", "disciplinas ainda não foram integralizadas")
      : `${plural(pressureSubjectCount, "disciplina sob pressão", "disciplinas sob pressão")} para conclusão`);
  }
  if (criticalSubjectCount > 0) reasons.push(`${plural(criticalSubjectCount, "disciplina crítica", "disciplinas críticas")} no ritmo atual`);
  if (attendanceStatus === "attention") reasons.push(`Frequência de ${formatNumber(input.attendanceRate!)}%: atenção preventiva`);
  if (attendanceStatus === "risk") reasons.push(`Frequência de ${formatNumber(input.attendanceRate!)}%: abaixo do limite de ${formatNumber(criteria.attendanceRetentionThreshold)}%`);
  if (missingGradeCount > 0) reasons.push(`${plural(missingGradeCount, "nota pendente", "notas pendentes")} — não contabilizada como zero`);
  if (specialResultCount > 0) reasons.push(`${plural(specialResultCount, "resultado especial", "resultados especiais")} — fora do cálculo acadêmico`);

  return {
    currentLowGradeCount: offPaceSubjectCount,
    previousLowGradeCount,
    academicAlert,
    academicRisk,
    academicStatus,
    lowAttendance,
    attendanceRisk,
    attendanceStatus,
    atRisk: academicRisk || attendanceRisk,
    priorityCombined: academicAlert && lowAttendance,
    offPaceSubjectCount,
    pressureSubjectCount,
    criticalSubjectCount,
    missingGradeCount,
    specialResultCount,
    subjectDetails,
    evolution,
    reasons,
  };
}

const academicPriority: Record<StudentAlerts["academicStatus"], number> = {
  normal: 0,
  monitoring: 1,
  retention_risk: 2,
  completion_risk: 2,
};

const attendancePriority: Record<StudentAlerts["attendanceStatus"], number> = {
  unknown: 0,
  normal: 0,
  attention: 1,
  risk: 2,
};

export function compareStudentPriority(
  a: { name: string; alerts: StudentAlerts },
  b: { name: string; alerts: StudentAlerts },
): number {
  const riskDifference = Number(b.alerts.atRisk) - Number(a.alerts.atRisk);
  if (riskDifference) return riskDifference;
  const academicDifference = academicPriority[b.alerts.academicStatus] - academicPriority[a.alerts.academicStatus];
  if (academicDifference) return academicDifference;
  const attendanceDifference = attendancePriority[b.alerts.attendanceStatus] - attendancePriority[a.alerts.attendanceStatus];
  if (attendanceDifference) return attendanceDifference;
  if (a.alerts.pressureSubjectCount !== b.alerts.pressureSubjectCount) return b.alerts.pressureSubjectCount - a.alerts.pressureSubjectCount;
  if (a.alerts.offPaceSubjectCount !== b.alerts.offPaceSubjectCount) return b.alerts.offPaceSubjectCount - a.alerts.offPaceSubjectCount;
  return a.name.localeCompare(b.name, "pt-BR");
}

export function compareStudentReportOrder(
  a: { name: string; reportPosition: number | null },
  b: { name: string; reportPosition: number | null },
): number {
  if (a.reportPosition !== null && b.reportPosition !== null && a.reportPosition !== b.reportPosition) return a.reportPosition - b.reportPosition;
  if (a.reportPosition !== null) return -1;
  if (b.reportPosition !== null) return 1;
  return a.name.localeCompare(b.name, "pt-BR");
}
