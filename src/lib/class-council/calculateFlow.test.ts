import { describe, expect, it } from "vitest";
import { calculateProjectedFlow, projectStudentFlow, type ProjectedFlowStudentInput } from "./calculateFlow";
import type { StudentAlerts } from "@/types/class-council";

function student(id: string, failedSubjects: number, overrides: Partial<ProjectedFlowStudentInput> = {}): ProjectedFlowStudentInput {
  const subjectDetails = Array.from({ length: 10 }, (_, index) => ({
    subjectId: `s-${index}`,
    subjectName: `Disciplina ${index}`,
    accumulatedPoints: index < failedSubjects ? 10 : 12,
    expectedPoints: 12,
    requiredAverage: index < failedSubjects ? 7 : 6,
    incomplete: false,
    missingGradeCount: 0,
    specialResultCount: 0,
    notAssessed: false,
    offPace: index < failedSubjects,
    underPressure: false,
    critical: false,
  }));
  const alerts = { subjectDetails } as StudentAlerts;
  return { id, gradeLevel: 1, enrollmentStatus: "MATRICULADO", attendanceRate: 90, alerts, ...overrides };
}

describe("projeção de fluxo", () => {
  it("projeta aprovação com até quatro pendências", () => {
    expect(projectStudentFlow(student("a", 4)).status).toBe("projected_approved");
    expect(projectStudentFlow(student("b", 5)).status).toBe("projected_retained");
  });

  it("considera frequência formal na projeção", () => {
    expect(projectStudentFlow(student("a", 0, { attendanceRate: 74.9 })).status).toBe("projected_retained");
  });

  it("separa aprovação e conclusão na 3ª série", () => {
    const withDependency = projectStudentFlow(student("a", 1, { gradeLevel: 3 }));
    const withoutDependency = projectStudentFlow(student("b", 0, { gradeLevel: 3 }));
    expect(withDependency.status).toBe("projected_approved");
    expect(withDependency.projectedConclusion).toBe(false);
    expect(withoutDependency.projectedConclusion).toBe(true);
  });

  it("classifica abandono no denominador e exclui transferência", () => {
    expect(projectStudentFlow(student("a", 0, { enrollmentStatus: "DEIXOU DE FREQUENTAR" })).status).toBe("abandonment");
    expect(projectStudentFlow(student("b", 0, { enrollmentStatus: "TRANSFERIDO" })).status).toBe("excluded_movement");
  });

  it("prioriza desistência marcada no conselho mesmo com frequência numérica", () => {
    expect(projectStudentFlow(student("a", 0, { attendanceSituation: "dropout", attendanceRate: 98 })).status).toBe("abandonment");
  });

  it("retira estudantes transferidos do cálculo mesmo com notas ou frequência baixas", () => {
    expect(projectStudentFlow(student("a", 4, { attendanceSituation: "transferred", attendanceRate: 60 })).status).toBe("excluded_movement");
  });

  it("mantém infrequência como acompanhamento, sem retenção automática", () => {
    expect(projectStudentFlow(student("a", 0, { attendanceSituation: "infrequent", attendanceRate: 90 })).status).toBe("projected_approved");
  });

  it("projeta quando notas pendentes não podem alterar o desfecho", () => {
    const incomplete = student("a", 0);
    incomplete.alerts.subjectDetails[0].incomplete = true;
    expect(projectStudentFlow(incomplete).status).toBe("projected_approved");
  });

  it("mantém como insuficiente quando notas pendentes podem alterar o desfecho", () => {
    const ambiguous = student("a", 4);
    ambiguous.alerts.subjectDetails[4].incomplete = true;
    expect(projectStudentFlow(ambiguous).status).toBe("insufficient_data");
  });

  it("ignora componente explicitamente sem nota e exige frequência", () => {
    const withNonAssessedSubject = student("a", 0);
    withNonAssessedSubject.alerts.subjectDetails[0].incomplete = true;
    withNonAssessedSubject.alerts.subjectDetails[0].notAssessed = true;
    expect(projectStudentFlow(withNonAssessedSubject).status).toBe("projected_approved");
    expect(projectStudentFlow(student("b", 0, { attendanceRate: null })).status).toBe("insufficient_data");
  });

  it("mantém retenção certa mesmo quando há nota pendente", () => {
    const retained = student("a", 5);
    retained.alerts.subjectDetails[5].incomplete = true;
    expect(projectStudentFlow(retained).status).toBe("projected_retained");
    expect(projectStudentFlow(student("b", 0, { attendanceRate: 70 })).status).toBe("projected_retained");
  });

  it("calcula taxa sobre aprovados, retidos e abandono", () => {
    const result = calculateProjectedFlow([
      student("a", 0),
      student("b", 5),
      student("c", 0, { enrollmentStatus: "ABANDONO" }),
      student("d", 0, { enrollmentStatus: "TRANSFERIDO" }),
    ]);
    expect(result.summary.projectedApprovalRate).toBe(33.3);
    expect(result.summary.coverageRate).toBe(100);
  });
});
