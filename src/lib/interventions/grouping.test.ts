import { describe, expect, it } from "vitest";
import { interventionClassGroupKey } from "./grouping";

describe("interventionClassGroupKey", () => {
  it("groups the same class across councils by its stable code", () => {
    const firstCouncil = interventionClassGroupKey({ schoolYear: 2026, classCode: "EMMAT1A", className: "1MA" });
    const secondCouncil = interventionClassGroupKey({ schoolYear: 2026, classCode: " emmat1a ", className: "1MA" });

    expect(firstCouncil).toBe(secondCouncil);
  });

  it("keeps different school years and classes separate", () => {
    const currentClass = interventionClassGroupKey({ schoolYear: 2026, classCode: "EMMAT1A", className: "1MA" });

    expect(interventionClassGroupKey({ schoolYear: 2025, classCode: "EMMAT1A", className: "1MA" })).not.toBe(currentClass);
    expect(interventionClassGroupKey({ schoolYear: 2026, classCode: "EMMAT1B", className: "1MB" })).not.toBe(currentClass);
  });

  it("uses the class name when a code is unavailable", () => {
    expect(interventionClassGroupKey({ schoolYear: 2026, classCode: "", className: " 1ª A " })).toBe("2026:1a");
  });
});
