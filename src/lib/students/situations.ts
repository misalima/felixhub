import type { AttendanceSituation } from "@/types/class-council";

export const STUDENT_SITUATIONS: AttendanceSituation[] = ["regular", "infrequent", "dropout", "transferred"];

export const STUDENT_SITUATION_LABELS: Record<AttendanceSituation, string> = {
  regular: "Regular",
  infrequent: "Infrequente",
  dropout: "Desistente",
  transferred: "Transferido(a)",
};

export const STUDENT_SITUATION_DESCRIPTIONS: Record<AttendanceSituation, string> = {
  regular: "Vínculo ativo e frequência acompanhada normalmente.",
  infrequent: "Vínculo ativo, com infrequência identificada pela equipe.",
  dropout: "Deixou de frequentar; entra como abandono no fluxo projetado.",
  transferred: "Transferido para outra escola; fica fora do cálculo de fluxo.",
};
