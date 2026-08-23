import type { ImportComparison, ImportComparisonCategory, ParsedPerformanceReport, ParsedResult, ParsedStudent } from "@/types/class-council";

const GROUP_LABELS: Record<ImportComparisonCategory, string> = {
  classes_added: "Turmas adicionadas",
  classes_removed: "Turmas removidas",
  students_added: "Estudantes adicionados",
  students_removed: "Estudantes ausentes na nova versão",
  students_moved: "Mudanças de turma",
  student_names_changed: "Nomes atualizados",
  enrollment_statuses_changed: "Situações de matrícula atualizadas",
  attendance_changed: "Frequências atualizadas",
  subjects_added: "Disciplinas adicionadas",
  subjects_removed: "Disciplinas removidas",
  grades_changed: "Notas atualizadas",
  absences_changed: "Faltas atualizadas",
};

type IndexedStudent = { classCode: string; className: string; student: ParsedStudent };
type ChangeAccumulator = Map<ImportComparisonCategory, { count: number; examples: string[] }>;

function addChange(changes: ChangeAccumulator, category: ImportComparisonCategory, example: string) {
  const current = changes.get(category) ?? { count: 0, examples: [] };
  current.count += 1;
  if (current.examples.length < 5) current.examples.push(example);
  changes.set(category, current);
}

function indexStudents(report: ParsedPerformanceReport) {
  return new Map(report.classes.flatMap((item) => item.students.map((student) => [student.enrollmentNumber, { classCode: item.officialCode, className: item.displayName, student } satisfies IndexedStudent] as const)));
}

function formatValue(value: string | number | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") return "não informado";
  return `${typeof value === "number" ? value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : value}${suffix}`;
}

function resultValue(result: ParsedResult | undefined) {
  if (!result) return "não informado";
  return result.grade === null ? formatValue(result.gradeMarker) : formatValue(result.grade);
}

function indexResults(student: ParsedStudent) {
  return new Map(student.results.map((result) => [`${result.subjectKey}:${result.term}`, result]));
}

export function comparePerformanceReports(previous: ParsedPerformanceReport, current: ParsedPerformanceReport, previousImportId: string, previousVersion: number): ImportComparison {
  const changes: ChangeAccumulator = new Map();
  const previousClasses = new Map(previous.classes.map((item) => [item.officialCode, item]));
  const currentClasses = new Map(current.classes.map((item) => [item.officialCode, item]));

  for (const item of current.classes) if (!previousClasses.has(item.officialCode)) addChange(changes, "classes_added", `${item.displayName} (${item.officialCode})`);
  for (const item of previous.classes) if (!currentClasses.has(item.officialCode)) addChange(changes, "classes_removed", `${item.displayName} (${item.officialCode})`);

  for (const item of current.classes) {
    const prior = previousClasses.get(item.officialCode);
    if (!prior) continue;
    const previousSubjects = new Map(prior.subjects.map((subject) => [subject.key, subject]));
    const currentSubjects = new Map(item.subjects.map((subject) => [subject.key, subject]));
    for (const subject of item.subjects) if (!previousSubjects.has(subject.key)) addChange(changes, "subjects_added", `${item.displayName}: ${subject.displayName}`);
    for (const subject of prior.subjects) if (!currentSubjects.has(subject.key)) addChange(changes, "subjects_removed", `${item.displayName}: ${subject.displayName}`);
  }

  const previousStudents = indexStudents(previous);
  const currentStudents = indexStudents(current);
  for (const [enrollment, item] of currentStudents) {
    const prior = previousStudents.get(enrollment);
    const identity = `${item.student.name} (${enrollment})`;
    if (!prior) {
      addChange(changes, "students_added", `${identity} · ${item.className}`);
      continue;
    }
    if (prior.classCode !== item.classCode) addChange(changes, "students_moved", `${identity}: ${prior.className} → ${item.className}`);
    if (prior.student.name.trim() !== item.student.name.trim()) addChange(changes, "student_names_changed", `${enrollment}: ${prior.student.name} → ${item.student.name}`);
    if ((prior.student.enrollmentStatus ?? "") !== (item.student.enrollmentStatus ?? "")) addChange(changes, "enrollment_statuses_changed", `${identity}: ${formatValue(prior.student.enrollmentStatus)} → ${formatValue(item.student.enrollmentStatus)}`);
    if (prior.student.attendanceRate !== item.student.attendanceRate) addChange(changes, "attendance_changed", `${identity}: ${formatValue(prior.student.attendanceRate, "%")} → ${formatValue(item.student.attendanceRate, "%")}`);

    const previousResults = indexResults(prior.student);
    const currentResults = indexResults(item.student);
    for (const [key, result] of currentResults) {
      const previousResult = previousResults.get(key);
      if (!previousResult) continue;
      if (previousResult.grade !== result.grade || previousResult.gradeMarker !== result.gradeMarker) {
        addChange(changes, "grades_changed", `${identity} · ${result.subjectKey} · ${result.term}º bim.: ${resultValue(previousResult)} → ${resultValue(result)}`);
      }
      if (previousResult.absences !== result.absences) {
        addChange(changes, "absences_changed", `${identity} · ${result.subjectKey} · ${result.term}º bim.: ${formatValue(previousResult.absences)} → ${formatValue(result.absences)}`);
      }
    }
  }
  for (const [enrollment, item] of previousStudents) {
    if (!currentStudents.has(enrollment)) addChange(changes, "students_removed", `${item.student.name} (${enrollment}) · ${item.className}`);
  }

  const groups = (Object.keys(GROUP_LABELS) as ImportComparisonCategory[])
    .flatMap((category) => {
      const group = changes.get(category);
      return group ? [{ category, label: GROUP_LABELS[category], ...group }] : [];
    });
  return {
    previousImportId,
    previousVersion,
    totalChanges: groups.reduce((total, group) => total + group.count, 0),
    groups,
  };
}
