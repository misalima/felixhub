import { describe, expect, it } from "vitest";
import { filterActiveEnrollments } from "./activeImport";

describe("escopo da importação ativa", () => {
  it("ignora matrículas residuais de tentativas anteriores", () => {
    const enrollments = [
      { id: "active-1", classId: "class-a" },
      { id: "stale-1", classId: "class-old" },
      { id: "active-2", classId: "class-b" },
    ];

    expect(filterActiveEnrollments(enrollments, [
      { enrollment_id: "active-1" },
      { enrollment_id: "active-2" },
    ])).toEqual([enrollments[0], enrollments[2]]);
  });
});
