import { describe, expect, it } from "vitest";
import { comparePerformanceReports } from "./comparePerformanceReports";
import type { ParsedPerformanceReport, ParsedStudent } from "@/types/class-council";

function student(overrides: Partial<ParsedStudent> = {}): ParsedStudent {
  return {
    enrollmentNumber: "001",
    name: "ALUNA UM",
    raceColor: null,
    pcdStatus: null,
    enrollmentStatus: "MATRICULADO",
    attendanceRate: 90,
    results: [{ subjectKey: "matematica", term: 2, grade: 5, gradeMarker: null, absences: 1 }],
    ...overrides,
  };
}

function report(classCode: string, students: ParsedStudent[], subjects = [{ key: "matematica", displayName: "MATEMÁTICA", gradeColumn: 1, absenceColumn: 2 }]): ParsedPerformanceReport {
  return {
    metadata: { generatedAt: null, detectedSchoolYear: 2026, worksheetNames: [] },
    issues: [],
    summary: { classCount: 1, studentCount: students.length, subjectCount: subjects.length, resultCount: students.flatMap((item) => item.results).length, numericGradeCount: 1, markerCount: 0, absenceCount: 1, blockingErrorCount: 0, warningCount: 0 },
    classes: [{ officialCode: classCode, displayName: classCode === "A" ? "1MA" : "1MB", displayNameNeedsConfirmation: false, gradeLabel: "1ª Série", shift: "morning", offering: "regular", subjects, students }],
  };
}

describe("comparePerformanceReports", () => {
  it("detecta mudanças acadêmicas e cadastrais sem usar raça/cor ou PCD", () => {
    const previous = report("A", [student()]);
    const current = report("A", [student({ attendanceRate: 82, raceColor: "alterada", pcdStatus: "SIM", results: [{ subjectKey: "matematica", term: 2, grade: 6, gradeMarker: null, absences: 3 }] })]);
    const comparison = comparePerformanceReports(previous, current, "import-1", 1);

    expect(comparison.groups.map((item) => [item.category, item.count])).toEqual([
      ["attendance_changed", 1],
      ["grades_changed", 1],
      ["absences_changed", 1],
    ]);
  });

  it("detecta estudantes adicionados, removidos e movidos", () => {
    const previous = report("A", [student(), student({ enrollmentNumber: "002", name: "ALUNA DOIS" })]);
    const current = report("B", [student(), student({ enrollmentNumber: "003", name: "ALUNA TRÊS" })]);
    const comparison = comparePerformanceReports(previous, current, "import-1", 1);

    expect(comparison.groups).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "classes_added", count: 1 }),
      expect.objectContaining({ category: "classes_removed", count: 1 }),
      expect.objectContaining({ category: "students_added", count: 1 }),
      expect.objectContaining({ category: "students_removed", count: 1 }),
      expect.objectContaining({ category: "students_moved", count: 1 }),
    ]));
  });

  it("retorna comparação vazia para relatórios idênticos", () => {
    const previous = report("A", [student()]);
    const comparison = comparePerformanceReports(previous, previous, "import-1", 1);
    expect(comparison.totalChanges).toBe(0);
    expect(comparison.groups).toEqual([]);
  });
});
