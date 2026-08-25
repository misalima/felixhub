import { BEHAVIOR_LABELS } from "@/lib/class-council/constants";
import type { InterventionReportItem } from "@/types/intervention";

function truncate(value: string, maximumLength: number) {
  if (value.length <= maximumLength) return value;
  return `${value.slice(0, Math.max(0, maximumLength - 6)).trimEnd()} (...)`;
}

export function formatInterventionReason(item: InterventionReportItem, maximumLength: number) {
  const context = item.councilContext;
  if (!context) return null;

  const gradeLabel = `${context.lowGradeCount} ${context.lowGradeCount === 1 ? "nota baixa" : "notas baixas"}`;
  const behaviors = context.behaviors.map((behavior) => {
    const label = BEHAVIOR_LABELS[behavior.category] ?? behavior.category;
    const description = behavior.description?.trim();
    if (!description) return label;
    return behavior.category === "other" ? `Outro — ${description}` : `${label} — ${description}`;
  });
  const parts = [gradeLabel];
  if (behaviors.length) parts.push(`Comportamentos: ${behaviors.join(", ")}`);
  if (context.pedagogicalObservation?.trim()) parts.push(`Observação pedagógica: ${context.pedagogicalObservation.trim()}`);
  return truncate(parts.join(" · "), maximumLength);
}
