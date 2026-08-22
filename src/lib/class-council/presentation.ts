import type { CouncilClassStatus } from "@/types/class-council";

export const classStatusLabels: Record<CouncilClassStatus, string> = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  completed: "Concluída",
};

export function classStatusBadgeClass(status: string): string {
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  }
  if (status === "in_progress") {
    return "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";
  }
  return "";
}

export function classStatusLabel(status: string): string {
  return classStatusLabels[status as CouncilClassStatus] ?? status;
}
