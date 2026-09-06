"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { classCouncilQueryKeys } from "@/hooks/useClassCouncils";
import { councilFetch } from "@/lib/class-council/client";
import type { ImportPreviewResponse } from "@/types/class-council";

export default function ImportCouncilPage() {
  const { councilId } = useParams<{ councilId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmingRef = useRef(false);

  useEffect(() => {
    let active = true;
    councilFetch<{ preview: ImportPreviewResponse | null }>(`/api/class-councils/${councilId}/imports/preview`)
      .then((result) => {
        if (active) setPreview(result.preview);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Falha ao recuperar a prévia pendente.");
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => { active = false; };
  }, [councilId]);

  async function upload() {
    if (!file) return; setBusy(true); setError("");
    try { const form = new FormData(); form.append("file", file); setPreview(await councilFetch(`/api/class-councils/${councilId}/imports/preview`, { method: "POST", body: form })); setShowAllIssues(false); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha ao processar."); } finally { setBusy(false); }
  }
  async function confirm() {
    if (!preview || confirmingRef.current) return; confirmingRef.current = true; setBusy(true); setError("");
    try { const displayNames = Object.fromEntries(preview.classes.map((item) => [item.officialCode, item.displayName])); await councilFetch(`/api/class-councils/${councilId}/imports/${preview.importId}/confirm`, { method: "POST", body: JSON.stringify({ displayNames }) }); await Promise.all([queryClient.invalidateQueries({ queryKey: classCouncilQueryKeys.council(councilId), refetchType: "all" }), queryClient.invalidateQueries({ queryKey: classCouncilQueryKeys.list(), refetchType: "all" })]); toast.success(preview.comparison ? `Versão ${preview.version} ativada com sucesso.` : "Relatório importado com sucesso."); router.push(`/hub/conselhos/${councilId}`); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Falha ao confirmar."); } finally { confirmingRef.current = false; setBusy(false); }
  }
  function choose(event: ChangeEvent<HTMLInputElement>) { setFile(event.target.files?.[0] ?? null); setPreview(null); setShowAllIssues(false); setError(""); }
  const blocked = (preview?.summary.blockingErrorCount ?? 0) > 0;
  const visibleIssues = preview ? (showAllIssues ? preview.issues : preview.issues.slice(0, 10)) : [];
  return <main className="mx-auto max-w-5xl p-4 py-8 sm:p-8"><Button variant="ghost" asChild className="mb-5"><Link href={`/hub/conselhos/${councilId}`}><ArrowLeft className="h-4 w-4" />Voltar</Link></Button><div className="rounded-2xl border bg-white p-6 dark:bg-card"><div className="mb-6"><h1 className="text-xl font-bold">Importar Relatório de Desempenho</h1><p className="mt-1 text-sm text-muted-foreground">O arquivo original será guardado em armazenamento privado e reprocessado na confirmação. Em uma nova versão, registros pedagógicos, participantes e professores são preservados.</p></div>{restoring && <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Recuperando prévia pendente...</p>}<label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-8 text-center hover:border-primary/50"><FileSpreadsheet className="mb-3 h-10 w-10 text-primary" /><span className="font-medium">{file?.name ?? "Selecionar arquivo .xlsx"}</span><span className="mt-1 text-sm text-muted-foreground">Máximo de 25 MiB</span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={choose} /></label><Button className="mt-4" onClick={upload} disabled={!file || busy || restoring}>{busy && !preview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Gerar prévia</Button>{error && <p className="mt-4 flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</p>}</div>
    {preview && <section className="mt-6 space-y-5"><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["Turmas",preview.summary.classCount],["Estudantes",preview.summary.studentCount],["Disciplinas",preview.summary.subjectCount],["Resultados",preview.summary.resultCount]].map(([label,value]) => <div key={label} className="rounded-xl border bg-white p-4 dark:bg-card"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div><div className="rounded-2xl border bg-white p-5 dark:bg-card"><h2 className="font-semibold">Turmas reconhecidas</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{preview.classes.map((item) => <div key={item.officialCode} className="rounded-lg bg-muted/60 p-3"><strong>{item.displayName}</strong><span className="ml-2 text-sm text-muted-foreground">{item.officialCode}</span><p className="mt-1 text-sm text-muted-foreground">{item.studentCount} estudantes · {item.subjectCount} disciplinas</p></div>)}</div></div>{preview.comparison && <div className="rounded-2xl border bg-white p-5 dark:bg-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Comparação com a versão {preview.comparison.previousVersion}</h2><p className="mt-1 text-sm text-muted-foreground">A nova prévia será salva como versão {preview.version}. Apenas dados do SIGEduc serão atualizados.</p></div><Badge variant="outline">{preview.comparison.totalChanges} alterações</Badge></div>{preview.comparison.groups.length === 0 ? <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">Nenhuma diferença acadêmica foi encontrada. Ainda assim, o arquivo pode ser confirmado como uma nova versão para auditoria.</div> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{preview.comparison.groups.map((group) => <div key={group.category} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-3"><strong className="text-sm">{group.label}</strong><Badge variant="secondary">{group.count}</Badge></div><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{group.examples.map((example) => <li key={example}>{example}</li>)}</ul>{group.count > group.examples.length && <p className="mt-2 text-sm font-medium text-muted-foreground">+ {group.count - group.examples.length} outras alterações</p>}</div>)}</div>}</div>}{preview.issues.length > 0 && <div className="rounded-2xl border bg-white p-5 dark:bg-card"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Validação</h2><span className="text-sm text-muted-foreground">Mostrando {visibleIssues.length} de {preview.issues.length}</span></div><div className="mt-3 space-y-2">{visibleIssues.map((issue, index) => <div key={`${issue.code}-${index}`} className={`flex gap-2 rounded-lg p-3 text-sm ${issue.severity === "error" ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"}`}>{issue.severity === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}<span><strong>{issue.classCode ? `${issue.classCode}: ` : ""}</strong>{issue.message}</span></div>)}</div>{preview.issues.length > 10 && <Button variant="ghost" size="sm" className="mt-3 px-0" onClick={() => setShowAllIssues((current) => !current)}>{showAllIssues ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{showAllIssues ? "Mostrar apenas os 10 primeiros" : `Ver todos os ${preview.issues.length} itens`}</Button>}</div>}<div className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-5 dark:bg-card"><div className="flex items-center gap-3">{blocked ? <AlertCircle className="h-6 w-6 text-destructive" /> : <CheckCircle2 className="h-6 w-6 text-emerald-600" />}<div><p className="font-medium">{blocked ? "Corrija os erros antes de confirmar" : "Prévia pronta para confirmação"}</p><p className="text-sm text-muted-foreground">{preview.summary.warningCount} avisos · {preview.summary.blockingErrorCount} erros bloqueantes</p></div></div><Button onClick={confirm} disabled={blocked || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{preview.comparison ? "Confirmar nova versão" : "Confirmar importação"}</Button></div></section>}
  </main>;
}
