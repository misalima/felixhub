import { describe, expect, it } from "vitest";
import { hasStudentCouncilRecord, shouldAutoMarkAsDiscussed } from "./studentRecord";

describe("registro pedagógico do estudante", () => {
  it.each([
    [{ activitiesStatus: "irregular" as const }],
    [{ pedagogicalObservation: "Apresentou dificuldade na atividade." }],
    [{ positiveNotes: "Participou bem da discussão." }],
    [{ behaviors: [{ category: "low_participation" }] }],
  ])("marca automaticamente como discutido ao preencher conteúdo pedagógico", (patch) => {
    expect(shouldAutoMarkAsDiscussed(patch)).toBe(true);
  });

  it("permite desmarcar manualmente mesmo quando já existe conteúdo", () => {
    expect(shouldAutoMarkAsDiscussed({ discussed: false, pedagogicalObservation: "Registro existente" })).toBe(false);
  });

  it("não marca ao manter campos vazios ou atividades não informadas", () => {
    expect(shouldAutoMarkAsDiscussed({ activitiesStatus: "not_informed", pedagogicalObservation: "  ", behaviors: [] })).toBe(false);
  });

  it("considera intervenção como registro para o resumo de conclusão", () => {
    expect(hasStudentCouncilRecord({ discussed: false, activitiesStatus: "not_informed" }, 1)).toBe(true);
  });
});
