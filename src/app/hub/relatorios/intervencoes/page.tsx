"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { InterventionWorkspace } from "@/components/interventions/InterventionWorkspace";

function Loading() {
  return <main className="grid min-h-[60vh] place-items-center"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" />Preparando o relatório...</p></main>;
}

function InterventionReportContent() {
  const params = useSearchParams();
  const mode = params.get("mode") === "compact" ? "compact" as const : "follow_up" as const;
  return <InterventionWorkspace readOnly backHref="/hub/relatorios" initialFilters={{ year: params.get("year") || "latest", classId: params.get("class") || "all", status: params.get("status") || "open", mode }} />;
}

export default function InterventionReportPage() {
  return <Suspense fallback={<Loading />}><InterventionReportContent /></Suspense>;
}
