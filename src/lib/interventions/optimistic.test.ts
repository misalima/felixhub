import { describe, expect, it } from "vitest";
import { applyOptimisticInterventionStatus } from "@/lib/interventions/optimistic";
import type { InterventionReportItem } from "@/types/intervention";

const baseItem = {
  status: "pending",
  updatedAt: "2026-08-20T10:00:00.000Z",
  statusChangedAt: "2026-08-20T10:00:00.000Z",
  startedAt: null,
  completedAt: null,
  cancelledAt: null,
} as InterventionReportItem;

describe("applyOptimisticInterventionStatus", () => {
  const changedAt = "2026-08-25T12:00:00.000Z";

  it("marca conclusão e inicialização imediatamente", () => {
    const result = applyOptimisticInterventionStatus(baseItem, "completed", changedAt);
    expect(result).toMatchObject({ status: "completed", updatedAt: changedAt, statusChangedAt: changedAt, startedAt: changedAt, completedAt: changedAt, cancelledAt: null });
  });

  it("marca cancelamento e remove uma conclusão anterior", () => {
    const result = applyOptimisticInterventionStatus({ ...baseItem, completedAt: "2026-08-24T12:00:00.000Z" }, "cancelled", changedAt);
    expect(result).toMatchObject({ status: "cancelled", completedAt: null, cancelledAt: changedAt });
  });

  it("preserva o início ao devolver uma intervenção para pendente", () => {
    const startedAt = "2026-08-21T12:00:00.000Z";
    const result = applyOptimisticInterventionStatus({ ...baseItem, status: "in_progress", startedAt }, "pending", changedAt);
    expect(result).toMatchObject({ status: "pending", startedAt, completedAt: null, cancelledAt: null });
  });
});
