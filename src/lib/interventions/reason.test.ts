import { describe, expect, it } from "vitest";
import { formatInterventionReason } from "@/lib/interventions/reason";
import type { InterventionReportItem } from "@/types/intervention";

const item = {
  councilContext: {
    lowGradeCount: 3,
    behaviors: [{ category: "excessive_talking", description: null }],
    pedagogicalObservation: "Precisa de acompanhamento próximo da família.",
  },
} as InterventionReportItem;

describe("formatInterventionReason", () => {
  it("combina notas baixas, comportamentos e observação pedagógica", () => {
    expect(formatInterventionReason(item, 300)).toBe("3 notas baixas · Comportamentos: Conversas excessivas · Observação pedagógica: Precisa de acompanhamento próximo da família.");
  });

  it("trunca contextos longos com a marca combinada", () => {
    const value = formatInterventionReason(item, 45);
    expect(value).toHaveLength(45);
    expect(value).toMatch(/ \(\.\.\.\)$/);
  });

  it("não cria motivo para intervenções coletivas", () => {
    expect(formatInterventionReason({ councilContext: null } as InterventionReportItem, 100)).toBeNull();
  });

  it("prioriza o motivo registrado fora do Conselho", () => {
    expect(formatInterventionReason({ reason: "Acompanhamento solicitado pela família.", councilContext: null } as InterventionReportItem, 100)).toBe("Acompanhamento solicitado pela família.");
  });
});
