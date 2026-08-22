import { describe, expect, it } from "vitest";
import { deriveClassDisplayName, isPcdStatus, parseAttendance, parseTerm } from "./normalize";

describe("normalização SIGEduc", () => {
  it.each([
    ["EMMAT1A", "1MA"], ["EMMAT1B", "1MB"], ["EMMAT1C", "1MC"], ["EMMAT1D", "1MD"],
    ["EMVES1A", "1TA"], ["EMVES1B", "1TB"], ["EMVES1C", "1TC"],
  ])("deriva %s como %s", (code, name) => expect(deriveClassDisplayName(code)).toBe(name));

  it("não adivinha códigos desconhecidos", () => expect(deriveClassDisplayName("OUTRA-1A")).toBeNull());
  it.each([["1° BIM", 1], ["2º Bim", 2], ["3 BIM", 3], ["4° BIM", 4]])("normaliza bimestre", (value, term) => expect(parseTerm(value)).toBe(term));
  it.each([["99%", 99], [0.75, 75], [75, 75], ["74,5%", 74.5]])("normaliza frequência", (value, expected) => expect(parseAttendance(value)).toBe(expected));
  it.each([["SIM", true], ["TEA", true], ["Não", false], ["Não informado", false], ["", false]])("interpreta status PCD %s", (value, expected) => expect(isPcdStatus(value)).toBe(expected));
});
