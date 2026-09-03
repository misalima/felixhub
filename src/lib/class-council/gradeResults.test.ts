import { describe, expect, it } from "vitest";
import { isMissingGradeResult, isNotAssessedGradeMarker, isSpecialGradeResult } from "./gradeResults";

describe("classificação dos resultados de nota", () => {
  it.each(["*", " * ", null, ""])("considera %j como nota pendente quando não há valor numérico", (gradeMarker) => {
    expect(isMissingGradeResult({ grade: null, gradeMarker })).toBe(true);
  });

  it.each(["s/n", "S/N", " s/n "])("trata %j como componente sem nota, não como pendência", (gradeMarker) => {
    const result = { grade: null, gradeMarker };
    expect(isMissingGradeResult(result)).toBe(false);
    expect(isSpecialGradeResult(result)).toBe(true);
    expect(isNotAssessedGradeMarker(gradeMarker)).toBe(true);
  });

  it("não transforma outros marcadores especiais em nota faltante", () => {
    expect(isMissingGradeResult({ grade: null, gradeMarker: "-" })).toBe(false);
    expect(isSpecialGradeResult({ grade: null, gradeMarker: "-" })).toBe(true);
  });

  it("não classifica uma nota numérica como pendência", () => {
    expect(isMissingGradeResult({ grade: 0, gradeMarker: null })).toBe(false);
  });
});
