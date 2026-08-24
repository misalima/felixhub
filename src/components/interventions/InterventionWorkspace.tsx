"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CalendarClock, CheckCircle2, ClipboardCheck, Clock3, FileText, FilterX, Loader2, PencilLine, Printer, Search, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SCHOOL_LOCATION, SCHOOL_NAME } from "@/constants/main/school";
import { councilFetch } from "@/lib/class-council/client";
import { interventionClassGroupKey } from "@/lib/interventions/grouping";
import type { InterventionStatus } from "@/types/class-council";
import type { InterventionReportData, InterventionReportItem } from "@/types/intervention";

const statusLabels: Record<InterventionStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const statusClasses: Record<InterventionStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  in_progress: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  cancelled: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

type ReportMode = "follow_up" | "compact";

function formatDate(value: string | null) {
  return value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "Sem prazo";
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function localDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Maceio", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function isOpen(item: InterventionReportItem) {
  return item.status === "pending" || item.status === "in_progress";
}

function isOverdue(item: InterventionReportItem, today: string) {
  return isOpen(item) && Boolean(item.dueDate && item.dueDate < today);
}

function classGroupKey(item: InterventionReportItem) {
  return interventionClassGroupKey(item.origin);
}

export type InterventionWorkspaceFilters = {
  year?: string;
  status?: string;
  classId?: string;
  mode?: ReportMode;
};

export function InterventionWorkspace({ readOnly = false, initialFilters, backHref = "/hub" }: { readOnly?: boolean; initialFilters?: InterventionWorkspaceFilters; backHref?: string }) {
  const queryClient = useQueryClient();
  const { data, error, isPending } = useQuery({ queryKey: ["interventions"], queryFn: () => councilFetch<InterventionReportData>("/api/interventions") });
  const [year, setYear] = useState(initialFilters?.year ?? "latest");
  const [status, setStatus] = useState(initialFilters?.status ?? "open");
  const [classId, setClassId] = useState(initialFilters?.classId ?? "all");
  const [targetType, setTargetType] = useState("all");
  const [responsible, setResponsible] = useState("all");
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [mode, setMode] = useState<ReportMode>(initialFilters?.mode ?? "follow_up");
  const [editing, setEditing] = useState<InterventionReportItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const today = localDate();

  const years = useMemo(() => [...new Set((data?.items ?? []).map((item) => item.origin.schoolYear))].sort((a, b) => b - a), [data]);
  const effectiveYear = year === "latest" ? years[0] ?? null : Number(year);
  const yearItems = useMemo(() => (data?.items ?? []).filter((item) => effectiveYear === null || item.origin.schoolYear === effectiveYear), [data, effectiveYear]);
  const classes = useMemo(() => [...new Map(yearItems.map((item) => [classGroupKey(item), item.origin.className])).entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR")), [yearItems]);
  const responsibles = useMemo(() => [...new Set(yearItems.map((item) => item.responsibleName?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "pt-BR")), [yearItems]);

  useEffect(() => {
    if (classId !== "all" && !classes.some(([id]) => id === classId)) setClassId("all");
  }, [classId, classes]);

  const filtered = useMemo(() => {
    const query = normalize(search);
    return yearItems.filter((item) => {
      if (status === "open" && !isOpen(item)) return false;
      if (["pending", "in_progress", "completed", "cancelled"].includes(status) && item.status !== status) return false;
      if (classId !== "all" && classGroupKey(item) !== classId) return false;
      if (targetType !== "all" && item.targetType !== targetType) return false;
      if (responsible === "none" && item.responsibleName) return false;
      if (responsible !== "all" && responsible !== "none" && item.responsibleName !== responsible) return false;
      if (overdueOnly && !isOverdue(item, today)) return false;
      if (query && !normalize(`${item.student?.name ?? "intervenção coletiva"} ${item.student?.enrollmentNumber ?? ""} ${item.description} ${item.origin.className} ${item.responsibleName ?? ""}`).includes(query)) return false;
      return true;
    }).sort((a, b) => a.origin.className.localeCompare(b.origin.className, "pt-BR") || Number(a.targetType === "student") - Number(b.targetType === "student") || (a.student?.name ?? "").localeCompare(b.student?.name ?? "", "pt-BR") || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  }, [classId, overdueOnly, responsible, search, status, targetType, today, yearItems]);

  const groups = useMemo(() => [...filtered.reduce((map, item) => {
    const key = classGroupKey(item);
    const group = map.get(key) ?? { classId: key, className: item.origin.className, classCode: item.origin.classCode, items: [] as InterventionReportItem[] };
    group.items.push(item);
    map.set(key, group);
    return map;
  }, new Map<string, { classId: string; className: string; classCode: string; items: InterventionReportItem[] }>()).values()], [filtered]);

  const scoped = yearItems.filter((item) => classId === "all" || classGroupKey(item) === classId);
  const summary = {
    pending: scoped.filter((item) => item.status === "pending").length,
    inProgress: scoped.filter((item) => item.status === "in_progress").length,
    overdue: scoped.filter((item) => isOverdue(item, today)).length,
    withoutResponsible: scoped.filter((item) => isOpen(item) && !item.responsibleName).length,
    withoutDueDate: scoped.filter((item) => isOpen(item) && !item.dueDate).length,
  };

  useEffect(() => {
    const previous = document.title;
    document.title = `Intervenções ${effectiveYear ?? ""} - ${SCHOOL_NAME}`.trim();
    return () => { document.title = previous; };
  }, [effectiveYear]);

  async function patchStatus(item: InterventionReportItem, nextStatus: InterventionStatus) {
    setUpdatingId(item.id);
    try {
      await councilFetch(`/api/interventions/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["interventions"] }),
        queryClient.invalidateQueries({ queryKey: ["pedagogical-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["student-profile"] }),
      ]);
      toast.success(`Intervenção marcada como ${statusLabels[nextStatus].toLocaleLowerCase("pt-BR")}.`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível atualizar a intervenção.");
    } finally {
      setUpdatingId(null);
    }
  }

  function clearFilters() {
    setStatus("open"); setClassId("all"); setTargetType("all"); setResponsible("all"); setSearch(""); setOverdueOnly(false);
  }

  if (isPending) return <main className="mx-auto grid min-h-[70vh] max-w-7xl place-items-center p-6"><div className="text-center"><Loader2 className="mx-auto size-7 animate-spin text-sky-600" /><p className="mt-3 text-sm text-muted-foreground">Organizando as intervenções...</p></div></main>;
  if (error || !data) return <main className="mx-auto max-w-4xl p-8"><div className="rounded-2xl border border-rose-200 bg-white p-6 text-sm text-rose-700 dark:bg-slate-900"><AlertCircle className="mr-2 inline size-4" />{error instanceof Error ? error.message : "Não foi possível carregar as intervenções."}</div></main>;

  return <main className={`intervention-report-root mx-auto w-full max-w-7xl p-4 py-8 sm:p-6 lg:p-8 min-[1800px]:max-w-[1600px] min-[2400px]:max-w-[1800px] ${mode === "compact" ? "report-compact" : "report-follow-up"}`}>
    <div className="report-screen-only"><Link href={backHref} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" />{readOnly ? "Voltar aos relatórios" : "Voltar ao painel"}</Link>
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">{readOnly ? "Pré-visualização do documento" : "Acompanhamento operacional"}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{readOnly ? "Relatório de intervenções" : "Intervenções"}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{readOnly ? "Confira o recorte selecionado e escolha o formato antes de imprimir ou salvar em PDF." : "As decisões permanecem vinculadas ao Conselho de origem, mas seu andamento continua editável até a execução ou o cancelamento."}</p></div><div className="flex flex-wrap gap-2"><div className="flex rounded-xl border bg-white p-1 shadow-sm dark:bg-slate-900"><button type="button" onClick={() => setMode("follow_up")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${mode === "follow_up" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-muted-foreground"}`}>Acompanhamento</button><button type="button" onClick={() => setMode("compact")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${mode === "compact" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-muted-foreground"}`}>Compacto</button></div><Button className="rounded-xl" onClick={() => window.print()}><Printer className="size-4" />Imprimir ou salvar em PDF</Button></div></header>

      {!readOnly ? <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric icon={ClipboardCheck} value={summary.pending} label="pendentes" /><Metric icon={Clock3} value={summary.inProgress} label="em andamento" /><Metric icon={CalendarClock} value={summary.overdue} label="atrasadas" alert={summary.overdue > 0} /><Metric icon={UserRound} value={summary.withoutResponsible} label="sem responsável" /><Metric icon={FileText} value={summary.withoutDueDate} label="sem prazo" /></section> : null}

      {!readOnly ? <section className="mt-5 rounded-2xl border bg-white p-3 shadow-sm dark:bg-slate-900"><div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar estudante, intervenção, turma ou responsável" className="h-11 rounded-xl border-0 bg-slate-50 pl-10 pr-4 shadow-none dark:bg-slate-800/70" /></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><Select value={year} onValueChange={setYear}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="latest">Ano mais recente</SelectItem>{years.map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}</SelectContent></Select><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="open">Pendentes e em andamento</SelectItem><SelectItem value="all">Todos os status</SelectItem><SelectItem value="pending">Pendentes</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="completed">Concluídas</SelectItem><SelectItem value="cancelled">Canceladas</SelectItem></SelectContent></Select><Select value={classId} onValueChange={setClassId}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="all">Todas as turmas</SelectItem>{classes.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select><Select value={targetType} onValueChange={setTargetType}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="all">Individuais e coletivas</SelectItem><SelectItem value="student">Individuais</SelectItem><SelectItem value="class">Coletivas</SelectItem></SelectContent></Select><Select value={responsible} onValueChange={setResponsible}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="all">Todos os responsáveis</SelectItem><SelectItem value="none">Sem responsável</SelectItem>{responsibles.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} className="size-4 rounded border-slate-300 accent-sky-600" />Somente atrasadas</label><Button type="button" variant="ghost" size="sm" onClick={clearFilters}><FilterX className="size-4" />Limpar filtros</Button></div></section> : null}
    </div>

    <article className="intervention-print-document mt-6 bg-white text-slate-950 shadow-sm print:mt-0 print:shadow-none">
      <ReportHeader year={effectiveYear} count={filtered.length} mode={mode} generatedAt={data.generatedAt} />
      {groups.length ? <div className="report-groups">{groups.map((group, index) => <section key={group.classId} className={`report-group ${index ? "report-group-after-first" : ""}`}><div className="report-group-title flex items-center justify-between border-b-2 border-slate-800 pb-1.5"><div><h2 className="report-class-name text-base font-black">Turma {group.className}</h2><p className="report-class-meta text-[10px] text-slate-500">{group.classCode} · {group.items.length} {group.items.length === 1 ? "intervenção" : "intervenções"}</p></div><UsersRound className="report-class-icon size-4.5 text-slate-500" /></div>{mode === "compact" ? <CompactGroup items={group.items} updatingId={updatingId} onStatus={patchStatus} onEdit={setEditing} today={today} readOnly={readOnly} /> : <FollowUpGroup items={group.items} updatingId={updatingId} onStatus={patchStatus} onEdit={setEditing} today={today} readOnly={readOnly} />}</section>)}</div> : <div className="rounded-2xl border border-dashed p-12 text-center"><CheckCircle2 className="mx-auto size-8 text-slate-400" /><h2 className="mt-4 font-bold">Nenhuma intervenção nesta visão</h2><p className="mt-1 text-sm text-slate-500">Volte à Central de relatórios e ajuste o recorte.</p></div>}
      <footer className="mt-8 border-t border-slate-300 pt-2 text-[9px] text-slate-500">Documento operacional gerado pelo FelixHub. O Conselho de origem permanece como registro da decisão; o status reflete o acompanhamento atual.</footer>
    </article>
    {!readOnly ? <InterventionEditor item={editing} open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }} onSaved={async () => { await queryClient.invalidateQueries({ queryKey: ["interventions"] }); setEditing(null); }} /> : null}
    <style jsx global>{`
      @page { size: A4 ${mode === "compact" ? "landscape" : "portrait"}; margin: ${mode === "compact" ? "7mm" : "10mm"}; }
      .intervention-print-document { padding: 1.5rem; border: 1px solid rgb(226 232 240); border-radius: 1.5rem; }
      .report-compact .report-header { margin-bottom: .65rem; gap: .65rem; padding-bottom: .45rem; }
      .report-compact .report-logo { width: 2.65rem; height: 2.65rem; }
      .report-compact .report-school-name { font-size: .66rem; line-height: .85rem; }
      .report-compact .report-school-location, .report-compact .report-subtitle { font-size: .5rem; line-height: .7rem; }
      .report-compact .report-title { margin-top: .2rem; font-size: .95rem; line-height: 1.1rem; }
      .report-compact .report-group-title { padding-bottom: .25rem; border-bottom-width: 1px; }
      .report-compact .report-class-name { font-size: .8rem; line-height: 1rem; }
      .report-compact .report-class-meta { font-size: .48rem; line-height: .65rem; }
      .report-compact .report-class-icon { width: .8rem; height: .8rem; }
      .report-compact .print-status { padding: 1px 4px; font-size: .44rem; line-height: .65rem; }
      @media print {
        html, body { background: white !important; }
        .reports-app-header, .interventions-app-header, .report-screen-only { display: none !important; }
        .intervention-report-root { max-width: none !important; padding: 0 !important; }
        .intervention-print-document { border: 0 !important; border-radius: 0 !important; padding: 0 !important; }
        .report-follow-up .report-group-after-first { break-before: page; page-break-before: always; }
        .report-group-title { break-after: avoid; page-break-after: avoid; }
        .report-entry { break-inside: avoid; page-break-inside: avoid; }
        .screen-status-control { display: none !important; }
        .print-status { display: inline-flex !important; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
  </main>;
}

function Metric({ icon: Icon, value, label, alert = false }: { icon: typeof ClipboardCheck; value: number; label: string; alert?: boolean }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900"><div className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-xl ${alert ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}><Icon className="size-4" /></span><div><strong className="block text-xl font-black">{value.toLocaleString("pt-BR")}</strong><span className="text-[11px] text-muted-foreground">{label}</span></div></div></div>;
}

function ReportHeader({ year, count, mode, generatedAt }: { year: number | null; count: number; mode: ReportMode; generatedAt: string }) {
  return <header className="report-header mb-5 flex items-center gap-4 border-b-2 border-slate-900 pb-3"><Image src="/logo_escola.png" alt={`Logo da ${SCHOOL_NAME}`} width={64} height={64} className="report-logo size-14 object-contain" unoptimized /><div><p className="report-school-name text-xs font-bold uppercase tracking-wide">{SCHOOL_NAME}</p><p className="report-school-location text-[11px] text-slate-600">{SCHOOL_LOCATION}</p><h1 className="report-title mt-1 text-lg font-black">{mode === "compact" ? "Lista de intervenções" : "Plano de acompanhamento de intervenções"}</h1><p className="report-subtitle text-[11px] text-slate-600">{year ?? "Todos os anos"} · {count} {count === 1 ? "intervenção selecionada" : "intervenções selecionadas"} · gerado em {new Date(generatedAt).toLocaleString("pt-BR")}</p></div></header>;
}

function StatusControl({ item, updating, onStatus, onEdit, readOnly = false }: { item: InterventionReportItem; updating: boolean; onStatus: (item: InterventionReportItem, status: InterventionStatus) => void; onEdit: (item: InterventionReportItem) => void; readOnly?: boolean }) {
  if (readOnly) return <span className="print-status inline-flex rounded border border-slate-400 px-2 py-1 text-[9px] font-bold uppercase">{statusLabels[item.status]}</span>;
  return <><div className="screen-status-control flex items-center gap-1.5"><Select disabled={updating} value={item.status} onValueChange={(value) => onStatus(item, value as InterventionStatus)}><SelectTrigger className={`h-8 w-[142px] text-xs font-bold ${statusClasses[item.status]}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="completed">Concluída</SelectItem><SelectItem value="cancelled">Cancelada</SelectItem></SelectContent></Select><Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onEdit(item)}><PencilLine className="size-3.5" /><span className="sr-only">Editar acompanhamento</span></Button></div><span className="print-status hidden rounded border border-slate-400 px-2 py-1 text-[9px] font-bold uppercase">{statusLabels[item.status]}</span></>;
}

function ScopeName({ item, compact = false }: { item: InterventionReportItem; compact?: boolean }) {
  return item.student ? <div className={compact ? "leading-[1.05]" : undefined}><Link href={`/hub/alunos/${item.student.id}`} className={`${compact ? "text-[8px]" : ""} font-bold hover:underline print:no-underline`}>{item.student.name}</Link><p className={`${compact ? "mt-0.5 text-[7px] leading-[.6rem]" : "text-[10px]"} text-slate-500`}>Matrícula {item.student.enrollmentNumber}</p></div> : <div className={compact ? "leading-[1.05]" : undefined}><strong className={compact ? "text-[8px]" : undefined}>Intervenção coletiva</strong><p className={`${compact ? "mt-0.5 text-[7px] leading-[.6rem]" : "text-[10px]"} text-slate-500`}>Toda a turma</p></div>;
}

function FollowUpGroup({ items, updatingId, onStatus, onEdit, today, readOnly }: { items: InterventionReportItem[]; updatingId: string | null; onStatus: (item: InterventionReportItem, status: InterventionStatus) => void; onEdit: (item: InterventionReportItem) => void; today: string; readOnly: boolean }) {
  return <div className="mt-2.5 space-y-2">{items.map((item) => <div key={item.id} className="report-entry rounded-lg border border-slate-300 p-2.5"><div className="flex items-start justify-between gap-3"><ScopeName item={item} /><StatusControl item={item} updating={updatingId === item.id} onStatus={onStatus} onEdit={onEdit} readOnly={readOnly} /></div><p className="mt-2 text-[13px] font-medium leading-5">{item.description}</p><div className="mt-2 grid gap-1.5 text-[10px] text-slate-600 sm:grid-cols-3"><p><strong className="text-slate-800">Responsável:</strong> {item.responsibleName ?? "Não definido"}</p><p className={isOverdue(item, today) ? "font-bold text-rose-700" : ""}><strong className="text-slate-800">Prazo:</strong> {formatDate(item.dueDate)}{isOverdue(item, today) ? " · atrasada" : ""}</p><p><strong className="text-slate-800">Origem:</strong> {item.origin.term}º bimestre de {item.origin.schoolYear}</p></div>{item.outcome ? <p className="mt-2 rounded-md bg-emerald-50 p-1.5 text-[10px] text-emerald-900"><strong>Resultado:</strong> {item.outcome}</p> : null}{item.cancellationReason ? <p className="mt-2 rounded-md bg-slate-100 p-1.5 text-[10px] text-slate-700"><strong>Cancelamento:</strong> {item.cancellationReason}</p> : null}<div className="mt-2.5 hidden min-h-10 border-t border-dashed border-slate-300 pt-1.5 text-[8px] text-slate-400 print:block">Retorno, providências ou observações:</div></div>)}</div>;
}

function CompactGroup({ items, updatingId, onStatus, onEdit, today, readOnly }: { items: InterventionReportItem[]; updatingId: string | null; onStatus: (item: InterventionReportItem, status: InterventionStatus) => void; onEdit: (item: InterventionReportItem) => void; today: string; readOnly: boolean }) {
  return <div className="mt-1.5 overflow-x-auto"><table className="w-full min-w-[780px] table-fixed border-collapse text-[8.5px] leading-[1.05]"><colgroup><col className="w-[18%]" /><col className="w-[40%]" /><col className="w-[15%]" /><col className="w-[10%]" /><col className="w-[17%]" /></colgroup><thead><tr className="border-b border-slate-500 text-left text-[8px]"><th className="px-1 py-0.5">Estudante/escopo</th><th className="px-1 py-0.5">Intervenção</th><th className="px-1 py-0.5">Responsável</th><th className="px-1 py-0.5">Prazo</th><th className="px-1 py-0.5">Status/retorno</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="report-entry border-b border-slate-200 align-top"><td className="px-1 py-1"><ScopeName item={item} compact /></td><td className="px-1 py-1 leading-[.75rem]">{item.description}</td><td className="px-1 py-1 leading-[.75rem]">{item.responsibleName ?? "—"}</td><td className={`px-1 py-1 leading-[.75rem] ${isOverdue(item, today) ? "font-bold text-rose-700" : ""}`}>{formatDate(item.dueDate)}</td><td className="px-1 py-1"><StatusControl item={item} updating={updatingId === item.id} onStatus={onStatus} onEdit={onEdit} readOnly={readOnly} />{item.outcome ? <p className="mt-0.5 leading-[.7rem]">{item.outcome}</p> : item.cancellationReason ? <p className="mt-0.5 leading-[.7rem]">{item.cancellationReason}</p> : null}</td></tr>)}</tbody></table></div>;
}

function InterventionEditor({ item, open, onOpenChange, onSaved }: { item: InterventionReportItem | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState<InterventionStatus>("pending");
  const [responsibleName, setResponsibleName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [outcome, setOutcome] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setStatus(item.status); setResponsibleName(item.responsibleName ?? ""); setDueDate(item.dueDate ?? ""); setOutcome(item.outcome ?? ""); setCancellationReason(item.cancellationReason ?? "");
  }, [item]);

  async function save() {
    if (!item) return;
    setSaving(true);
    try {
      await councilFetch(`/api/interventions/${item.id}`, { method: "PATCH", body: JSON.stringify({ status, responsibleName, dueDate, outcome, cancellationReason }) });
      await onSaved();
      toast.success("Acompanhamento da intervenção atualizado.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível atualizar a intervenção.");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) onOpenChange(nextOpen); }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Atualizar intervenção</DialogTitle><DialogDescription>{item?.student?.name ?? "Intervenção coletiva"} · Turma {item?.origin.className}</DialogDescription></DialogHeader><div className="grid gap-4 py-4 sm:grid-cols-2"><div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={(value) => setStatus(value as InterventionStatus)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="completed">Concluída</SelectItem><SelectItem value="cancelled">Cancelada</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Prazo</Label><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div><div className="space-y-2 sm:col-span-2"><Label>Responsável</Label><Input value={responsibleName} onChange={(event) => setResponsibleName(event.target.value)} placeholder="Nome da pessoa ou equipe responsável" /></div>{status === "completed" ? <div className="space-y-2 sm:col-span-2"><Label>Resultado ou retorno</Label><Textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} rows={4} placeholder="Registre o que foi realizado e o retorno obtido." /></div> : null}{status === "cancelled" ? <div className="space-y-2 sm:col-span-2"><Label>Motivo do cancelamento</Label><Textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} rows={4} placeholder="Registre por que a intervenção não será executada." /></div> : null}</div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button type="button" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{saving ? "Salvando..." : "Salvar acompanhamento"}</Button></DialogFooter></DialogContent></Dialog>;
}
