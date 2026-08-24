"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { CouncilGeneralPrintDocument, CouncilPrintShell, type CouncilPrintOverviewData } from "@/components/class-council/CouncilPrintDocuments";
import { councilFetch } from "@/lib/class-council/client";

function Loading() {
  return <main className="grid min-h-[60vh] place-items-center"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" />Preparando o relatório...</p></main>;
}

function CouncilReportContent() {
  const councilId = useSearchParams().get("id") ?? "";
  const [data, setData] = useState<CouncilPrintOverviewData | null>(null);
  const [error, setError] = useState("");
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!councilId) { setError("Selecione um Conselho na Central de relatórios."); return; }
    let active = true;
    councilFetch<CouncilPrintOverviewData>(`/api/class-councils/${councilId}`).then((result) => { if (active) setData(result); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Falha ao carregar o relatório."); });
    return () => { active = false; };
  }, [councilId]);

  if (error) return <main className="mx-auto max-w-3xl p-8"><p className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />{error}</p></main>;
  if (!data) return <Loading />;
  const documentTitle = `Conselho de Classe - ${data.council.term}º Bimestre ${data.council.school_year}`;
  return <CouncilPrintShell backHref="/hub/relatorios" documentTitle={documentTitle} compact={compact} onCompactChange={setCompact}><CouncilGeneralPrintDocument data={data} compact={compact} /></CouncilPrintShell>;
}

export default function CouncilReportPage() {
  return <Suspense fallback={<Loading />}><CouncilReportContent /></Suspense>;
}
