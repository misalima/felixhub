import { describe, expect, it } from "vitest";
import { parseStudentOccurrenceInput } from "@/lib/students/occurrenceValidation";

describe("parseStudentOccurrenceInput", () => {
  it("normaliza um registro válido", () => {
    expect(parseStudentOccurrenceInput({ occurredOn: "2026-08-23", category: "inappropriate_phone_use", notes: "  Durante a aula.  ", guardianNotified: true }, "2026-08-23")).toEqual({
      occurredOn: "2026-08-23",
      category: "inappropriate_phone_use",
      notes: "Durante a aula.",
      guardianNotified: true,
    });
  });

  it("rejeita data futura", () => {
    expect(() => parseStudentOccurrenceInput({ occurredOn: "2026-08-24", category: "removed_from_classroom", guardianNotified: false }, "2026-08-23")).toThrow("data futura");
  });

  it("exige descrição para outra ocorrência", () => {
    expect(() => parseStudentOccurrenceInput({ occurredOn: "2026-08-23", category: "other", notes: "", guardianNotified: false }, "2026-08-23")).toThrow("Descreva a ocorrência");
  });

  it("exige a informação de ciência do responsável", () => {
    expect(() => parseStudentOccurrenceInput({ occurredOn: "2026-08-23", category: "disrespect_staff" }, "2026-08-23")).toThrow("responsável está ciente");
  });
});
