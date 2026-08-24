import { CouncilDomainError } from "@/lib/class-council/validation";
import { STUDENT_SITUATIONS } from "@/lib/students/situations";
import type { AttendanceSituation } from "@/types/class-council";

export function parseStudentSituation(input: unknown): AttendanceSituation {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CouncilDomainError("Informe a nova situação do estudante.");
  const situation = (input as Record<string, unknown>).situation;
  if (typeof situation !== "string" || !STUDENT_SITUATIONS.includes(situation as AttendanceSituation)) throw new CouncilDomainError("Situação de frequência e vínculo inválida.");
  return situation as AttendanceSituation;
}
