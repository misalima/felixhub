import { CouncilDomainError, optionalText } from "@/lib/class-council/validation";
import { STUDENT_OCCURRENCE_CATEGORIES } from "@/lib/students/occurrences";
import type { StudentOccurrenceCategory } from "@/types/student-occurrence";

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
