import { describe, expect, it } from "vitest";
import { calculateStudentAlerts, compareStudentReportOrder } from "./calculateAlerts";

const input = (grades: Array<[number, number | null]>, attendanceRate: number | null = 90) => ({
  name: "Estudante",
  attendanceRate,
  results: grades.map(([term, grade]) => ({ term, grade })),
});

describe("regras de alertas do conselho", () => {
  it("gera alerta acadêmico com exatamente quatro notas abaixo de 6", () => {
    const alerts = calculateStudentAlerts(input([[2, 5.9], [2, 5], [2, 0], [2, 4], [2, 6], [2, null]]), 2);
    expect(alerts.academicAlert).toBe(true);
    expect(alerts.atRisk).toBe(true);
    expect(alerts.currentLowGradeCount).toBe(4);
    expect(alerts.reasons).toContain("4 disciplinas com nota abaixo de 6,0");
  });

  it("não trata marcadores/ausências como zero", () => {
    const alerts = calculateStudentAlerts(input([[2, null], [2, null], [2, 6]]), 2);
    expect(alerts.currentLowGradeCount).toBe(0);
    expect(alerts.academicAlert).toBe(false);
  });

  it("não alerta em 80% e alerta abaixo de 80%", () => {
    expect(calculateStudentAlerts(input([], 80), 2).lowAttendance).toBe(false);
    const alerts = calculateStudentAlerts(input([], 79.99), 2);
    expect(alerts.lowAttendance).toBe(true);
    expect(alerts.atRisk).toBe(true);
    expect(alerts.reasons).toContain("Frequência anual de 79,99% (abaixo de 80%)");
  });

  it.each([
    [2, 4, "worsened"],
    [4, 2, "improved"],
    [3, 3, "stable"],
  ] as const)("classifica evolução %s → %s como %s", (before, current, expected) => {
    const grades: Array<[number, number]> = [];
    for (let index = 0; index < before; index += 1) grades.push([1, 5]);
    for (let index = 0; index < current; index += 1) grades.push([2, 5]);
    expect(calculateStudentAlerts(input(grades), 2).evolution).toBe(expected);
  });

  it("deixa evolução indisponível sem bimestre anterior", () => {
    expect(calculateStudentAlerts(input([[2, 5]]), 2).evolution).toBe("unavailable");
  });

  it("não transforma uma piora isolada em risco ou motivo de risco", () => {
    const alerts = calculateStudentAlerts(input([[1, 5], [2, 5], [2, 5]]), 2);
    expect(alerts.evolution).toBe("worsened");
    expect(alerts.academicAlert).toBe(false);
    expect(alerts.lowAttendance).toBe(false);
    expect(alerts.atRisk).toBe(false);
    expect(alerts.reasons).toEqual([]);
  });

  it("não repete a quantidade atual ao explicar piora de quem já tem alerta acadêmico", () => {
    const alerts = calculateStudentAlerts(input([[1, 5], [1, 5], [2, 5], [2, 5], [2, 5], [2, 5]]), 2);
    expect(alerts.reasons).toEqual([
      "4 disciplinas com nota abaixo de 6,0",
      "Piora: eram 2 disciplinas com nota abaixo de 6,0 no bimestre anterior disponível",
    ]);
  });

  it("respeita os critérios persistidos no conselho", () => {
    const alerts = calculateStudentAlerts(input([[2, 6.4], [2, 6.2]], 84), 2, {
      lowGradeThreshold: 6.5,
      lowGradeSubjectAlertCount: 2,
      lowAttendanceThreshold: 85,
    });
    expect(alerts.academicAlert).toBe(true);
    expect(alerts.lowAttendance).toBe(true);
    expect(alerts.reasons).toContain("2 disciplinas com nota abaixo de 6,5");
    expect(alerts.reasons).toContain("Frequência anual de 84% (abaixo de 85%)");
  });
});

describe("ordem original do relatório", () => {
  it("prioriza a posição importada e deixa estudantes sem posição ao final", () => {
    const students = [
      { name: "Aluno C", reportPosition: null },
      { name: "Aluno B", reportPosition: 1 },
      { name: "Aluno A", reportPosition: 0 },
    ];

    expect(students.sort(compareStudentReportOrder).map((item) => item.name)).toEqual(["Aluno A", "Aluno B", "Aluno C"]);
  });
});
