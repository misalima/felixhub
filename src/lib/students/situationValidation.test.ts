import { describe, expect, it } from "vitest";
import { parseStudentSituation } from "./situationValidation";

describe("parseStudentSituation", () => {
  it.each(["regular", "infrequent", "dropout", "transferred"])("aceita %s", (situation) => {
    expect(parseStudentSituation({ situation })).toBe(situation);
  });

  it("rejeita uma situação desconhecida", () => {
    expect(() => parseStudentSituation({ situation: "cancelled" })).toThrow("Situação de frequência e vínculo inválida");
  });
});
