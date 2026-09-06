import { CouncilDomainError, optionalText, parseUuid } from "@/lib/class-council/validation";
import { STUDENT_OCCURRENCE_CATEGORIES } from "@/lib/students/occurrences";
import type { SchoolOccurrenceTargetType, StudentOccurrenceCategory } from "@/types/student-occurrence";

function schoolDateToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Maceio", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function parseStudentOccurrenceInput(input: unknown, today = schoolDateToday()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CouncilDomainError("Preencha os dados da ocorrência.");
  const body = input as Record<string, unknown>;
  const occurredOn = typeof body.occurredOn === "string" ? body.occurredOn.trim() : "";
  const category = typeof body.category === "string" ? body.category as StudentOccurrenceCategory : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) throw new CouncilDomainError("Informe uma data válida para a ocorrência.");
  if (occurredOn > today) throw new CouncilDomainError("A ocorrência não pode ter uma data futura.");
  if (!category || !STUDENT_OCCURRENCE_CATEGORIES.includes(category)) throw new CouncilDomainError("Selecione um tipo de ocorrência válido.");
  if (typeof body.guardianNotified !== "boolean") throw new CouncilDomainError("Informe se o responsável está ciente.");
  const notes = optionalText(body.notes, 2000);
  if (category === "other" && !notes) throw new CouncilDomainError("Descreva a ocorrência quando selecionar “Outra ocorrência”.");
  return { occurredOn, category, notes, guardianNotified: body.guardianNotified };
}

export function parseSchoolOccurrenceInput(input: unknown, today = schoolDateToday()) {
  const common = parseStudentOccurrenceInput(input, today);
  const body = input as Record<string, unknown>;
  const targetType = body.targetType === "student" || body.targetType === "collective" || body.targetType === "class" ? body.targetType as SchoolOccurrenceTargetType : null;
  const schoolYear = typeof body.schoolYear === "number" ? body.schoolYear : Number(body.schoolYear);
  if (!targetType) throw new CouncilDomainError("Selecione se a ocorrência é de um estudante ou de uma turma.");
  if (!Number.isInteger(schoolYear) || schoolYear < 2020 || schoolYear > 2100) throw new CouncilDomainError("Informe um ano letivo válido.");
  if (Number(common.occurredOn.slice(0, 4)) !== schoolYear) throw new CouncilDomainError("A data da ocorrência deve pertencer ao ano letivo selecionado.");
  const studentId = targetType === "student" ? parseUuid(String(body.studentId ?? ""), "Estudante") : null;
  const studentIds = targetType === "collective" && Array.isArray(body.studentIds)
    ? [...new Set(body.studentIds.map((value) => parseUuid(String(value), "Estudante")))]
    : [];
  const classOfficialCode = targetType === "class" && typeof body.classOfficialCode === "string" ? body.classOfficialCode.trim() : null;
  if (targetType === "class" && !classOfficialCode) throw new CouncilDomainError("Selecione uma turma.");
  if (targetType === "collective" && studentIds.length < 2) throw new CouncilDomainError("Selecione pelo menos dois estudantes.");
  if ((targetType === "class" || targetType === "collective") && !common.notes) throw new CouncilDomainError("Descreva objetivamente a ocorrência.");
  return { ...common, targetType, schoolYear, studentId, studentIds, classOfficialCode };
}
