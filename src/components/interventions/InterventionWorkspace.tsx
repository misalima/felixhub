"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, type InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CalendarClock, CheckCircle2, ClipboardCheck, Clock3, FileText, FilterX, Loader2, PencilLine, Plus, Printer, Search, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SCHOOL_LOCATION, SCHOOL_NAME } from "@/constants/main/school";
import { useDebounce } from "@/hooks/useDebounce";
import { councilFetch } from "@/lib/class-council/client";
import { interventionClassGroupKey } from "@/lib/interventions/grouping";
import { applyOptimisticInterventionStatus } from "@/lib/interventions/optimistic";
import { formatInterventionReason } from "@/lib/interventions/reason";
import type { InterventionStatus } from "@/types/class-council";
import type { InterventionReportData, InterventionReportItem } from "@/types/intervention";
import type { StudentDirectoryData } from "@/types/student-directory";

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
  const classReference = item.targetClass ?? item.origin;
  return classReference ? interventionClassGroupKey({ schoolYear: classReference.schoolYear, classCode: classReference.classCode, className: classReference.className }) : `${item.createdAt.slice(0, 4)}:sem-turma`;
}

function interventionClass(item: InterventionReportItem) {
  return item.targetClass ?? (item.origin ? { schoolYear: item.origin.schoolYear, className: item.origin.className, classCode: item.origin.classCode } : null);
}

function interventionOriginLabel(item: InterventionReportItem) {
  if (item.sourceType === "class_council") return `${item.origin.term}º bimestre de ${item.origin.schoolYear}`;
  return item.sourceType === "student_profile" ? "Prontuário do estudante" : "Central de intervenções";
}

function InterventionWorkspaceSkeleton() {
  return <main aria-label="Carregando intervenções" className="mx-auto w-full max-w-7xl p-4 py-8 sm:p-6 lg:p-8">
    <Skeleton className="mb-6 h-4 w-36" />
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="space-y-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-[38rem] max-w-full" /></div><Skeleton className="h-11 w-72 max-w-full rounded-xl" /></div>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="rounded-2xl border bg-white p-4 dark:bg-slate-900"><Skeleton className="size-9 rounded-xl" /><Skeleton className="mt-3 h-7 w-14" /><Skeleton className="mt-2 h-3 w-24" /></div>)}</section>
    <section className="mt-5 rounded-2xl border bg-white p-3 dark:bg-slate-900"><Skeleton className="h-11 w-full rounded-xl" /><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div></section>
    <section className="mt-6 rounded-3xl border bg-white p-6 dark:bg-slate-900"><div className="flex items-center gap-4"><Skeleton className="size-14 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-52" /><Skeleton className="h-7 w-72 max-w-full" /></div></div><div className="mt-7 space-y-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-24 w-full rounded-xl" />)}</div></section>
  </main>;
}

export type InterventionWorkspaceFilters = {
  year?: string;
  status?: string;
  classIds?: string[];
  mode?: ReportMode;
  targetType?: string;
  responsible?: string;
  search?: string;
  overdueOnly?: boolean;
};

export function InterventionWorkspace({ readOnly = false, initialFilters, backHref = "/hub" }: { readOnly?: boolean; initialFilters?: InterventionWorkspaceFilters; backHref?: string }) {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(initialFilters?.year ?? "latest");
  const [status, setStatus] = useState(initialFilters?.status ?? "open");
  const [classIds, setClassIds] = useState<string[]>(initialFilters?.classIds ?? []);
  const [targetType, setTargetType] = useState(initialFilters?.targetType ?? "all");
  const [responsible, setResponsible] = useState(initialFilters?.responsible ?? "all");
  const [search, setSearch] = useState(initialFilters?.search ?? "");
  const [overdueOnly, setOverdueOnly] = useState(initialFilters?.overdueOnly ?? false);
  const [mode, setMode] = useState<ReportMode>(initialFilters?.mode ?? "follow_up");
  const [showReasons, setShowReasons] = useState(true);
  const [editing, setEditing] = useState<InterventionReportItem | null>(null);
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const today = localDate();
  const interventionsQuery = useInfiniteQuery({
    queryKey: ["interventions", "workspace", readOnly ? "report" : "operational", year, status, classIds, targetType, responsible, overdueOnly, debouncedSearch.trim()],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ year, status, targetType, responsible, cursor: String(pageParam), limit: "40" });
      for (const classKey of classIds) params.append("class", classKey);
      if (overdueOnly) params.set("overdue", "1");
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (readOnly) params.set("all", "1");
      return councilFetch<InterventionReportData>(`/api/interventions?${params}`);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 30 * 1000,
  });
  const { error, isPending, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage } = interventionsQuery;
  const firstPage = interventionsQuery.data?.pages[0];
  const data = firstPage ? { ...firstPage, items: interventionsQuery.data!.pages.flatMap((page) => page.items), nextCursor: interventionsQuery.data!.pages.at(-1)?.nextCursor ?? null } : undefined;

  const statusMutation = useMutation({
    mutationFn: ({ item, nextStatus }: { item: InterventionReportItem; nextStatus: InterventionStatus }) => councilFetch(`/api/interventions/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) }),
    onMutate: async ({ item, nextStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["interventions"] });
      const previous = queryClient.getQueriesData<InfiniteData<InterventionReportData>>({ queryKey: ["interventions", "workspace"] });
      const changedAt = new Date().toISOString();
      queryClient.setQueriesData<InfiniteData<InterventionReportData>>({ queryKey: ["interventions", "workspace"] }, (current) => current ? {
        ...current,
        pages: current.pages.map((page) => ({ ...page, items: page.items.map((currentItem) => currentItem.id === item.id ? applyOptimisticInterventionStatus(currentItem, nextStatus, changedAt) : currentItem) })),
      } : current);
      return { previous };
    },
    onError: (reason, _variables, context) => {
      for (const [queryKey, previous] of context?.previous ?? []) queryClient.setQueryData(queryKey, previous);
      toast.error(reason instanceof Error ? reason.message : "Não foi possível atualizar a intervenção.");
    },
    onSuccess: (_data, { nextStatus }) => {
      toast.success(`Intervenção marcada como ${statusLabels[nextStatus].toLocaleLowerCase("pt-BR")}.`);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["interventions"] });
      void queryClient.invalidateQueries({ queryKey: ["pedagogical-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["student-profile"] });
    },
  });
  const updatingId = statusMutation.isPending ? statusMutation.variables?.item.id ?? null : null;

  const years = data?.meta.years ?? [];
  const effectiveYear = data?.meta.effectiveYear ?? (year === "latest" ? null : Number(year));
  const classes = useMemo(() => (data?.meta.classes ?? []).filter((item) => effectiveYear === null || item.year === effectiveYear).map((item) => [item.key, item.name] as [string, string]), [data?.meta.classes, effectiveYear]);
  const responsibles = useMemo(() => (data?.meta.responsibles ?? []).filter((item) => effectiveYear === null || item.year === effectiveYear).map((item) => item.name), [data?.meta.responsibles, effectiveYear]);

  useEffect(() => {
    if (!firstPage) return;
    setClassIds((current) => {
      const validSelection = current.filter((selected) => classes.some(([id]) => id === selected));
      return validSelection.length === current.length ? current : validSelection;
    });
  }, [classes, firstPage]);

  const filtered = useMemo(() => [...(data?.items ?? [])].sort((a, b) => (interventionClass(a)?.className ?? "Sem turma vinculada").localeCompare(interventionClass(b)?.className ?? "Sem turma vinculada", "pt-BR") || Number(a.targetType === "student") - Number(b.targetType === "student") || (a.student?.name ?? "").localeCompare(b.student?.name ?? "", "pt-BR") || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")), [data?.items]);

  const groups = useMemo(() => [...filtered.reduce((map, item) => {
    const key = classGroupKey(item);
    const targetClass = interventionClass(item);
    const group = map.get(key) ?? { classId: key, className: targetClass?.className ?? "Sem turma vinculada", classCode: targetClass?.classCode ?? "", items: [] as InterventionReportItem[] };
    group.items.push(item);
    map.set(key, group);
    return map;
  }, new Map<string, { classId: string; className: string; classCode: string; items: InterventionReportItem[] }>()).values()], [filtered]);

  const summary = data?.meta.summary ?? { pending: 0, inProgress: 0, overdue: 0, withoutResponsible: 0, withoutDueDate: 0 };

  useEffect(() => {
    const previous = document.title;
    document.title = `Intervenções ${effectiveYear ?? ""} - ${SCHOOL_NAME}`.trim();
    return () => { document.title = previous; };
  }, [effectiveYear]);

  function patchStatus(item: InterventionReportItem, nextStatus: InterventionStatus) {
    if (item.status === nextStatus || statusMutation.isPending) return;
    statusMutation.mutate({ item, nextStatus });
  }

  function clearFilters() {
    setStatus("open"); setClassIds([]); setTargetType("all"); setResponsible("all"); setSearch(""); setOverdueOnly(false);
  }

  if (isPending) return <InterventionWorkspaceSkeleton />;
  if (error || !data) return <main className="mx-auto max-w-4xl p-8"><div className="rounded-2xl border border-rose-200 bg-white p-6 text-sm text-rose-700 dark:bg-slate-900"><AlertCircle className="mr-2 inline size-4" />{error instanceof Error ? error.message : "Não foi possível carregar as intervenções."}</div></main>;

  const reportParams = new URLSearchParams({ year, status, targetType, responsible, mode: "follow_up" });
  for (const classKey of classIds) reportParams.append("class", classKey);
  if (overdueOnly) reportParams.set("overdue", "1");
  if (search.trim()) reportParams.set("q", search.trim());
  const reportHref = `/hub/relatorios/intervencoes?${reportParams.toString()}`;

  return <main className={`intervention-report-root mx-auto w-full max-w-7xl p-4 py-8 sm:p-6 lg:p-8 min-[1800px]:max-w-[1600px] min-[2400px]:max-w-[1800px] ${mode === "compact" ? "report-compact" : "report-follow-up"}`}>
    <div className="report-screen-only"><div className="mb-5 flex items-center justify-between gap-3"><Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" />{readOnly ? "Voltar aos relatórios" : "Voltar ao painel"}</Link><div className="flex items-center gap-2">{isFetching ? <span role="status" className="flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-300"><Loader2 className="size-3.5 animate-spin" />Atualizando</span> : null}{!readOnly ? <><Button asChild type="button" variant="outline" className="rounded-xl"><Link href={reportHref}><Printer className="size-4" />Abrir relatório</Link></Button><Button type="button" className="rounded-xl" onClick={() => setCreating(true)}><Plus className="size-4" />Nova intervenção</Button></> : null}</div></div>
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">{readOnly ? "Pré-visualização do documento" : "Acompanhamento operacional"}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{readOnly ? "Relatório de intervenções" : "Intervenções"}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{readOnly ? "Confira o recorte selecionado e escolha o formato antes de imprimir ou salvar em PDF." : "Acompanhe em um só lugar as ações definidas nos Conselhos e as registradas diretamente para os estudantes."}</p></div>{readOnly ? <div className="flex flex-wrap gap-2"><div className="flex rounded-xl border bg-white p-1 shadow-sm dark:bg-slate-900"><button type="button" onClick={() => setMode("follow_up")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${mode === "follow_up" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-muted-foreground"}`}>Acompanhamento</button><button type="button" onClick={() => setMode("compact")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${mode === "compact" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-muted-foreground"}`}>Compacto</button></div><button type="button" role="switch" aria-checked={showReasons} onClick={() => setShowReasons((current) => !current)} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 text-xs font-bold text-slate-700 shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"><span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition-colors ${showReasons ? "bg-sky-600" : "bg-slate-300 dark:bg-slate-700"}`}><span className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${showReasons ? "translate-x-4" : "translate-x-0"}`} /></span>Mostrar motivos</button><Button className="rounded-xl" onClick={() => window.print()}><Printer className="size-4" />Imprimir ou salvar em PDF</Button></div> : null}</header>

      {!readOnly ? <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric icon={ClipboardCheck} value={summary.pending} label="pendentes" /><Metric icon={Clock3} value={summary.inProgress} label="em andamento" /><Metric icon={CalendarClock} value={summary.overdue} label="atrasadas" alert={summary.overdue > 0} /><Metric icon={UserRound} value={summary.withoutResponsible} label="sem responsável" /><Metric icon={FileText} value={summary.withoutDueDate} label="sem prazo" /></section> : null}

      {!readOnly ? <section className="mt-5 rounded-2xl border bg-white p-3 shadow-sm dark:bg-slate-900"><div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar estudante, intervenção, turma ou responsável" className="h-11 rounded-xl border-0 bg-slate-50 pl-10 pr-4 shadow-none dark:bg-slate-800/70" /></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><Select value={year} onValueChange={setYear}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="latest">Ano mais recente</SelectItem>{years.map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}</SelectContent></Select><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="open">Pendentes e em andamento</SelectItem><SelectItem value="all">Todos os status</SelectItem><SelectItem value="pending">Pendentes</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="completed">Concluídas</SelectItem><SelectItem value="cancelled">Canceladas</SelectItem></SelectContent></Select><Select value={classIds[0] ?? "all"} onValueChange={(value) => setClassIds(value === "all" ? [] : [value])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="all">Todas as turmas</SelectItem>{classes.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select><Select value={targetType} onValueChange={setTargetType}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="all">Individuais e coletivas</SelectItem><SelectItem value="student">Individuais</SelectItem><SelectItem value="class">Coletivas</SelectItem></SelectContent></Select><Select value={responsible} onValueChange={setResponsible}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="all">Todos os responsáveis</SelectItem><SelectItem value="none">Sem responsável</SelectItem>{responsibles.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} className="size-4 rounded border-slate-300 accent-sky-600" />Somente atrasadas</label><Button type="button" variant="ghost" size="sm" onClick={clearFilters}><FilterX className="size-4" />Limpar filtros</Button></div></section> : null}
    </div>

    <article className={readOnly ? "intervention-print-document mt-6 bg-white text-slate-950 shadow-sm print:mt-0 print:shadow-none" : "intervention-operational-list mt-6"}>
      {readOnly ? <ReportHeader year={effectiveYear} count={data.total} mode={mode} generatedAt={data.generatedAt} /> : null}
      {groups.length ? <div className={readOnly ? "report-groups" : "space-y-4"}>{groups.map((group, index) => <section key={group.classId} className={readOnly ? `report-group ${index ? "report-group-after-first" : ""}` : "rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 sm:p-5"}><div className={`report-group-title flex items-center justify-between ${readOnly ? "border-b-2 border-slate-800 pb-1.5" : "border-b pb-3 dark:border-slate-700"}`}><div><h2 className="report-class-name text-base font-black">Turma {group.className}</h2><p className="report-class-meta text-[10px] text-slate-500 dark:text-slate-400">{group.classCode} · {group.items.length} {group.items.length === 1 ? "intervenção" : "intervenções"}</p></div><UsersRound className="report-class-icon size-4.5 text-slate-500 dark:text-slate-400" /></div>{readOnly && mode === "compact" ? <CompactGroup items={group.items} updatingId={updatingId} onStatus={patchStatus} onEdit={setEditing} today={today} readOnly showReasons={showReasons} /> : <FollowUpGroup items={group.items} updatingId={updatingId} onStatus={patchStatus} onEdit={setEditing} today={today} readOnly={readOnly} showReasons={readOnly ? showReasons : true} />}</section>)}</div> : <div className="rounded-2xl border border-dashed bg-white p-12 text-center dark:bg-slate-900"><CheckCircle2 className="mx-auto size-8 text-slate-400" /><h2 className="mt-4 font-bold">Nenhuma intervenção nesta visão</h2><p className="mt-1 text-sm text-muted-foreground">{readOnly ? "Ajuste os filtros na Central de relatórios para montar o documento." : "Crie a primeira intervenção ou ajuste os filtros acima."}</p>{!readOnly ? <Button type="button" className="mt-5 rounded-xl print:hidden" onClick={() => setCreating(true)}><Plus className="size-4" />Criar intervenção</Button> : null}</div>}
      {!readOnly && hasNextPage ? <Button type="button" variant="outline" className="mt-5 w-full rounded-xl print:hidden" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : null}{isFetchingNextPage ? "Carregando..." : `Carregar mais (${filtered.length} de ${data.total})`}</Button> : null}
      {readOnly ? <footer className="mt-8 border-t border-slate-300 pt-2 text-[9px] text-slate-500">Documento operacional gerado pelo FelixHub. A origem identifica onde a ação foi definida; o status reflete o acompanhamento atual.</footer> : null}
    </article>
    {!readOnly ? <><InterventionEditor item={editing} open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }} onSaved={() => { setEditing(null); void queryClient.invalidateQueries({ queryKey: ["interventions"] }); void queryClient.invalidateQueries({ queryKey: ["pedagogical-dashboard"] }); void queryClient.invalidateQueries({ queryKey: ["student-profile"] }); }} /><CentralInterventionCreator open={creating} onOpenChange={setCreating} onCreated={() => { void queryClient.invalidateQueries({ queryKey: ["interventions"] }); void queryClient.invalidateQueries({ queryKey: ["pedagogical-dashboard"] }); void queryClient.invalidateQueries({ queryKey: ["student-profile"] }); }} /></> : null}
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
      @media screen {
        .dark .intervention-operational-list .report-entry {
          border-color: rgb(51 65 85);
          background: rgb(2 6 23 / .25);
        }
        .dark .intervention-operational-list .text-slate-800 {
          color: rgb(241 245 249);
        }
        .dark .intervention-operational-list .text-slate-700,
        .dark .intervention-operational-list .text-slate-600 {
          color: rgb(203 213 225);
        }
        .dark .intervention-operational-list .text-slate-500 {
          color: rgb(148 163 184);
        }
        .dark .intervention-operational-list .border-slate-300 {
          border-color: rgb(51 65 85);
        }
        .dark .intervention-operational-list .bg-slate-100 {
          background: rgb(30 41 59);
        }
        .dark .intervention-operational-list .bg-emerald-50 {
          background: rgb(6 78 59 / .35);
          color: rgb(167 243 208);
        }
      }
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
  return <><div className="screen-status-control flex items-center gap-1.5"><div className="relative"><Select disabled={updating} value={item.status} onValueChange={(value) => onStatus(item, value as InterventionStatus)}><SelectTrigger className={`h-8 w-[142px] text-xs font-bold ${updating ? "pr-9" : ""} ${statusClasses[item.status]}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="completed">Concluída</SelectItem><SelectItem value="cancelled">Cancelada</SelectItem></SelectContent></Select>{updating ? <Loader2 aria-label="Salvando status" className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin" /> : null}</div><Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onEdit(item)} disabled={updating}><PencilLine className="size-3.5" /><span className="sr-only">Editar acompanhamento</span></Button></div><span className="print-status hidden rounded border border-slate-400 px-2 py-1 text-[9px] font-bold uppercase">{statusLabels[item.status]}</span></>;
}

function ScopeName({ item, compact = false }: { item: InterventionReportItem; compact?: boolean }) {
  return item.student ? <div className={compact ? "leading-[1.05]" : undefined}><Link href={`/hub/alunos/${item.student.id}`} className={`${compact ? "text-[8px]" : ""} font-bold hover:underline print:no-underline`}>{item.student.name}</Link><p className={`${compact ? "mt-0.5 text-[7px] leading-[.6rem]" : "text-[10px]"} text-slate-500`}>Matrícula {item.student.enrollmentNumber}</p></div> : <div className={compact ? "leading-[1.05]" : undefined}><strong className={compact ? "text-[8px]" : undefined}>Intervenção coletiva</strong><p className={`${compact ? "mt-0.5 text-[7px] leading-[.6rem]" : "text-[10px]"} text-slate-500`}>Toda a turma</p></div>;
}

function FollowUpGroup({ items, updatingId, onStatus, onEdit, today, readOnly, showReasons }: { items: InterventionReportItem[]; updatingId: string | null; onStatus: (item: InterventionReportItem, status: InterventionStatus) => void; onEdit: (item: InterventionReportItem) => void; today: string; readOnly: boolean; showReasons: boolean }) {
  return <div className="mt-2.5 space-y-2">{items.map((item) => { const reason = showReasons ? formatInterventionReason(item, 260) : null; return <div key={item.id} className="report-entry rounded-lg border border-slate-300 p-2.5"><div className="flex items-start justify-between gap-3"><ScopeName item={item} /><StatusControl item={item} updating={updatingId === item.id} onStatus={onStatus} onEdit={onEdit} readOnly={readOnly} /></div><p className="mt-2 text-[13px] font-medium leading-5">{item.description}</p>{reason ? <p className="mt-1.5 text-[10px] leading-4 text-slate-600"><strong className="text-slate-800">Motivo:</strong> {reason}</p> : null}<div className="mt-2 grid gap-1.5 text-[10px] text-slate-600 sm:grid-cols-3"><p><strong className="text-slate-800">Responsável:</strong> {item.responsibleName ?? "Não definido"}</p><p className={isOverdue(item, today) ? "font-bold text-rose-700" : ""}><strong className="text-slate-800">Prazo:</strong> {formatDate(item.dueDate)}{isOverdue(item, today) ? " · atrasada" : ""}</p><p><strong className="text-slate-800">Origem:</strong> {interventionOriginLabel(item)}</p></div>{item.outcome ? <p className="mt-2 rounded-md bg-emerald-50 p-1.5 text-[10px] text-emerald-900"><strong>Resultado:</strong> {item.outcome}</p> : null}{item.cancellationReason ? <p className="mt-2 rounded-md bg-slate-100 p-1.5 text-[10px] text-slate-700"><strong>Cancelamento:</strong> {item.cancellationReason}</p> : null}<div className="mt-2.5 hidden min-h-10 border-t border-dashed border-slate-300 pt-1.5 text-[8px] text-slate-400 print:block">Retorno, providências ou observações:</div></div>; })}</div>;
}

function CompactGroup({ items, updatingId, onStatus, onEdit, today, readOnly, showReasons }: { items: InterventionReportItem[]; updatingId: string | null; onStatus: (item: InterventionReportItem, status: InterventionStatus) => void; onEdit: (item: InterventionReportItem) => void; today: string; readOnly: boolean; showReasons: boolean }) {
  return <div className="mt-1.5 overflow-x-auto"><table className="w-full min-w-[780px] table-fixed border-collapse text-[8.5px] leading-[1.05]"><colgroup><col className="w-[18%]" /><col className="w-[40%]" /><col className="w-[15%]" /><col className="w-[10%]" /><col className="w-[17%]" /></colgroup><thead><tr className="border-b border-slate-500 text-left text-[8px]"><th className="px-1 py-0.5">Estudante/escopo</th><th className="px-1 py-0.5">{showReasons ? "Intervenção/motivo" : "Intervenção"}</th><th className="px-1 py-0.5">Responsável</th><th className="px-1 py-0.5">Prazo</th><th className="px-1 py-0.5">Status/retorno</th></tr></thead><tbody>{items.map((item) => { const reason = showReasons ? formatInterventionReason(item, 125) : null; return <tr key={item.id} className="report-entry border-b border-slate-200 align-top"><td className="px-1 py-1"><ScopeName item={item} compact /></td><td className="px-1 py-1 leading-[.75rem]">{item.description}{reason ? <p className="mt-0.5 text-[7px] leading-[.62rem] text-slate-500"><strong>Motivo:</strong> {reason}</p> : null}</td><td className="px-1 py-1 leading-[.75rem]">{item.responsibleName ?? "—"}</td><td className={`px-1 py-1 leading-[.75rem] ${isOverdue(item, today) ? "font-bold text-rose-700" : ""}`}>{formatDate(item.dueDate)}</td><td className="px-1 py-1"><StatusControl item={item} updating={updatingId === item.id} onStatus={onStatus} onEdit={onEdit} readOnly={readOnly} />{item.outcome ? <p className="mt-0.5 leading-[.7rem]">{item.outcome}</p> : item.cancellationReason ? <p className="mt-0.5 leading-[.7rem]">{item.cancellationReason}</p> : null}</td></tr>; })}</tbody></table></div>;
}

function InterventionEditor({ item, open, onOpenChange, onSaved }: { item: InterventionReportItem | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
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
      onSaved();
      toast.success("Acompanhamento da intervenção atualizado.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível atualizar a intervenção.");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) onOpenChange(nextOpen); }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Atualizar intervenção</DialogTitle><DialogDescription>{item?.student?.name ?? "Intervenção coletiva"}{item ? ` · Turma ${interventionClass(item)?.className ?? "não vinculada"}` : ""}</DialogDescription></DialogHeader><div className="grid gap-4 py-4 sm:grid-cols-2"><div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={(value) => setStatus(value as InterventionStatus)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="completed">Concluída</SelectItem><SelectItem value="cancelled">Cancelada</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Prazo</Label><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div><div className="space-y-2 sm:col-span-2"><Label>Responsável</Label><Input value={responsibleName} onChange={(event) => setResponsibleName(event.target.value)} placeholder="Nome da pessoa ou equipe responsável" /></div>{status === "completed" ? <div className="space-y-2 sm:col-span-2"><Label>Resultado ou retorno</Label><Textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} rows={4} placeholder="Registre o que foi realizado e o retorno obtido." /></div> : null}{status === "cancelled" ? <div className="space-y-2 sm:col-span-2"><Label>Motivo do cancelamento</Label><Textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} rows={4} placeholder="Registre por que a intervenção não será executada." /></div> : null}</div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button type="button" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{saving ? "Salvando..." : "Salvar acompanhamento"}</Button></DialogFooter></DialogContent></Dialog>;
}

function CentralInterventionCreator({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }) {
  const studentsQuery = useQuery({ queryKey: ["student-directory"], queryFn: () => councilFetch<StudentDirectoryData>("/api/students"), enabled: open, staleTime: 2 * 60 * 1000 });
  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const normalizedSearch = studentSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
  const results = (studentsQuery.data?.students ?? []).filter((student) => normalizedSearch.length >= 2 && `${student.name} ${student.enrollmentNumber} ${student.current?.className ?? ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(normalizedSearch)).slice(0, 10);
  const selectedStudent = studentsQuery.data?.students.find((student) => student.studentId === studentId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await councilFetch("/api/interventions", { method: "POST", body: JSON.stringify({ sourceType: "intervention_center", studentId, description, reason, responsibleName, dueDate }) });
      onCreated();
      setStudentSearch(""); setStudentId(""); setDescription(""); setReason(""); setResponsibleName(""); setDueDate(""); onOpenChange(false);
      toast.success("Intervenção criada pela Central.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a intervenção.");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl"><form onSubmit={submit}><DialogHeader><DialogTitle>Nova intervenção</DialogTitle><DialogDescription>Crie uma ação individual sem depender de um Conselho em andamento. Ela aparecerá também no prontuário do estudante.</DialogDescription></DialogHeader><div className="grid gap-4 py-5 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Estudante</Label>{selectedStudent ? <div className="flex items-center justify-between rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-3 dark:border-sky-800 dark:bg-sky-950/30"><div><strong className="block text-sm">{selectedStudent.name}</strong><span className="text-[11px] text-muted-foreground">Matrícula {selectedStudent.enrollmentNumber}{selectedStudent.current ? ` · Turma ${selectedStudent.current.className}` : " · sem turma atual"}</span></div><Button type="button" variant="ghost" size="sm" onClick={() => setStudentId("")}>Trocar</Button></div> : <><div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} className="pl-10" placeholder="Pesquisar por nome, matrícula ou turma" /></div>{studentsQuery.isPending ? <p className="text-xs text-muted-foreground">Carregando estudantes...</p> : normalizedSearch.length >= 2 ? <div className="max-h-52 overflow-y-auto rounded-xl border">{results.length ? results.map((student) => <button key={student.studentId} type="button" onClick={() => { setStudentId(student.studentId); setStudentSearch(""); }} className="block w-full border-b px-3.5 py-2.5 text-left last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800"><strong className="block text-xs">{student.name}</strong><span className="text-[10px] text-muted-foreground">{student.enrollmentNumber}{student.current ? ` · ${student.current.className}` : ""}</span></button>) : <p className="p-4 text-center text-xs text-muted-foreground">Nenhum estudante encontrado.</p>}</div> : <p className="text-[11px] text-muted-foreground">Digite pelo menos dois caracteres.</p>}</>}</div><div className="space-y-2 sm:col-span-2"><Label htmlFor="central-intervention-action">Ação/intervenção</Label><Textarea id="central-intervention-action" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={2000} required /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="central-intervention-reason">Motivo ou contexto</Label><Textarea id="central-intervention-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={2000} required /></div><div className="space-y-2"><Label htmlFor="central-intervention-responsible">Responsável (opcional)</Label><Input id="central-intervention-responsible" value={responsibleName} onChange={(event) => setResponsibleName(event.target.value)} maxLength={200} /></div><div className="space-y-2"><Label htmlFor="central-intervention-due-date">Prazo (opcional)</Label><Input id="central-intervention-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving || !studentId || !description.trim() || !reason.trim()}>{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{saving ? "Criando..." : "Criar intervenção"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
