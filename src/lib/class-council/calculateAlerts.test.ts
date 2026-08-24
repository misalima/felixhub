import { describe, expect, it } from "vitest";
import { COUNCIL_CRITERIA } from "./constants";
import { calculateStudentAlerts, compareStudentReportOrder } from "./calculateAlerts";
import type { StudentAlertInput } from "@/types/class-council";

function input(
  accumulatedGrades: Array<number | null>,
  options: { term?: number; gradeLevel?: 1 | 2 | 3; attendanceRate?: number | null; markers?: Array<string | null> } = {},
) {
  const term = options.term ?? 2;
  const results: StudentAlertInput["results"] = [];
  accumulatedGrades.forEach((accumulated, subjectIndex) => {
    if (accumulated === null) {
      for (let index = 0; index < term; index += 1) results.push({
        subjectId: `subject-${subjectIndex}`,
        subjectName: `Disciplina ${subjectIndex + 1}`,
        term: index + 1,
        grade: null,
        gradeMarker: options.markers?.[subjectIndex] ?? "*",
      });
      return;
    }
    const base = Math.floor((accumulated / term) * 100) / 100;
    for (let index = 0; index < term; index += 1) results.push({
      subjectId: `subject-${subjectIndex}`,
      subjectName: `Disciplina ${subjectIndex + 1}`,
      term: index + 1,
      grade: index === term - 1 ? accumulated - base * (term - 1) : base,
      gradeMarker: null,
    });
  });
  return {
    name: "Estudante",
    gradeLevel: options.gradeLevel ?? 1,
    attendanceRate: options.attendanceRate === undefined ? 90 : options.attendanceRate,
    results,
  };
}

describe("motor pedagógico de risco", () => {
  it("mantém 1ª série com duas disciplinas fora do ritmo sem alerta", () => {
    const alerts = calculateStudentAlerts(input([11, 10]), 2);
    expect(alerts.academicStatus).toBe("normal");
    expect(alerts.offPaceSubjectCount).toBe(2);
  });

  it("coloca 1ª série com três disciplinas fora do ritmo em monitoramento", () => {
    const alerts = calculateStudentAlerts(input([11, 10, 9]), 2);
    expect(alerts.academicStatus).toBe("monitoring");
    expect(alerts.academicRisk).toBe(false);
  });

  it("classifica 1ª série com cinco disciplinas sob pressão como risco de retenção", () => {
    const alerts = calculateStudentAlerts(input([9, 9, 8, 8, 7]), 2);
    expect(alerts.pressureSubjectCount).toBe(5);
    expect(alerts.academicStatus).toBe("retention_risk");
  });

  it("mantém 3ª série com uma disciplina fora do ritmo sem alerta", () => {
    expect(calculateStudentAlerts(input([11], { gradeLevel: 3 }), 2).academicStatus).toBe("normal");
  });

  it("coloca 3ª série com duas disciplinas fora do ritmo em monitoramento", () => {
    expect(calculateStudentAlerts(input([11, 10], { gradeLevel: 3 }), 2).academicStatus).toBe("monitoring");
  });

  it("classifica 3ª série com quatro disciplinas sob pressão como risco de não conclusão", () => {
    const alerts = calculateStudentAlerts(input([9, 9, 8, 8], { gradeLevel: 3 }), 2);
    expect(alerts.pressureSubjectCount).toBe(4);
    expect(alerts.academicStatus).toBe("completion_risk");
  });

  it("classifica 3ª série com três disciplinas críticas como risco de não conclusão", () => {
    const alerts = calculateStudentAlerts(input([7, 7, 7], { gradeLevel: 3 }), 2);
    expect(alerts.criticalSubjectCount).toBe(3);
    expect(alerts.academicStatus).toBe("completion_risk");
  });

  it("não transforma nota ausente ou marcador especial em zero", () => {
    const alerts = calculateStudentAlerts(input([null, null], { markers: ["*", "AE"] }), 2);
    expect(alerts.offPaceSubjectCount).toBe(0);
    expect(alerts.missingGradeCount).toBe(2);
    expect(alerts.specialResultCount).toBe(2);
    expect(alerts.subjectDetails.every((detail) => detail.incomplete)).toBe(true);
  });

  it("identifica componente explicitamente sem nota como fora da projeção", () => {
    const alerts = calculateStudentAlerts(input([null], { markers: ["s/n"] }), 2);
    expect(alerts.subjectDetails[0].notAssessed).toBe(true);
    expect(alerts.subjectDetails[0].incomplete).toBe(false);
    expect(alerts.subjectDetails[0].offPace).toBe(false);
  });

  it("respeita os limites estritos das médias 7 e 8", () => {
    const alerts = calculateStudentAlerts(input([10, 8, 7]), 2);
    expect(alerts.subjectDetails[0].requiredAverage).toBe(7);
    expect(alerts.subjectDetails[0].underPressure).toBe(false);
    expect(alerts.subjectDetails[1].requiredAverage).toBe(8);
    expect(alerts.subjectDetails[1].underPressure).toBe(true);
    expect(alerts.subjectDetails[1].critical).toBe(false);
    expect(alerts.subjectDetails[2].requiredAverage).toBe(8.5);
    expect(alerts.subjectDetails[2].critical).toBe(true);
  });

  it.each([1, 2, 3, 4])("calcula o ritmo acumulado no %sº bimestre", (term) => {
    const onPace = COUNCIL_CRITERIA.termExpectedPoints * term;
    const alerts = calculateStudentAlerts(input([onPace, onPace - 0.01], { term }), term);
    expect(alerts.offPaceSubjectCount).toBe(1);
  });

  it("no fechamento da 3ª série qualquer disciplina não integralizada impede conclusão", () => {
    const alerts = calculateStudentAlerts(input([23.9], { term: 4, gradeLevel: 3 }), 4);
    expect(alerts.academicStatus).toBe("completion_risk");
  });

  it("no fechamento da 1ª série até quatro pendências ficam em progressão parcial", () => {
    const four = calculateStudentAlerts(input([23, 23, 23, 23], { term: 4 }), 4);
    const five = calculateStudentAlerts(input([23, 23, 23, 23, 23], { term: 4 }), 4);
    expect(four.academicStatus).toBe("monitoring");
    expect(five.academicStatus).toBe("retention_risk");
  });

  it("mantém frequência preventiva separada do risco formal", () => {
    const attention = calculateStudentAlerts(input([], { attendanceRate: 79 }), 2);
    const risk = calculateStudentAlerts(input([], { attendanceRate: 74.9 }), 2);
    expect(attention.attendanceStatus).toBe("attention");
    expect(attention.atRisk).toBe(false);
    expect(risk.attendanceStatus).toBe("risk");
    expect(risk.atRisk).toBe(true);
  });

  it("aceita política anual diferente sem alterar o código", () => {
    const criteria = { ...COUNCIL_CRITERIA, partialProgressionLimit: 2, grade12AttentionCount: 2 };
    const alerts = calculateStudentAlerts(input([9, 9, 9]), 2, criteria);
    expect(alerts.academicStatus).toBe("retention_risk");
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
