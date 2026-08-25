import type { InterventionStatus } from "@/types/class-council";
import type { InterventionReportItem } from "@/types/intervention";

export function applyOptimisticInterventionStatus(item: InterventionReportItem, status: InterventionStatus, changedAt: string): InterventionReportItem {
  return {
    ...item,
    status,
    updatedAt: changedAt,
    statusChangedAt: changedAt,
    startedAt: status === "in_progress" || status === "completed" ? item.startedAt ?? changedAt : item.startedAt,
    completedAt: status === "completed" ? changedAt : null,
    cancelledAt: status === "cancelled" ? changedAt : null,
  };
}
