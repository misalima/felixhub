import { describe, expect, it } from "vitest";
import { parseSchoolOccurrenceInput, parseStudentOccurrenceInput } from "@/lib/students/occurrenceValidation";

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

describe("parseSchoolOccurrenceInput", () => {
  const studentId = "550e8400-e29b-41d4-a716-446655440000";

  it("aceita uma ocorrência individual no mesmo ano letivo", () => {
    expect(parseSchoolOccurrenceInput({ targetType: "student", studentId, schoolYear: 2026, occurredOn: "2026-08-23", category: "disrespect_staff", notes: "Registro objetivo.", guardianNotified: true }, "2026-08-23")).toMatchObject({
      targetType: "student", studentId, schoolYear: 2026,
    });
  });

  it("exige descrição para uma ocorrência coletiva", () => {
    expect(() => parseSchoolOccurrenceInput({ targetType: "class", classOfficialCode: "1MA", schoolYear: 2026, occurredOn: "2026-08-23", category: "inappropriate_phone_use", notes: "", guardianNotified: false }, "2026-08-23")).toThrow("Descreva objetivamente");
  });

  it("rejeita data fora do ano letivo selecionado", () => {
    expect(() => parseSchoolOccurrenceInput({ targetType: "student", studentId, schoolYear: 2025, occurredOn: "2026-08-23", category: "disrespect_staff", guardianNotified: false }, "2026-08-23")).toThrow("ano letivo selecionado");
  });

  it("aceita uma ocorrência coletiva com estudantes únicos", () => {
    const secondStudentId = "550e8400-e29b-41d4-a716-446655440001";
    expect(parseSchoolOccurrenceInput({ targetType: "collective", studentIds: [studentId, secondStudentId, studentId], schoolYear: 2026, occurredOn: "2026-08-23", category: "other", notes: "Fato coletivo.", guardianNotified: false }, "2026-08-23")).toMatchObject({
      targetType: "collective", studentIds: [studentId, secondStudentId], schoolYear: 2026,
    });
  });

  it("exige pelo menos dois estudantes em uma ocorrência coletiva", () => {
    expect(() => parseSchoolOccurrenceInput({ targetType: "collective", studentIds: [studentId], schoolYear: 2026, occurredOn: "2026-08-23", category: "other", notes: "Fato coletivo.", guardianNotified: false }, "2026-08-23")).toThrow("pelo menos dois estudantes");
  });
});
