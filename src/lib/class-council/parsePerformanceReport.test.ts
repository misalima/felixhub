import { existsSync, readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { calculateStudentAlerts } from "./calculateAlerts";
import { parsePerformanceReport } from "./parsePerformanceReport";

const reportPath = process.env.CLASS_COUNCIL_REPORT_PATH ?? "/Users/misaellima/Downloads/relatorio-desempenho.xlsx";

describe.skipIf(!existsSync(reportPath))("parser com o relatório real (não versionado)", () => {
  it("reconhece as sete turmas, matrículas textuais e marcadores sem convertê-los em zero", async () => {
    const parsed = await parsePerformanceReport(readFileSync(reportPath), { schoolYear: 2026, term: 2, offering: "regular" });
    expect(parsed.summary.blockingErrorCount).toBe(0);
    expect(parsed.classes.map((item) => item.displayName)).toEqual(["1MA", "1MB", "1MC", "1MD", "1TA", "1TB", "1TC"]);
    expect(parsed.classes).toHaveLength(7);
    expect(parsed.summary.studentCount).toBeGreaterThan(0);
    expect(parsed.classes.every((item) => item.students.every((student) => typeof student.enrollmentNumber === "string"))).toBe(true);
    const markers = parsed.classes.flatMap((item) => item.students.flatMap((student) => student.results.filter((result) => result.gradeMarker)));
    expect(markers.some((result) => result.gradeMarker === "*")).toBe(true);
    expect(markers.some((result) => result.gradeMarker?.toLocaleLowerCase("pt-BR") === "s/n")).toBe(true);
    expect(markers.every((result) => result.grade === null)).toBe(true);
    expect(parsed.classes.flatMap((item) => item.students.flatMap((student) => student.results)).some((result) => result.term === 1 && result.grade !== null)).toBe(true);
    expect(parsed.classes.flatMap((item) => item.students.flatMap((student) => student.results)).some((result) => result.term === 2 && result.grade !== null)).toBe(true);
    expect(parsed.classes.flatMap((item) => item.students).some((student) => student.attendanceRate === 99)).toBe(true);
    const academicMonitoringByClass = parsed.classes.map((item) => item.students.filter((student) => calculateStudentAlerts({
      name: student.name,
      attendanceRate: student.attendanceRate,
      gradeLevel: item.gradeLevel,
      results: student.results,
    }, 2).academicAlert).length);
    expect(academicMonitoringByClass).toEqual([20, 18, 26, 26, 19, 22, 27]);
    const lowAttendanceStudents = parsed.classes.flatMap((item) => item.students).filter((student) => calculateStudentAlerts({
      name: student.name,
      attendanceRate: student.attendanceRate,
      results: student.results,
    }, 2).lowAttendance);
    expect(lowAttendanceStudents.length).toBeGreaterThan(3);
    expect(lowAttendanceStudents.every((student) => student.attendanceRate !== null && student.attendanceRate < 80)).toBe(true);
  });

  it("bloqueia ano incompatível", async () => {
    const parsed = await parsePerformanceReport(readFileSync(reportPath), { schoolYear: 2025, term: 2, offering: "regular" });
    expect(parsed.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SCHOOL_YEAR_MISMATCH", severity: "error" })]));
  });
});

async function anonymousWorkbook(rows: Array<[string, string, string, (string | number)?, (string | number)?]>, generatedAt = "21/08/2026 - 22:43") {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório");
  sheet.addRow(["Relatório de Desempenho Escolar"]);
  sheet.addRow([`Gerado em: ${generatedAt}`]);
  sheet.addRow(["ESCOLA: TESTE"]);
  sheet.addRow(["OFERTA DE ENSINO: ENSINO MÉDIO - SÉRIE: 1ª SÉRIE - TURNO: MATUTINO"]);
  sheet.addRow(["TURMA: EMMAT1A"]);
  sheet.addRow(["MATRÍCULA", "ESTUDANTE", "RAÇA/COR/ETNIA", "PCD", "PERÍODO", "COMPONENTES CURRICULARES", "", "FREQUÊNCIA ANUAL", "SITUAÇÃO"]);
  sheet.addRow(["MATRÍCULA", "ESTUDANTE", "RAÇA/COR/ETNIA", "PCD", "PERÍODO", "MATEMÁTICA", "MATEMÁTICA", "FREQUÊNCIA ANUAL", "SITUAÇÃO"]);
  sheet.addRow(["MATRÍCULA", "ESTUDANTE", "RAÇA/COR/ETNIA", "PCD", "PERÍODO", "NOTA", "FALTA", "FREQUÊNCIA ANUAL", "SITUAÇÃO"]);
  for (const [enrollment, name, term, grade = "*", absences = "**"] of rows) sheet.addRow([enrollment, name, "", "", term, grade, absences, "75%", "MATRICULADO"]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("validações bloqueantes do parser", () => {
  it("trata como aviso um relatório gerado no início do ano seguinte", async () => {
    const parsed = await parsePerformanceReport(
      await anonymousWorkbook([["0001", "ALUNO A", "4° BIM", 8, 0]], "03/01/2027 - 08:00"),
      { schoolYear: 2026, term: 4, offering: "regular" },
    );
    expect(parsed.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SCHOOL_YEAR_MISMATCH", severity: "warning" }),
    ]));
    expect(parsed.summary.blockingErrorCount).toBe(0);
  });

  it("detecta estudante sem matrícula", async () => {
    const parsed = await parsePerformanceReport(await anonymousWorkbook([["", "ALUNO A", "1° BIM"]]), { schoolYear: 2026, term: 1, offering: "regular" });
    expect(parsed.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "MISSING_ENROLLMENT", severity: "error" })]));
  });

  it("detecta conflito de identidade para a mesma matrícula", async () => {
    const parsed = await parsePerformanceReport(await anonymousWorkbook([["0001", "ALUNO A", "1° BIM"], ["0001", "ALUNO B", "2° BIM"]]), { schoolYear: 2026, term: 2, offering: "regular" });
    expect(parsed.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "ENROLLMENT_IDENTITY_CONFLICT", severity: "error" })]));
    expect(parsed.classes[0].students[0].enrollmentNumber).toBe("0001");
  });

  it("não gera avisos para notas e faltas ainda não lançadas em bimestres posteriores", async () => {
    const parsed = await parsePerformanceReport(await anonymousWorkbook([
      ["0001", "ALUNO A", "1° BIM", 8, 0],
      ["0001", "ALUNO A", "2° BIM", 7, 1],
      ["0001", "ALUNO A", "3° BIM", "*", "**"],
      ["0001", "ALUNO A", "4° BIM", "*", "**"],
    ]), { schoolYear: 2026, term: 2, offering: "regular" });
    expect(parsed.issues.some((issue) => issue.code === "GRADES_NOT_ENTERED")).toBe(false);
    expect(parsed.issues.some((issue) => issue.code === "ABSENCE_MARKERS")).toBe(false);
    expect(parsed.classes[0].students[0].results).toHaveLength(4);
  });
});
