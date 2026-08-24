"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowUpRight, BookOpenCheck, CalendarDays, CheckCircle2, ChevronRight, CircleAlert, Clock3, Download, Loader2, Printer, RefreshCw, RotateCcw, Search, ShieldAlert, Trash2, TrendingDown, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CouncilOverviewSkeleton } from "@/components/class-council/LoadingSkeletons";
import { classCouncilQueryKeys, useClassCouncil } from "@/hooks/useClassCouncils";
import { councilFetch } from "@/lib/class-council/client";
import { classStatusBadgeClass, classStatusLabel, subjectAbbreviation } from "@/lib/class-council/presentation";
import { STUDENT_OCCURRENCE_LABELS } from "@/lib/students/occurrences";
import { STUDENT_SITUATION_LABELS } from "@/lib/students/situations";
import type { AttendanceSituation, StudentAlerts } from "@/types/class-council";
import type { StudentOccurrenceSummary } from "@/types/student-occurrence";

type StudentDetail = {
  studentId: string;
  enrollmentId: string;
  name: string;
  enrollmentNumber: string;
  classId: string;
  className: string;
  attendanceRate: number | null;
  attendanceSituation: AttendanceSituation;
  alerts: StudentAlerts;
  occurrences: StudentOccurrenceSummary;
};

type InterventionDetail = {
  id: string;
  status: string;
  description: string;
  responsible_name: string | null;
  due_date: string | null;
  target_type: string;
  className: string;
  studentName: string | null;
  studentProblems: string[];
};

type Overview = {
  council: { id: string; school_year: number; term: number; meeting_date: string; status: string; current_import_id: string | null };
  classes: Array<{ id: string; official_code: string; display_name: string; status: string; studentCount?: number; atRiskCount?: number; class_strengths: string | null; general_difficulties: string | null; behavior_and_coexistence: string | null; learning_aspects: string | null; collective_strategies: string | null; participants: Array<{ name: string; role_or_subject: string | null }> }>;
  imports: Array<{ id: string; version: number; status: string; original_file_name: string; file_size_bytes: number; created_at: string; confirmed_at: string | null }>;
  metrics: { students: number; monitoring: number; atRisk: number; retentionRisk: number; completionRisk: number; lowAttendance: number; worsened: number; pendingInterventions: number };
  studentDetails: StudentDetail[];
  interventionDetails: InterventionDetail[];
  subjectRanking: Array<{ name: string; low: number; numeric: number; percentage: number }>;
};

type MetricKey = "students" | "monitoring" | "atRisk" | "lowAttendance" | "worsened" | "pendingInterventions";

const statusLabels: Record<string, string> = { draft: "Rascunho", preparation: "Preparação", in_progress: "Em andamento", completed: "Concluído", reopened: "Reaberto" };
const interventionStatusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em andamento" };
const importStatusLabels: Record<string, string> = { uploaded: "Enviada", validating: "Validando", validated: "Prévia pronta", importing: "Confirmando", confirmed: "Confirmada", failed: "Falhou" };

function formatAttendance(rate: number | null): string {
  return rate === null ? "não informada" : `${rate.toLocaleString("pt-BR")}%`;
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function StudentSituationNote({ situation }: { situation: AttendanceSituation }) {
  if (situation === "regular") return null;
  const tone = situation === "dropout" ? "text-rose-700 dark:text-rose-300" : situation === "transferred" ? "text-sky-700 dark:text-sky-300" : "text-amber-700 dark:text-amber-300";
  return <p className={`mt-1 text-[11px] font-semibold ${tone}`}>{STUDENT_SITUATION_LABELS[situation]}{situation === "transferred" ? " · fora do fluxo" : ""}</p>;
}

const metricStyles: Record<MetricKey, { card: string; icon: string }> = {
  students: { card: "border-blue-200/70 bg-blue-50/60 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20", icon: "text-blue-600 dark:text-blue-400" },
  monitoring: { card: "border-amber-200/80 bg-amber-50/70 hover:bg-amber-100/70 dark:border-amber-900 dark:bg-amber-950/25", icon: "text-amber-600 dark:text-amber-400" },
  atRisk: { card: "border-rose-200/80 bg-rose-50/70 hover:bg-rose-100/70 dark:border-rose-900 dark:bg-rose-950/25", icon: "text-rose-600 dark:text-rose-400" },
  lowAttendance: { card: "border-blue-200/70 bg-blue-50/60 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20", icon: "text-blue-600 dark:text-blue-400" },
  worsened: { card: "border-blue-200/70 bg-blue-50/60 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20", icon: "text-blue-600 dark:text-blue-400" },
  pendingInterventions: { card: "border-blue-200/70 bg-blue-50/60 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20", icon: "text-blue-600 dark:text-blue-400" },
};

export default function CouncilDashboardPage() {
  const { councilId } = useParams<{ councilId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, error: queryError, isPending } = useClassCouncil<Overview>(councilId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);
  const [detailSearch, setDetailSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  async function complete() {
    setBusy(true);
    setError("");
    try {
      await councilFetch(`/api/class-councils/${councilId}/complete`, { method: "POST", body: "{}" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: classCouncilQueryKeys.council(councilId) }),
        queryClient.invalidateQueries({ queryKey: classCouncilQueryKeys.list() }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao concluir.");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    setDeleting(true);
    setError("");
    try {
      await councilFetch(`/api/class-councils/${councilId}`, { method: "DELETE" });
      queryClient.removeQueries({ queryKey: classCouncilQueryKeys.council(councilId) });
      queryClient.setQueryData<Array<{ id: string }>>(classCouncilQueryKeys.list(), (items) => items?.filter((item) => item.id !== councilId));
      await queryClient.invalidateQueries({ queryKey: classCouncilQueryKeys.list(), refetchType: "none" });
      router.replace("/hub/conselhos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir o conselho.");
      setDeleting(false);
    }
  }

  async function reopen() {
    setReopening(true);
    setError("");
    try {
      await councilFetch(`/api/class-councils/${councilId}/reopen`, { method: "POST", body: "{}" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: classCouncilQueryKeys.council(councilId) }),
        queryClient.invalidateQueries({ queryKey: classCouncilQueryKeys.list() }),
      ]);
      toast.success("Conselho reaberto para ajustes e novas importações.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao reabrir o conselho.");
    } finally {
      setReopening(false);
    }
  }

  const normalizedSearch = detailSearch.trim().toLocaleLowerCase("pt-BR");
  const detailedStudents = useMemo(() => {
    if (!data || activeMetric === "pendingInterventions") return [];
    const selected = data.studentDetails.filter((student) => {
      if (activeMetric === "atRisk") return student.alerts.atRisk;
      if (activeMetric === "monitoring") return student.alerts.academicStatus === "monitoring";
      if (activeMetric === "lowAttendance") return student.alerts.lowAttendance;
      if (activeMetric === "worsened") return student.alerts.evolution === "worsened";
      return true;
    });
    const filtered = normalizedSearch ? selected.filter((student) => `${student.name} ${student.enrollmentNumber} ${student.className}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch)) : selected;
    return [...filtered].sort((a, b) => {
      if (activeMetric === "atRisk") {
        const riskTypesA = Number(a.alerts.academicAlert) + Number(a.alerts.lowAttendance);
        const riskTypesB = Number(b.alerts.academicAlert) + Number(b.alerts.lowAttendance);
        if (riskTypesA !== riskTypesB) return riskTypesB - riskTypesA;
        if (a.alerts.currentLowGradeCount !== b.alerts.currentLowGradeCount) return b.alerts.currentLowGradeCount - a.alerts.currentLowGradeCount;
      }
      if (activeMetric === "lowAttendance" && a.attendanceRate !== b.attendanceRate) return (a.attendanceRate ?? 101) - (b.attendanceRate ?? 101);
      if (activeMetric === "worsened") {
        const increaseA = a.alerts.currentLowGradeCount - (a.alerts.previousLowGradeCount ?? 0);
        const increaseB = b.alerts.currentLowGradeCount - (b.alerts.previousLowGradeCount ?? 0);
        if (increaseA !== increaseB) return increaseB - increaseA;
      }
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [activeMetric, data, normalizedSearch]);

  const detailedInterventions = useMemo(() => {
    if (!data || activeMetric !== "pendingInterventions") return [];
    if (!normalizedSearch) return data.interventionDetails;
    return data.interventionDetails.filter((item) => `${item.description} ${item.studentName ?? ""} ${item.className} ${item.responsible_name ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
  }, [activeMetric, data, normalizedSearch]);

  const searchedStudents = useMemo(() => {
    const normalized = normalizeSearch(studentSearch);
    if (!data || !normalized) return [];
    return data.studentDetails
      .filter((student) => normalizeSearch(`${student.name} ${student.enrollmentNumber} ${student.className}`).includes(normalized))
      .slice(0, 8);
  }, [data, studentSearch]);

  if (isPending) return <CouncilOverviewSkeleton />;
  if (!data) return <main className="mx-auto max-w-5xl p-8"><p className="text-destructive">{queryError instanceof Error ? queryError.message : "Falha ao carregar o conselho."}</p></main>;

  const { council } = data;
  const completed = data.classes.filter((item) => item.status === "completed").length;
  const metricCards: Array<{ key: MetricKey; label: string; value: number; icon: typeof Users; description: string }> = [
    { key: "students", label: "Estudantes", value: data.metrics.students, icon: Users, description: "Todos os estudantes ativos nesta importação" },
    { key: "monitoring", label: "Monitoramento", value: data.metrics.monitoring, icon: CircleAlert, description: "Estudantes fora do ritmo, ainda sem risco projetado" },
    { key: "atRisk", label: "Em risco", value: data.metrics.atRisk, icon: ShieldAlert, description: "Risco acadêmico projetado ou frequência abaixo do limite formal" },
    { key: "lowAttendance", label: "Baixa frequência", value: data.metrics.lowAttendance, icon: Clock3, description: "Atenção preventiva abaixo de 80%, separada do risco acadêmico" },
    { key: "worsened", label: "Pioraram", value: data.metrics.worsened, icon: TrendingDown, description: "Mais disciplinas fora do ritmo que no bimestre anterior" },
    { key: "pendingInterventions", label: "Intervenções pendentes", value: data.metrics.pendingInterventions, icon: AlertCircle, description: "Intervenções pendentes ou em andamento" },
  ];
  const selectedMetric = metricCards.find((item) => item.key === activeMetric);

  return <main className="mx-auto max-w-7xl p-4 py-8 sm:p-8 min-[1800px]:max-w-[1600px] min-[2400px]:max-w-[1800px]">
    <Button variant="ghost" asChild className="mb-4"><Link href="/hub/conselhos"><ArrowLeft className="h-4 w-4" />Todos os conselhos</Link></Button>
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-3"><h1 className="text-2xl font-bold">{council.school_year} · {council.term}º bimestre</h1><Badge>{statusLabels[council.status] ?? council.status}</Badge></div><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{new Date(`${council.meeting_date}T12:00:00`).toLocaleDateString("pt-BR")} · Ensino Regular</p></div>
      <div className="flex flex-wrap gap-2">
        {council.current_import_id && <Button variant="outline" asChild><Link href={`/hub/conselhos/${councilId}/imprimir`}><Printer className="h-4 w-4" />Imprimir</Link></Button>}
        {!council.current_import_id ? <Button asChild><Link href={`/hub/conselhos/${councilId}/importar`}><Upload className="h-4 w-4" />Importar relatório</Link></Button> : council.status !== "completed" && <Button variant="outline" asChild><Link href={`/hub/conselhos/${councilId}/importar`}><RefreshCw className="h-4 w-4" />Nova versão</Link></Button>}
        {council.status === "completed" && <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="outline"><RotateCcw className="h-4 w-4" />Reabrir conselho</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Reabrir este conselho?</AlertDialogTitle><AlertDialogDescription>O conselho voltará ao estado reaberto. Será possível reabrir turmas, corrigir registros e importar uma nova versão do relatório. O histórico da conclusão será preservado.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={reopening}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={reopening} onClick={() => void reopen()}>{reopening ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}{reopening ? "Reabrindo" : "Confirmar reabertura"}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>}
        {council.status !== "completed" && council.current_import_id && <Button onClick={complete} disabled={busy}><CheckCircle2 className="h-4 w-4" />Concluir conselho</Button>}
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" />Excluir conselho</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Excluir este conselho?</AlertDialogTitle><AlertDialogDescription>O conselho de {council.term}º bimestre de {council.school_year} sairá da listagem. Seus dados serão arquivados com segurança e não serão apagados definitivamente.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={() => void archive()} className="bg-destructive text-white hover:bg-destructive/90">{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{deleting ? "Excluindo" : "Excluir conselho"}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
    {(error || queryError) && <div className="mb-5 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error || (queryError instanceof Error ? queryError.message : "Não foi possível atualizar o conselho.")}</div>}

    {data.studentDetails.length > 0 && <section className="mb-6 rounded-2xl border bg-white p-3 shadow-sm dark:bg-card"><div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder={`Pesquisar entre os ${data.studentDetails.length} estudantes deste conselho`} className="h-11 rounded-xl border-0 bg-slate-50 pl-10 pr-4 shadow-none focus-visible:ring-sky-500 dark:bg-slate-800/70" /></div>{studentSearch.trim() && <div className="mt-3 grid gap-2 lg:grid-cols-2">{searchedStudents.map((student) => { const offPace = student.alerts.subjectDetails.filter((subject) => subject.offPace); const pending = student.alerts.subjectDetails.filter((subject) => subject.missingGradeCount > 0); return <Link key={student.enrollmentId} href={`/hub/alunos/${student.studentId}`} className="group rounded-xl border p-3 transition hover:border-sky-300 hover:bg-sky-50/50 dark:hover:border-sky-800 dark:hover:bg-sky-950/20"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm">{student.name}</strong><p className="mt-0.5 text-xs text-muted-foreground">{student.enrollmentNumber} · Turma {student.className}</p><StudentSituationNote situation={student.attendanceSituation} /></div><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-sky-600" /></div>{student.alerts.reasons.length ? <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{student.alerts.reasons.join(" · ")}</p> : <p className="mt-2 text-[11px] text-muted-foreground">Dentro dos critérios normais de acompanhamento.</p>}{offPace.length || pending.length ? <div className="mt-2 border-t pt-2 text-[11px] leading-5 text-muted-foreground">{offPace.length ? <p><span className="font-medium text-foreground">Fora do ritmo:</span> {offPace.map((subject) => subjectAbbreviation(subject.subjectName)).join(", ")}</p> : null}{pending.length ? <p><span className="font-medium text-foreground">Notas pendentes:</span> {pending.map((subject) => subjectAbbreviation(subject.subjectName)).join(", ")}</p> : null}</div> : null}<OccurrenceSummary summary={student.occurrences} /></Link>; })}{searchedStudents.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground lg:col-span-2">Nenhum estudante encontrado neste conselho.</div> : null}</div>}</section>}

    <section className="mb-6 rounded-2xl border bg-blue-50/60 p-5 dark:bg-blue-950/20"><div className="flex gap-3"><BookOpenCheck className="mt-0.5 h-5 w-5 text-blue-700" /><div><h2 className="font-semibold">Critérios deste conselho</h2><p className="mt-1 text-sm text-muted-foreground">O cálculo usa a pontuação acumulada: 1ª e 2ª séries entram em monitoramento a partir de 3 disciplinas fora do ritmo e em risco quando mais de 4 exigem média superior a 7. Na 3ª série, o monitoramento começa em 2; o risco considera 4 sob pressão ou 3 críticas. Frequência e notas faltantes são indicadores separados, e marcadores nunca contam como zero.</p></div></div></section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      {metricCards.map(({ key, label, value, icon: Icon }) => <button key={key} type="button" onClick={() => { setActiveMetric(key); setDetailSearch(""); }} className={`group rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${metricStyles[key].card}`}>
        <div className="flex items-start justify-between gap-2"><Icon className={`h-5 w-5 ${metricStyles[key].icon}`} /><ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" /></div>
        <p className="mt-3 text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p><span className="mt-2 block text-[11px] font-medium text-muted-foreground/80">Ver detalhes</span>
      </button>)}
    </section>

    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]"><section className="rounded-2xl border bg-white p-5 dark:bg-card"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Turmas</h2><span className="text-xs text-muted-foreground">{completed}/{data.classes.length} concluídas</span></div>{data.classes.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Importe o relatório para criar as turmas.</div> : <div className="space-y-2">{data.classes.map((item) => <div key={item.id} className="group flex items-center gap-2 rounded-xl border p-2 transition hover:border-primary/50 hover:bg-muted/20"><Link href={`/hub/conselhos/${councilId}/turmas/${item.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-lg p-2"><div className="min-w-0"><strong>{item.display_name}</strong><span className="ml-2 text-xs text-muted-foreground">{item.official_code}</span><p className="mt-1 text-xs text-muted-foreground">{item.studentCount ?? 0} estudantes · {item.atRiskCount ?? 0} em risco</p></div><Badge variant="secondary" className={classStatusBadgeClass(item.status)}>{classStatusLabel(item.status)}</Badge></Link>{council.status === "completed" && <Button variant="ghost" size="icon" asChild className="shrink-0 text-muted-foreground hover:text-foreground"><a href={`/api/class-councils/${councilId}/classes/${item.id}/pdf`} aria-label={`Baixar PDF da turma ${item.display_name}`} title={`Baixar PDF da turma ${item.display_name}`}><Download className="h-4 w-4" /></a></Button>}</div>)}</div>}</section><section className="rounded-2xl border bg-white p-5 dark:bg-card"><h2 className="font-semibold">Disciplinas com mais notas baixas</h2><div className="mt-4 space-y-4">{data.subjectRanking.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados acadêmicos confirmados.</p> : data.subjectRanking.map((item) => <div key={item.name}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate">{item.name}</span><strong>{item.low} · {item.percentage}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-amber-500" style={{ width: `${item.percentage}%` }} /></div></div>)}</div></section></div>

    {data.imports.length > 0 && <section className="mt-6 rounded-2xl border bg-white p-5 dark:bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Versões do relatório</h2><p className="mt-1 text-xs text-muted-foreground">Cada arquivo permanece armazenado de forma privada para conferência e auditoria.</p></div>{council.status !== "completed" && council.current_import_id && <Button variant="outline" size="sm" asChild><Link href={`/hub/conselhos/${councilId}/importar`}><RefreshCw className="h-4 w-4" />Importar nova versão</Link></Button>}</div>
      <div className="mt-4 divide-y rounded-xl border">{data.imports.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">Versão {item.version}</strong>{item.id === council.current_import_id && <Badge variant="success">Atual</Badge>}<Badge variant="outline">{importStatusLabels[item.status] ?? item.status}</Badge></div><p className="mt-1 truncate text-xs text-muted-foreground">{item.original_file_name} · {(item.file_size_bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MiB · enviada em {new Date(item.created_at).toLocaleString("pt-BR")}</p></div><Button variant="ghost" size="sm" asChild><a href={`/api/class-councils/${councilId}/imports/${item.id}/file`}><Download className="h-4 w-4" />Baixar</a></Button></div>)}</div>
    </section>}

    <Dialog open={activeMetric !== null} onOpenChange={(open) => { if (!open) { setActiveMetric(null); setDetailSearch(""); } }}>
      <DialogContent className="max-h-[85vh] grid-rows-[auto_auto_minmax(0,1fr)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{selectedMetric?.label}</DialogTitle>
          <DialogDescription>{selectedMetric?.description}. {activeMetric === "pendingInterventions" ? detailedInterventions.length : detailedStudents.length} registro(s).</DialogDescription>
        </DialogHeader>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={detailSearch} onChange={(event) => setDetailSearch(event.target.value)} placeholder="Buscar por nome, matrícula, turma ou descrição" className="pl-9" /></div>
        <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
          {activeMetric === "pendingInterventions" ? detailedInterventions.map((item) => <div key={item.id} className="rounded-xl border bg-muted/20 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{item.description}</p><p className="mt-1 text-xs text-muted-foreground">{item.studentName ? `${item.studentName} · ` : ""}{item.className}</p></div><Badge variant="outline">{interventionStatusLabels[item.status] ?? item.status}</Badge></div>{(item.responsible_name || item.due_date) && <p className="mt-2 text-xs text-muted-foreground">{item.responsible_name ? `Responsável: ${item.responsible_name}` : "Sem responsável"}{item.due_date ? ` · Prazo: ${new Date(`${item.due_date}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}</p>}</div>) : detailedStudents.map((student) => <div key={student.enrollmentId} className="rounded-xl border bg-muted/20 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium">{student.name}</p><p className="mt-0.5 text-xs text-muted-foreground">Matrícula {student.enrollmentNumber}</p></div><Badge variant="outline">Turma {student.className}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{activeMetric === "lowAttendance" ? `Frequência anual: ${formatAttendance(student.attendanceRate)}` : activeMetric === "worsened" ? `${student.alerts.previousLowGradeCount ?? 0} → ${student.alerts.currentLowGradeCount} disciplinas com nota abaixo de 6,0` : activeMetric === "atRisk" ? student.alerts.reasons.join(" · ") : `Frequência anual: ${formatAttendance(student.attendanceRate)}`}</p></div>)}
          {((activeMetric === "pendingInterventions" ? detailedInterventions.length : detailedStudents.length) === 0) && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</div>}
        </div>
      </DialogContent>
    </Dialog>
  </main>;
}

function OccurrenceSummary({ summary }: { summary: StudentOccurrenceSummary }) {
  if (!summary.latest) return null;
  return <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2 text-[10px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200"><strong>{summary.count} {summary.count === 1 ? "ocorrência" : "ocorrências"}</strong><span className="mx-1.5">·</span>Última: {STUDENT_OCCURRENCE_LABELS[summary.latest.category]}</div>;
}
