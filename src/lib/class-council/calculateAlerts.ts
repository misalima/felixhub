import { COUNCIL_CRITERIA, type CouncilCriteria } from "./constants";
import type { StudentAlertInput, StudentAlerts } from "@/types/class-council";

export function countLowGrades(input: StudentAlertInput, term: number, criteria: CouncilCriteria = COUNCIL_CRITERIA): number {
  return input.results.reduce(
    (total, result) => total + (result.term === term && typeof result.grade === "number" && result.grade < criteria.lowGradeThreshold ? 1 : 0),
    0,
  );
}

export function calculateStudentAlerts(input: StudentAlertInput, currentTerm: number, criteria: CouncilCriteria = COUNCIL_CRITERIA): StudentAlerts {
  const currentLowGradeCount = countLowGrades(input, currentTerm, criteria);
  const previousTerms = [...new Set(input.results.filter((result) => result.term < currentTerm).map((result) => result.term))].sort((a, b) => b - a);
  const previousLowGradeCount = previousTerms.length ? countLowGrades(input, previousTerms[0], criteria) : null;
  const academicAlert = currentLowGradeCount >= criteria.lowGradeSubjectAlertCount;
  const lowAttendance = typeof input.attendanceRate === "number" && input.attendanceRate < criteria.lowAttendanceThreshold;
  const atRisk = academicAlert || lowAttendance;
  const evolution = previousLowGradeCount === null
    ? "unavailable"
    : currentLowGradeCount > previousLowGradeCount
      ? "worsened"
      : currentLowGradeCount < previousLowGradeCount
        ? "improved"
        : "stable";
  const reasons: string[] = [];
  const formattedGradeThreshold = criteria.lowGradeThreshold.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  const lowGradeReason = (count: number) => `${count} ${count === 1 ? "disciplina" : "disciplinas"} com nota abaixo de ${formattedGradeThreshold}`;
  if (academicAlert) reasons.push(lowGradeReason(currentLowGradeCount));
  if (lowAttendance) reasons.push(`Frequência anual de ${input.attendanceRate!.toLocaleString("pt-BR")}% (abaixo de ${criteria.lowAttendanceThreshold.toLocaleString("pt-BR")}%)`);
  if (atRisk && evolution === "worsened") {
    const previousComparison = `${previousLowGradeCount === 1 ? "era" : "eram"} ${lowGradeReason(previousLowGradeCount!)} no bimestre anterior disponível`;
    reasons.push(academicAlert ? `Piora: ${previousComparison}` : `Piora: ${lowGradeReason(currentLowGradeCount)}; ${previousComparison}`);
  }
  return { currentLowGradeCount, previousLowGradeCount, academicAlert, lowAttendance, atRisk, evolution, reasons };
}

export function compareStudentPriority(
  a: { name: string; alerts: StudentAlerts },
  b: { name: string; alerts: StudentAlerts },
): number {
  const riskA = Number(a.alerts.atRisk);
  const riskB = Number(b.alerts.atRisk);
  if (riskA !== riskB) return riskB - riskA;
  const typesA = Number(a.alerts.academicAlert) + Number(a.alerts.lowAttendance);
  const typesB = Number(b.alerts.academicAlert) + Number(b.alerts.lowAttendance);
  if (typesA !== typesB) return typesB - typesA;
  if (a.alerts.currentLowGradeCount !== b.alerts.currentLowGradeCount) return b.alerts.currentLowGradeCount - a.alerts.currentLowGradeCount;
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
