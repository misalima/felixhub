import ExcelJS from "exceljs";
import type {
  ImportIssue,
  ParsedClass,
  ParsedPerformanceReport,
  ParsedStudent,
  ParsedSubject,
} from "@/types/class-council";
import {
  deriveClassDisplayName,
  normalizeSubjectName,
  normalizeTechnicalText,
  normalizedPersonName,
  parseAttendance,
  parseGradeLevel,
  parseTerm,
} from "./normalize";
import { isMissingGradeResult, isSpecialGradeResult } from "./gradeResults";

type ParseContext = { schoolYear: number; term: number; offering: "regular" };

function cellRaw(cell: ExcelJS.Cell): unknown {
  const value = cell.value;
  if (value && typeof value === "object") {
    if ("result" in value) return value.result;
    if ("text" in value) return value.text;
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
  }
  return value;
}

function cellText(cell: ExcelJS.Cell): string {
  return String(cellRaw(cell) ?? "").trim();
}

function rowTexts(sheet: ExcelJS.Worksheet, rowNumber: number): string[] {
  const row = sheet.getRow(rowNumber);
  return Array.from({ length: sheet.columnCount }, (_, index) => cellText(row.getCell(index + 1)));
}

function parseGrade(value: unknown): { grade: number | null; gradeMarker: string | null } {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 && value <= 10 ? { grade: value, gradeMarker: null } : { grade: null, gradeMarker: String(value) };
  }
  const text = String(value ?? "").trim();
  if (!text) return { grade: null, gradeMarker: null };
  const parsed = Number(text.replace(",", "."));
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10) return { grade: parsed, gradeMarker: null };
  return { grade: null, gradeMarker: text };
}

function parseAbsences(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim().replace(",", "."));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function findColumn(texts: string[], expected: string): number {
  const index = texts.findIndex((text) => normalizeTechnicalText(text).includes(expected));
  return index >= 0 ? index + 1 : -1;
}

function getUniqueRowText(sheet: ExcelJS.Worksheet, rowNumber: number): string[] {
  return [...new Set(rowTexts(sheet, rowNumber).filter(Boolean))];
}

function metadataFromWorkbook(workbook: ExcelJS.Workbook) {
  let generatedAt: string | null = null;
  for (const sheet of workbook.worksheets) {
    for (let row = 1; row <= Math.min(12, sheet.rowCount); row += 1) {
      for (const text of getUniqueRowText(sheet, row)) {
        const match = text.match(/GERADO\s+EM:\s*(\d{2})\/(\d{2})\/(\d{4})(?:\s*-\s*(\d{2}):(\d{2}))?/i);
        if (match) {
          generatedAt = `${match[3]}-${match[2]}-${match[1]}T${match[4] ?? "00"}:${match[5] ?? "00"}:00-03:00`;
        }
      }
    }
  }
  return {
    generatedAt,
    detectedSchoolYear: generatedAt ? Number(generatedAt.slice(0, 4)) : null,
    worksheetNames: workbook.worksheets.map((sheet) => sheet.name),
  };
}

export async function parsePerformanceReport(buffer: Buffer, context: ParseContext): Promise<ParsedPerformanceReport> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  } catch {
    return emptyReport({ severity: "error", code: "INVALID_XLSX", message: "Não foi possível ler o conteúdo do XLSX." });
  }

  const metadata = metadataFromWorkbook(workbook);
  const issues: ImportIssue[] = [];
  const classes: ParsedClass[] = [];
  const identities = new Map<string, string>();

  if (metadata.detectedSchoolYear !== null && metadata.detectedSchoolYear !== context.schoolYear) {
    const generatedMonth = metadata.generatedAt ? Number(metadata.generatedAt.slice(5, 7)) : null;
    const canBeLatePreviousSchoolYear = metadata.detectedSchoolYear === context.schoolYear + 1
      && generatedMonth !== null
      && generatedMonth <= 2;
    issues.push({
      severity: canBeLatePreviousSchoolYear ? "warning" : "error",
      code: "SCHOOL_YEAR_MISMATCH",
      message: canBeLatePreviousSchoolYear
        ? `O relatório foi gerado no início de ${metadata.detectedSchoolYear} e pode corresponder ao ano letivo de ${context.schoolYear}. Confirme antes de prosseguir.`
        : `O relatório foi gerado em ${metadata.detectedSchoolYear}, mas o conselho é de ${context.schoolYear}.`,
    });
  }

  for (const sheet of workbook.worksheets) {
    const classRows: Array<{ row: number; code: string }> = [];
    for (let row = 1; row <= sheet.rowCount; row += 1) {
      const unique = getUniqueRowText(sheet, row);
      const classLabel = unique.find((text) => normalizeTechnicalText(text).startsWith("TURMA:"));
      if (classLabel) classRows.push({ row, code: classLabel.replace(/^\s*TURMA:\s*/i, "").trim() });
    }

    for (let blockIndex = 0; blockIndex < classRows.length; blockIndex += 1) {
      const marker = classRows[blockIndex];
      const blockEnd = (classRows[blockIndex + 1]?.row ?? sheet.rowCount + 1) - 1;
      const metaText = [marker.row - 3, marker.row - 2, marker.row - 1]
        .filter((row) => row > 0)
        .flatMap((row) => getUniqueRowText(sheet, row))
        .join(" ");
      const normalizedMeta = normalizeTechnicalText(metaText);
      if (!normalizedMeta.includes("ENSINO MEDIO")) {
        issues.push({ severity: "error", code: "OFFERING_MISMATCH", message: "Foi encontrado um bloco que não pertence ao Ensino Regular.", classCode: marker.code, row: marker.row });
        continue;
      }

      let typeRow = -1;
      for (let row = marker.row + 1; row <= Math.min(marker.row + 8, blockEnd); row += 1) {
        const normalized = rowTexts(sheet, row).map(normalizeTechnicalText);
        if (normalized.includes("NOTA") && normalized.includes("FALTA")) typeRow = row;
      }
      if (typeRow < 0) {
        issues.push({ severity: "error", code: "SUBJECT_STRUCTURE_NOT_FOUND", message: "Os pares NOTA/FALTA da turma não foram reconhecidos.", classCode: marker.code, row: marker.row });
        continue;
      }

      const subjectRow = typeRow - 1;
      const labelTexts = rowTexts(sheet, typeRow);
      const normalizedLabels = labelTexts.map(normalizeTechnicalText);
      const enrollmentColumn = findColumn(labelTexts, "MATRICULA");
      const studentColumn = findColumn(labelTexts, "ESTUDANTE");
      const raceColumn = findColumn(labelTexts, "RACA/COR/ETNIA");
      const pcdColumn = findColumn(labelTexts, "PCD");
      const termColumn = findColumn(labelTexts, "PERIODO");
      const attendanceColumn = findColumn(labelTexts, "FREQUENCIA ANUAL");
      const statusColumn = findColumn(labelTexts, "SITUACAO");
      if ([enrollmentColumn, studentColumn, termColumn].some((column) => column < 1)) {
        issues.push({ severity: "error", code: "STUDENT_HEADER_NOT_FOUND", message: "O cabeçalho de matrícula, estudante e período não foi reconhecido.", classCode: marker.code, row: typeRow });
        continue;
      }

      const subjects: ParsedSubject[] = [];
      for (let column = 1; column < normalizedLabels.length; column += 1) {
        if (normalizedLabels[column - 1] !== "NOTA" || normalizedLabels[column] !== "FALTA") continue;
        const displayName = cellText(sheet.getCell(subjectRow, column));
        if (!displayName) continue;
        subjects.push({ key: normalizeSubjectName(displayName), displayName, gradeColumn: column, absenceColumn: column + 1 });
      }
      if (!subjects.length) {
        issues.push({ severity: "error", code: "SUBJECTS_EMPTY", message: "Nenhuma disciplina foi reconhecida na turma.", classCode: marker.code, row: subjectRow });
        continue;
      }

      const displayName = deriveClassDisplayName(marker.code);
      const shift = normalizedMeta.includes("MATUTINO") ? "morning" : normalizedMeta.includes("VESPERTINO") || normalizedMeta.includes("TARDE") ? "afternoon" : "evening";
      const gradeMatch = metaText.match(/S[ÉE]RIE:\s*([^\-]+)/i);
      const gradeLabel = gradeMatch?.[1]?.trim() ?? "Ensino Médio";
      const parsedClass: ParsedClass = {
        officialCode: marker.code,
        displayName: displayName ?? marker.code,
        displayNameNeedsConfirmation: displayName === null,
        gradeLabel,
        gradeLevel: parseGradeLevel(gradeLabel, marker.code, displayName),
        shift,
        offering: "regular",
        subjects,
        students: [],
      };
      if (!displayName) issues.push({ severity: "warning", code: "CLASS_NAME_CONFIRMATION_REQUIRED", message: "Confirme o nome curto desta turma antes de importar.", classCode: marker.code, row: marker.row });

      const studentMap = new Map<string, ParsedStudent>();
      let activeEnrollment = "";
      let missingGradeMarkers = 0;
      let specialSubjectMarkers = 0;
      let absenceMarkers = 0;
      let missingAttendance = 0;
      let missingRaceOrPcd = 0;

      for (let row = typeRow + 1; row <= blockEnd; row += 1) {
        const term = parseTerm(cellRaw(sheet.getCell(row, termColumn)));
        if (!term) continue;
        const enrollmentCell = cellText(sheet.getCell(row, enrollmentColumn));
        if (enrollmentCell) activeEnrollment = enrollmentCell;
        const name = cellText(sheet.getCell(row, studentColumn));
        if (!activeEnrollment) {
          issues.push({ severity: "error", code: "MISSING_ENROLLMENT", message: "Estudante sem matrícula.", classCode: marker.code, row, column: enrollmentColumn });
          continue;
        }
        if (!name) {
          issues.push({ severity: "error", code: "MISSING_STUDENT_NAME", message: "Matrícula sem nome de estudante.", classCode: marker.code, enrollmentNumber: activeEnrollment, row, column: studentColumn });
          continue;
        }

        const identity = normalizedPersonName(name);
        const knownIdentity = identities.get(activeEnrollment);
        if (knownIdentity && knownIdentity !== identity) {
          issues.push({ severity: "error", code: "ENROLLMENT_IDENTITY_CONFLICT", message: "A mesma matrícula está associada a nomes diferentes.", classCode: marker.code, enrollmentNumber: activeEnrollment, row });
        } else {
          identities.set(activeEnrollment, identity);
        }

        let student = studentMap.get(activeEnrollment);
        if (!student) {
          const raceColor = raceColumn > 0 ? cellText(sheet.getCell(row, raceColumn)) || null : null;
          const pcdStatus = pcdColumn > 0 ? cellText(sheet.getCell(row, pcdColumn)) || null : null;
          const attendanceRate = attendanceColumn > 0 ? parseAttendance(cellRaw(sheet.getCell(row, attendanceColumn))) : null;
          const enrollmentStatus = statusColumn > 0 ? cellText(sheet.getCell(row, statusColumn)) || null : null;
          student = { enrollmentNumber: activeEnrollment, name, raceColor, pcdStatus, enrollmentStatus, attendanceRate, results: [] };
          studentMap.set(activeEnrollment, student);
          if (attendanceRate === null) missingAttendance += 1;
          if (!raceColor || !pcdStatus) missingRaceOrPcd += 1;
          if (enrollmentStatus && normalizeTechnicalText(enrollmentStatus) !== "MATRICULADO") {
            issues.push({ severity: "warning", code: "NON_ACTIVE_ENROLLMENT", message: `Situação da matrícula: ${enrollmentStatus}.`, classCode: marker.code, enrollmentNumber: activeEnrollment, row });
          }
        }

        for (const subject of subjects) {
          const { grade, gradeMarker } = parseGrade(cellRaw(sheet.getCell(row, subject.gradeColumn)));
          const absenceValue = cellRaw(sheet.getCell(row, subject.absenceColumn));
          const absences = parseAbsences(absenceValue);
          const absenceText = String(absenceValue ?? "").trim();
          // O relatório traz bimestres futuros ainda vazios. Eles continuam sendo
          // importados como fotografia, mas não geram avisos antes de seu período.
          if (term <= context.term) {
            if (isMissingGradeResult({ grade, gradeMarker })) missingGradeMarkers += 1;
            else if (isSpecialGradeResult({ grade, gradeMarker })) specialSubjectMarkers += 1;
            if (absenceText && absences === null) absenceMarkers += 1;
          }
          student.results.push({ subjectKey: subject.key, term, grade, gradeMarker, absences });
        }
      }

      parsedClass.students = [...studentMap.values()];
      if (missingGradeMarkers) issues.push({ severity: "warning", code: "GRADES_NOT_ENTERED", message: `${missingGradeMarkers} notas ainda não foram lançadas.`, classCode: marker.code });
      if (specialSubjectMarkers) issues.push({ severity: "warning", code: "SPECIAL_GRADE_MARKERS", message: `${specialSubjectMarkers} resultados usam marcador especial e não serão tratados como zero.`, classCode: marker.code });
      if (absenceMarkers) issues.push({ severity: "warning", code: "ABSENCE_MARKERS", message: `${absenceMarkers} faltas usam marcador especial e ficarão sem valor numérico.`, classCode: marker.code });
      if (missingAttendance) issues.push({ severity: "warning", code: "MISSING_ATTENDANCE", message: `${missingAttendance} estudantes estão sem frequência numérica.`, classCode: marker.code });
      if (missingRaceOrPcd) issues.push({ severity: "warning", code: "MISSING_CONTEXT_FIELDS", message: `${missingRaceOrPcd} estudantes estão sem raça/cor ou PCD informado.`, classCode: marker.code });
      classes.push(parsedClass);
    }
  }

  if (!classes.length) issues.push({ severity: "error", code: "NO_CLASS_BLOCKS", message: "Nenhum bloco de turma reconhecível foi encontrado." });
  const resultCount = classes.reduce((sum, item) => sum + item.students.reduce((studentSum, student) => studentSum + student.results.length, 0), 0);
  const allResults = classes.flatMap((item) => item.students.flatMap((student) => student.results));
  const summary = {
    classCount: classes.length,
    studentCount: classes.reduce((sum, item) => sum + item.students.length, 0),
    subjectCount: classes.reduce((sum, item) => sum + item.subjects.length, 0),
    resultCount,
    numericGradeCount: allResults.filter((result) => result.grade !== null).length,
    markerCount: allResults.filter((result) => result.gradeMarker !== null).length,
    absenceCount: allResults.filter((result) => result.absences !== null).length,
    blockingErrorCount: issues.filter((issue) => issue.severity === "error").length,
    warningCount: issues.filter((issue) => issue.severity === "warning").length,
  };
  return { metadata, classes, issues, summary };
}

function emptyReport(issue: ImportIssue): ParsedPerformanceReport {
  return {
    metadata: { generatedAt: null, detectedSchoolYear: null, worksheetNames: [] },
    classes: [],
    issues: [issue],
    summary: { classCount: 0, studentCount: 0, subjectCount: 0, resultCount: 0, numericGradeCount: 0, markerCount: 0, absenceCount: 0, blockingErrorCount: 1, warningCount: 0 },
  };
}
