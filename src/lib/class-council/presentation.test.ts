import { describe, expect, it } from "vitest";
import { shortSubjectName } from "./presentation";

describe("shortSubjectName", () => {
  it.each([
    ["LÍNGUA PORTUGUESA E SUAS LITERATURAS", "LÍNGUA PORTUGUESA"],
    ["PRÁTICAS DE MAT E CNT NO TERRITÓRIO", "PRÁT. MAT E CNT"],
    ["PRÁTICAS DE LGG E CHS NO TERRITÓRIO", "PRÁT. LGG E CHS"],
    ["TEMAS DE APROFUNDAMENTO MAT E CNT", "APROF. MAT E CNT"],
    ["TEMAS DE APROFUNDAMENTO LGG E CHS", "APROF. LGG E CHS"],
    ["PRÁTICAS DE INTEGRAÇÃO COM O TERRITÓRIO (PIT)", "PIT"],
    ["TEMAS DE APROFUNDAMENTO CURRICULAR (TAC)", "TAC"],
  ])("abrevia %s", (subjectName, expected) => {
    expect(shortSubjectName(subjectName)).toBe(expected);
  });

  it("reconhece o mapeamento independentemente de caixa e acentos", () => {
    expect(shortSubjectName("temas de aprofundamento curricular (tac)")).toBe("TAC");
  });

  it("preserva nomes que não possuem abreviação definida", () => {
    expect(shortSubjectName("MATEMÁTICA")).toBe("MATEMÁTICA");
  });
});
