"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, BookOpenCheck, CalendarDays, CheckCircle2, ChevronRight, Clock3, Download, Loader2, Search, ShieldAlert, Trash2, TrendingDown, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { councilFetch } from "@/lib/class-council/client";
import { classStatusBadgeClass, classStatusLabel } from "@/lib/class-council/presentation";

type StudentDetail = {
  enrollmentId: string;
  name: string;
  enrollmentNumber: string;
  classId: string;
  className: string;
  attendanceRate: number | null;
  alerts: {
    currentLowGradeCount: number;
    previousLowGradeCount: number | null;
    academicAlert: boolean;
    lowAttendance: boolean;
    atRisk: boolean;
    evolution: "improved" | "stable" | "worsened" | "unavailable";
    reasons: string[];
  };
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
};

type Overview = {
  council: { id: string; school_year: number; term: number; meeting_date: string; status: string; current_import_id: string | null };
  classes: Array<{ id: string; official_code: string; display_name: string; status: string; studentCount?: number; atRiskCount?: number }>;
  metrics: { students: number; atRisk: number; lowAttendance: number; worsened: number; pendingInterventions: number };
  studentDetails: StudentDetail[];
  interventionDetails: InterventionDetail[];
  subjectRanking: Array<{ name: string; low: number; numeric: number; percentage: number }>;
};

type MetricKey = "students" | "atRisk" | "lowAttendance" | "worsened" | "pendingInterventions";

const overviewCache = new Map<string, Overview>();
const statusLabels: Record<string, string> = { draft: "Rascunho", preparation: "Preparação", in_progress: "Em andamento", completed: "Concluído" };
const interventionStatusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em andamento" };

function formatAttendance(rate: number | null): string {
  return rate === null ? "não informada" : `${rate.toLocaleString("pt-BR")}%`;
}

const metricStyles: Record<MetricKey, { card: string; icon: string }> = {
  students: { card: "border-blue-200/70 bg-blue-50/60 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20", icon: "text-blue-600 dark:text-blue-400" },
  atRisk: { card: "border-rose-200/80 bg-rose-50/70 hover:bg-rose-100/70 dark:border-rose-900 dark:bg-rose-950/25", icon: "text-rose-600 dark:text-rose-400" },
  lowAttendance: { card: "border-blue-200/70 bg-blue-50/60 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20", icon: "text-blue-600 dark:text-blue-400" },
  worsened: { card: "border-blue-200/70 bg-blue-50/60 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20", icon: "text-blue-600 dark:text-blue-400" },
  pendingInterventions: { card: "border-blue-200/70 bg-blue-50/60 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20", icon: "text-blue-600 dark:text-blue-400" },
};

export default function CouncilDashboardPage() {
  const { councilId } = useParams<{ councilId: string }>();
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(() => overviewCache.get(councilId) ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);
  const [detailSearch, setDetailSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const overview = await councilFetch<Overview>(`/api/class-councils/${councilId}`);
      overviewCache.set(councilId, overview);
      setData(overview);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar o conselho.");
    }
  }, [councilId]);

  useEffect(() => {
    const cached = overviewCache.get(councilId);
    if (cached) setData(cached);
    void load();
  }, [councilId, load]);

  async function complete() {
    setBusy(true);
    setError("");
    try {
      await councilFetch(`/api/class-councils/${councilId}/complete`, { method: "POST", body: "{}" });
      await load();
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
      overviewCache.delete(councilId);
      router.replace("/hub/conselhos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir o conselho.");
      setDeleting(false);
    }
  }

  const normalizedSearch = detailSearch.trim().toLocaleLowerCase("pt-BR");
  const detailedStudents = useMemo(() => {
    if (!data || activeMetric === "pendingInterventions") return [];
    const selected = data.studentDetails.filter((student) => {
      if (activeMetric === "atRisk") return student.alerts.atRisk;
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

  if (!data && !error) return <div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!data) return <main className="mx-auto max-w-5xl p-8"><p className="text-destructive">{error}</p></main>;

  const { council } = data;
  const completed = data.classes.filter((item) => item.status === "completed").length;
  const metricCards: Array<{ key: MetricKey; label: string; value: number; icon: typeof Users; description: string }> = [
    { key: "students", label: "Estudantes", value: data.metrics.students, icon: Users, description: "Todos os estudantes ativos nesta importação" },
    { key: "atRisk", label: "Em risco", value: data.metrics.atRisk, icon: ShieldAlert, description: "Quatro ou mais disciplinas com nota abaixo de 6,0 ou frequência anual abaixo de 80%" },
    { key: "lowAttendance", label: "Baixa frequência", value: data.metrics.lowAttendance, icon: Clock3, description: "Frequência anual abaixo de 80%" },
    { key: "worsened", label: "Pioraram", value: data.metrics.worsened, icon: TrendingDown, description: "Mais disciplinas abaixo de 6,0 que no bimestre anterior" },
    { key: "pendingInterventions", label: "Intervenções pendentes", value: data.metrics.pendingInterventions, icon: AlertCircle, description: "Intervenções pendentes ou em andamento" },
  ];
  const selectedMetric = metricCards.find((item) => item.key === activeMetric);

  return <main className="mx-auto max-w-7xl p-4 py-8 sm:p-8">
    <Button variant="ghost" asChild className="mb-4"><Link href="/hub/conselhos"><ArrowLeft className="h-4 w-4" />Todos os conselhos</Link></Button>
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-3"><h1 className="text-2xl font-bold">{council.school_year} · {council.term}º bimestre</h1><Badge>{statusLabels[council.status] ?? council.status}</Badge></div><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{new Date(`${council.meeting_date}T12:00:00`).toLocaleDateString("pt-BR")} · Ensino Regular</p></div>
      <div className="flex flex-wrap gap-2">
        {council.current_import_id ? <Button variant="outline" asChild><a href={`/api/class-councils/${councilId}/imports/${council.current_import_id}/file`}><Download className="h-4 w-4" />Arquivo original</a></Button> : <Button asChild><Link href={`/hub/conselhos/${councilId}/importar`}><Upload className="h-4 w-4" />Importar relatório</Link></Button>}
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
    {error && <div className="mb-5 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</div>}

    <section className="mb-6 rounded-2xl border bg-blue-50/60 p-5 dark:bg-blue-950/20"><div className="flex gap-3"><BookOpenCheck className="mt-0.5 h-5 w-5 text-blue-700" /><div><h2 className="font-semibold">Critérios deste conselho</h2><p className="mt-1 text-sm text-muted-foreground">Um estudante está em risco quando possui 4 ou mais disciplinas com nota numérica abaixo de 6,0 ou frequência anual abaixo de 80%. Piora é uma tendência separada, identificada quando aumenta a quantidade de disciplinas com nota baixa em relação ao bimestre anterior disponível. Marcadores nunca contam como zero.</p></div></div></section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {metricCards.map(({ key, label, value, icon: Icon }) => <button key={key} type="button" onClick={() => { setActiveMetric(key); setDetailSearch(""); }} className={`group rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${metricStyles[key].card}`}>
        <div className="flex items-start justify-between gap-2"><Icon className={`h-5 w-5 ${metricStyles[key].icon}`} /><ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" /></div>
        <p className="mt-3 text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p><span className="mt-2 block text-[11px] font-medium text-muted-foreground/80">Ver detalhes</span>
      </button>)}
    </section>

    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]"><section className="rounded-2xl border bg-white p-5 dark:bg-card"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Turmas</h2><span className="text-xs text-muted-foreground">{completed}/{data.classes.length} concluídas</span></div>{data.classes.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Importe o relatório para criar as turmas.</div> : <div className="space-y-2">{data.classes.map((item) => <Link key={item.id} href={`/hub/conselhos/${councilId}/turmas/${item.id}`} className="flex items-center justify-between gap-4 rounded-xl border p-4 transition hover:border-primary/50 hover:bg-muted/20"><div><strong>{item.display_name}</strong><span className="ml-2 text-xs text-muted-foreground">{item.official_code}</span><p className="mt-1 text-xs text-muted-foreground">{item.studentCount ?? 0} estudantes · {item.atRiskCount ?? 0} em risco</p></div><Badge variant="secondary" className={classStatusBadgeClass(item.status)}>{classStatusLabel(item.status)}</Badge></Link>)}</div>}</section><section className="rounded-2xl border bg-white p-5 dark:bg-card"><h2 className="font-semibold">Disciplinas com mais notas baixas</h2><div className="mt-4 space-y-4">{data.subjectRanking.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados acadêmicos confirmados.</p> : data.subjectRanking.map((item) => <div key={item.name}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate">{item.name}</span><strong>{item.low} · {item.percentage}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-amber-500" style={{ width: `${item.percentage}%` }} /></div></div>)}</div></section></div>

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
