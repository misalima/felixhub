"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { CouncilClassPrintDocument, CouncilPrintShell } from "@/components/class-council/CouncilPrintDocuments";
import type { ClassWorkspaceData } from "@/components/class-council/ClassWorkspace";
import { councilFetch } from "@/lib/class-council/client";

function Loading() {
  return <main className="grid min-h-[60vh] place-items-center"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" />Preparando o relatório da turma...</p></main>;
}

function ClassReportContent() {
  const params = useSearchParams();
  const councilId = params.get("conselho") ?? "";
  const classId = params.get("turma") ?? "";
  const [data, setData] = useState<ClassWorkspaceData | null>(null);
  const [error, setError] = useState("");
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!councilId || !classId) { setError("Selecione um Conselho e uma turma na Central de relatórios."); return; }
    let active = true;
    councilFetch<ClassWorkspaceData>(`/api/class-councils/${councilId}/classes/${classId}`).then((result) => { if (active) setData(result); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Falha ao carregar o relatório da turma."); });
    return () => { active = false; };
  }, [classId, councilId]);

  if (error) return <main className="mx-auto max-w-3xl p-8"><p className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />{error}</p></main>;
  if (!data) return <Loading />;
  const documentTitle = `Turma ${data.class.display_name} - Conselho de Classe - ${data.council.term}º Bimestre ${data.council.school_year}`;
  return <CouncilPrintShell backHref="/hub/relatorios" documentTitle={documentTitle} compact={compact} onCompactChange={setCompact}><CouncilClassPrintDocument data={data} /></CouncilPrintShell>;
}

export default function ClassReportPage() {
  return <Suspense fallback={<Loading />}><ClassReportContent /></Suspense>;
}
