"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Loader2, Plus, RotateCcw, Save, Trash2, TrendingDown, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { councilFetch } from "@/lib/class-council/client";
import { compareStudentPriority, compareStudentReportOrder } from "@/lib/class-council/calculateAlerts";
import { BEHAVIOR_LABELS } from "@/lib/class-council/constants";
import { classStatusBadgeClass, classStatusLabel } from "@/lib/class-council/presentation";
import type { ActivitiesStatus, BehaviorCategory, InterventionStatus, StudentAlerts } from "@/types/class-council";

type Result = { subject_id: string; subjectName: string; term: number; grade: number | null; grade_marker: string | null; absences: number | null };
type Behavior = { category: BehaviorCategory; description: string | null };
type Intervention = { id: string; description: string; responsible_name: string | null; due_date: string | null; status: InterventionStatus; outcome: string | null; cancellation_reason: string | null; optimistic?: boolean };
type InterventionPatch = { status?: InterventionStatus; outcome?: string; cancellationReason?: string; responsibleName?: string; dueDate?: string };
type Student = { enrollmentId: string; studentId: string; enrollmentNumber: string; reportPosition: number | null; name: string; isPcd: boolean; attendanceRate: number | null; enrollmentStatus: string | null; discussed: boolean; activitiesStatus: ActivitiesStatus; pedagogicalObservation: string | null; positiveNotes: string | null; alerts: StudentAlerts; results: Result[]; behaviors: Behavior[]; interventions: Intervention[] };
export type ClassWorkspaceData = {
  council: { id: string; term: number; status: string; school_year: number };
  class: { id: string; display_name: string; official_code: string; status: string; class_strengths: string | null; general_difficulties: string | null; behavior_and_coexistence: string | null; learning_aspects: string | null; collective_strategies: string | null };
  nextClass: { id: string; display_name: string; status: string } | null;
  readOnly: boolean;
  subjects: Array<{ id: string; display_name: string; teacher_name: string | null }>;
  participants: Array<{ id: string; name: string; role_or_subject: string | null }>;
  classInterventions: Intervention[];
  students: Student[];
  visualizations: { distribution: Array<{ count: number; students: number }>; evolution: Record<"improved" | "stable" | "worsened" | "unavailable", number> };
};

type StudentDraft = { discussed: boolean; activitiesStatus: ActivitiesStatus; pedagogicalObservation: string; positiveNotes: string; behaviors: Behavior[] };
type SaveState = "idle" | "saving" | "saved" | "error";
type WorkspaceTab = "students" | "class" | "participants" | "views";

const workspaceTabs = [
  { value: "students", label: "Estudantes", icon: UserRound },
  { value: "class", label: "Análise da turma", icon: BookOpen },
  { value: "participants", label: "Participantes e professores", icon: Users },
  { value: "views", label: "Visualizações", icon: BarChart3 },
] satisfies Array<{ value: WorkspaceTab; label: string; icon: typeof UserRound }>;

const INDIVIDUAL_INTERVENTION_SUGGESTIONS = ["Conversa individual", "Conversa com o responsável"] as const;

function formatGrade(result: Result | undefined): string {
  if (!result) return "—";
  if (result.grade !== null) return result.grade.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return result.grade_marker ?? "—";
}

function initialDrafts(students: Student[]) {
  return Object.fromEntries(students.map((student) => [student.enrollmentId, { discussed: student.discussed, activitiesStatus: student.activitiesStatus, pedagogicalObservation: student.pedagogicalObservation ?? "", positiveNotes: student.positiveNotes ?? "", behaviors: student.behaviors.map((item) => ({ ...item })) } satisfies StudentDraft]));
}

function initialStudentInterventions(students: Student[]): Record<string, Intervention[]> {
  return Object.fromEntries(students.map((student) => [student.enrollmentId, student.interventions]));
}

function applyInterventionPatch(intervention: Intervention, patch: InterventionPatch): Intervention {
  return {
    ...intervention,
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.outcome !== undefined ? { outcome: patch.outcome.trim() || null } : {}),
    ...(patch.cancellationReason !== undefined ? { cancellation_reason: patch.cancellationReason.trim() || null } : {}),
    ...(patch.responsibleName !== undefined ? { responsible_name: patch.responsibleName.trim() || null } : {}),
    ...(patch.dueDate !== undefined ? { due_date: patch.dueDate.trim() || null } : {}),
  };
}

export function ClassWorkspace({ initialData, councilId, classId, reload }: { initialData: ClassWorkspaceData; councilId: string; classId: string; reload: () => Promise<void> }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [studentOrder, setStudentOrder] = useState<"priority" | "report">("priority");
  const [selectedId, setSelectedId] = useState(initialData.students[0]?.enrollmentId ?? "");
  const [drafts, setDrafts] = useState<Record<string, StudentDraft>>(() => initialDrafts(initialData.students));
  const [studentInterventions, setStudentInterventions] = useState<Record<string, Intervention[]>>(() => initialStudentInterventions(initialData.students));
  const draftsRef = useRef(drafts);
  const savedRef = useRef<Record<string, string>>(Object.fromEntries(Object.entries(drafts).map(([id, draft]) => [id, JSON.stringify(draft)])));
  const sequenceRef = useRef(0);
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState("");
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(initialData.class.status === "not_started");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("students");
  useEffect(() => { draftsRef.current = drafts; }, [drafts]);
  useEffect(() => { setStartDialogOpen(initialData.class.status === "not_started"); }, [initialData.class.id, initialData.class.status]);

  const setOperationPending = useCallback((operation: string, pending: boolean) => {
    setPendingOperations((current) => {
      const next = new Set(current);
      if (pending) next.add(operation); else next.delete(operation);
      return next;
    });
  }, []);

  const students = useMemo(() => initialData.students.filter((student) => {
    if (filter === "risk") return student.alerts.atRisk;
    if (filter === "attendance") return student.alerts.lowAttendance;
    if (filter === "worsened") return student.alerts.evolution === "worsened";
    if (filter === "discussed") return drafts[student.enrollmentId]?.discussed;
    if (filter === "intervention") return (studentInterventions[student.enrollmentId] ?? student.interventions).length > 0;
    return true;
  }).sort(studentOrder === "report" ? compareStudentReportOrder : compareStudentPriority), [drafts, filter, initialData.students, studentInterventions, studentOrder]);
  const selected = initialData.students.find((item) => item.enrollmentId === selectedId) ?? students[0];
  const selectedIndex = students.findIndex((item) => item.enrollmentId === selected?.enrollmentId);
  const hasPendingSaves = pendingOperations.size > 0
    || Object.values(saveState).some((value) => value === "saving")
    || Object.entries(drafts).some(([id, draft]) => savedRef.current[id] !== JSON.stringify(draft));

  const updateStudentInterventions = useCallback((enrollmentId: string, update: (current: Intervention[]) => Intervention[]) => {
    setStudentInterventions((current) => ({ ...current, [enrollmentId]: update(current[enrollmentId] ?? []) }));
  }, []);

  const saveStudent = useCallback(async (enrollmentId: string) => {
    const draft = draftsRef.current[enrollmentId];
    if (!draft || savedRef.current[enrollmentId] === JSON.stringify(draft) || initialData.readOnly) return true;
    const sequence = ++sequenceRef.current;
    setSaveState((current) => ({ ...current, [enrollmentId]: "saving" }));
    try {
      await councilFetch(`/api/class-councils/${councilId}/classes/${classId}/students/${enrollmentId}`, { method: "PATCH", body: JSON.stringify(draft) });
      savedRef.current[enrollmentId] = JSON.stringify(draft);
      if (sequence === sequenceRef.current || enrollmentId !== selectedId) setSaveState((current) => ({ ...current, [enrollmentId]: "saved" }));
      return true;
    } catch {
      setSaveState((current) => ({ ...current, [enrollmentId]: "error" }));
      return false;
    }
  }, [classId, councilId, initialData.readOnly, selectedId]);

  useEffect(() => {
    if (!selectedId || initialData.readOnly) return;
    const draft = drafts[selectedId];
    if (!draft || savedRef.current[selectedId] === JSON.stringify(draft)) return;
    setSaveState((current) => ({ ...current, [selectedId]: "saving" }));
    const timer = window.setTimeout(() => void saveStudent(selectedId), 650);
    return () => window.clearTimeout(timer);
  }, [drafts, initialData.readOnly, saveStudent, selectedId]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (Object.entries(draftsRef.current).some(([id, draft]) => savedRef.current[id] !== JSON.stringify(draft))) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, []);

  useEffect(() => {
    if (initialData.nextClass) router.prefetch(`/hub/conselhos/${councilId}/turmas/${initialData.nextClass.id}`);
  }, [councilId, initialData.nextClass, router]);

  function updateDraft(patch: Partial<StudentDraft>) { if (!selected) return; setDrafts((current) => ({ ...current, [selected.enrollmentId]: { ...current[selected.enrollmentId], ...patch } })); }
  async function chooseStudent(id: string) { if (selectedId) await saveStudent(selectedId); setSelectedId(id); }
  async function completeClass() { setCompleting(true); setActionError(""); try { const saveResults = await Promise.all(Object.keys(draftsRef.current).map(saveStudent)); if (saveResults.some((saved) => !saved)) throw new Error("Não foi possível salvar todas as alterações. Revise os estudantes com erro e tente concluir novamente."); await councilFetch(`/api/class-councils/${councilId}/classes/${classId}/complete`, { method: "POST", body: "{}" }); await reload(); if (!initialData.nextClass) toast.info("Todas as turmas foram concluídas. Já é possível concluir este Conselho de Classe."); router.refresh(); } catch (err) { setActionError(err instanceof Error ? err.message : "Falha ao concluir."); } finally { setCompleting(false); } }
  async function reopenClass() { setReopening(true); setActionError(""); try { await councilFetch(`/api/class-councils/${councilId}/classes/${classId}/reopen`, { method: "POST", body: "{}" }); await reload(); router.refresh(); toast.success("Turma reaberta para edição."); } catch (err) { setActionError(err instanceof Error ? err.message : "Falha ao reabrir a turma."); } finally { setReopening(false); } }
  function goToNextClass() {
    if (initialData.nextClass) {
      router.push(`/hub/conselhos/${councilId}/turmas/${initialData.nextClass.id}`);
      return;
    }
  }

  return <main className="mx-auto max-w-[1500px] p-4 py-6 sm:p-6"><StartClassDialog open={startDialogOpen} onOpenChange={setStartDialogOpen} data={initialData} councilId={councilId} classId={classId} reload={reload} /><div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><Button variant="ghost" asChild className="mb-2 -ml-3"><Link href={`/hub/conselhos/${councilId}`}><ArrowLeft className="h-4 w-4" />Voltar ao conselho</Link></Button><div className="flex items-center gap-3"><h1 className="text-2xl font-bold">Turma {initialData.class.display_name}</h1><Badge variant="secondary" className={classStatusBadgeClass(initialData.class.status)}>{classStatusLabel(initialData.class.status)}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{initialData.class.official_code} · {initialData.students.length} estudantes</p></div><div className="flex flex-wrap gap-2">{!initialData.readOnly && <Button onClick={completeClass} disabled={completing || hasPendingSaves} title={hasPendingSaves ? "Aguarde o salvamento das alterações antes de concluir." : undefined}>{completing || hasPendingSaves ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{completing ? "Concluindo" : hasPendingSaves ? "Salvando alterações" : "Concluir turma"}</Button>}{initialData.class.status === "completed" && initialData.council.status !== "completed" && <Button variant="outline" onClick={reopenClass} disabled={reopening}><RotateCcw className={`h-4 w-4 ${reopening ? "animate-spin" : ""}`} />{reopening ? "Reabrindo" : "Reabrir turma"}</Button>}{initialData.class.status === "completed" && initialData.nextClass && <Button onClick={goToNextClass}><ArrowRight className="h-4 w-4" />Próxima turma</Button>}</div></div>{actionError && <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{actionError}</div>}{initialData.readOnly && <div className="mb-4 flex items-center gap-2 rounded-xl border bg-muted/60 p-3 text-sm"><CheckCircle2 className="h-4 w-4" />Turma concluída: registros pedagógicos em modo somente leitura.{initialData.council.status !== "completed" ? " Reabra a turma para fazer correções." : ""}</div>}
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)}>
      <TabsList className="mx-auto mb-5 flex h-auto w-full max-w-5xl justify-start gap-1.5 overflow-x-auto rounded-2xl border border-border/60 bg-muted/70 p-2 shadow-inner">
        {workspaceTabs.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="relative z-0 h-12 min-w-max flex-1 rounded-lg px-5 text-[15px] text-muted-foreground transition-colors duration-200 hover:bg-background/50 hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
          >
            {activeTab === value && (
              <motion.span
                layoutId={`class-workspace-tab-${classId}`}
                className="absolute inset-0 -z-10 rounded-lg border border-border/70 bg-white shadow-sm dark:bg-card"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="h-[18px] w-[18px]" />
            <span>{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="students" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300"><div className="grid min-h-[680px] overflow-visible rounded-2xl border bg-white lg:grid-cols-[360px_minmax(0,1fr)] dark:bg-card"><aside className="border-b lg:border-b-0 lg:border-r"><div className="grid gap-2 border-b p-3"><Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="Filtrar estudantes"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os estudantes</SelectItem><SelectItem value="risk">Em risco</SelectItem><SelectItem value="attendance">Baixa frequência</SelectItem><SelectItem value="worsened">Pioraram</SelectItem><SelectItem value="discussed">Discutidos</SelectItem><SelectItem value="intervention">Com intervenção</SelectItem></SelectContent></Select><Select value={studentOrder} onValueChange={(value) => setStudentOrder(value as "priority" | "report")}><SelectTrigger aria-label="Ordenar estudantes"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="priority">Prioridade de risco</SelectItem><SelectItem value="report">Ordem do relatório (SIGEduc)</SelectItem></SelectContent></Select></div><TooltipProvider delayDuration={550}><div className="max-h-[620px] overflow-y-auto p-2">{students.map((student) => <div key={student.enrollmentId} className={`mb-1 flex w-full items-center rounded-xl transition ${selected?.enrollmentId === student.enrollmentId ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><button onClick={() => void chooseStudent(student.enrollmentId)} className="min-w-0 flex-1 p-3 text-left"><div className="flex items-start justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5 text-sm font-medium leading-tight"><span className="truncate">{student.name}</span>{student.alerts.evolution === "worsened" && <Tooltip><TooltipTrigger asChild><span aria-label={`${student.name} piorou em relação ao bimestre anterior`} className={`shrink-0 ${selected?.enrollmentId === student.enrollmentId ? "text-primary-foreground" : "text-rose-600 dark:text-rose-400"}`}><TrendingDown className="h-4 w-4" /></span></TooltipTrigger><TooltipContent side="top" className="max-w-72">Passou de {student.alerts.previousLowGradeCount ?? 0} para {student.alerts.currentLowGradeCount} disciplinas com nota abaixo de 6,0.</TooltipContent></Tooltip>}</span>{drafts[student.enrollmentId]?.discussed && <Check className="h-4 w-4 shrink-0" />}</div></button>{student.alerts.reasons.length > 0 && <Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Ver motivos do risco de ${student.name}`} className={`mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${selected?.enrollmentId === student.enrollmentId ? "text-primary-foreground hover:bg-primary-foreground/10" : "text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950"}`}><CircleAlert className="h-5 w-5" /></button></TooltipTrigger><TooltipContent side="right" sideOffset={8} className="max-w-80 p-3"><p className="mb-1 font-semibold">Motivos do risco</p><ul className="space-y-1">{student.alerts.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></TooltipContent></Tooltip>}</div>)}</div></TooltipProvider></aside>{selected ? <StudentPanel student={selected} interventions={studentInterventions[selected.enrollmentId] ?? selected.interventions} setInterventions={(update) => updateStudentInterventions(selected.enrollmentId, update)} setOperationPending={setOperationPending} className={initialData.class.display_name} draft={drafts[selected.enrollmentId]} readOnly={initialData.readOnly} term={initialData.council.term} state={saveState[selected.enrollmentId] ?? "idle"} updateDraft={updateDraft} retry={() => void saveStudent(selected.enrollmentId)} previous={selectedIndex > 0 ? () => void chooseStudent(students[selectedIndex - 1].enrollmentId) : undefined} next={selectedIndex >= 0 && selectedIndex < students.length - 1 ? () => void chooseStudent(students[selectedIndex + 1].enrollmentId) : undefined} councilId={councilId} classId={classId} /> : <div className="grid place-items-center p-10 text-sm text-muted-foreground">Nenhum estudante neste filtro.</div>}</div></TabsContent>
      <TabsContent forceMount value="class" className="data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300"><CollectiveEditor data={initialData} councilId={councilId} classId={classId} setOperationPending={setOperationPending} /></TabsContent>
      <TabsContent value="participants" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300"><ParticipantsEditor data={initialData} councilId={councilId} classId={classId} reload={reload} setOperationPending={setOperationPending} /></TabsContent>
      <TabsContent value="views" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300"><ClassVisualizations data={initialData} /></TabsContent>
    </Tabs>
  </main>;
}

function SaveIndicator({ state, retry }: { state: SaveState; retry: () => void }) {
  if (state === "saving") return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Salvando</span>;
  if (state === "saved") return <span className="flex items-center gap-1 text-xs text-emerald-700"><Check className="h-3 w-3" />Salvo</span>;
  if (state === "error") return <button onClick={retry} className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" />Erro ao salvar · tentar novamente</button>;
  return null;
}

function BehaviorOption({ label, behavior, disabled, onToggle, onDescriptionChange }: { label: string; behavior: Behavior | undefined; disabled: boolean; onToggle: (checked: boolean) => void; onDescriptionChange: (value: string) => void }) {
  return <motion.div layout transition={{ layout: { duration: 0.22, ease: "easeOut" } }} className="overflow-hidden rounded-lg border p-3">
    <label className="flex items-center gap-2 text-sm"><Checkbox disabled={disabled} checked={Boolean(behavior)} onCheckedChange={(value) => onToggle(value === true)} />{label}</label>
    <AnimatePresence initial={false}>
      {behavior && <motion.div key="context" initial={{ height: 0, marginTop: 0, opacity: 0 }} animate={{ height: "auto", marginTop: 8, opacity: 1 }} exit={{ height: 0, marginTop: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}><Input disabled={disabled} placeholder="Contexto opcional" value={behavior.description ?? ""} onChange={(event) => onDescriptionChange(event.target.value)} /></motion.div>}
    </AnimatePresence>
  </motion.div>;
}

function StudentPanel({ student, interventions, setInterventions, setOperationPending, className, draft, readOnly, term, state, updateDraft, retry, previous, next, councilId, classId }: { student: Student; interventions: Intervention[]; setInterventions: (update: (current: Intervention[]) => Intervention[]) => void; setOperationPending: (operation: string, pending: boolean) => void; className: string; draft: StudentDraft; readOnly: boolean; term: number; state: SaveState; updateDraft: (patch: Partial<StudentDraft>) => void; retry: () => void; previous?: () => void; next?: () => void; councilId: string; classId: string }) {
  const [description, setDescription] = useState(""); const [responsible, setResponsible] = useState(""); const [dueDate, setDueDate] = useState(""); const [creating, setCreating] = useState(false); const [error, setError] = useState(""); const [showInterventionSuggestions, setShowInterventionSuggestions] = useState(false);
  const pendingInterventionIdsRef = useRef(new Set<string>());
  const [pendingInterventionIds, setPendingInterventionIds] = useState<Set<string>>(() => new Set());
  const identitySentinelRef = useRef<HTMLDivElement>(null);
  const [identityIsFloating, setIdentityIsFloating] = useState(false);
  useEffect(() => {
    const sentinel = identitySentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setIdentityIsFloating(!entry.isIntersecting), { rootMargin: "-96px 0px 0px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [student.enrollmentId]);
  const visibleTerms = Array.from({ length: term }, (_, index) => index + 1);
  const subjectRows = [...new Map(student.results.map((item) => [item.subject_id, { subjectId: item.subject_id, subjectName: item.subjectName }])).values()]
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "pt-BR"));
  async function addIntervention() {
    const submitted = { description: description.trim(), responsible, dueDate };
    if (!submitted.description) return;
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const operationId = `student-intervention-create-${optimisticId}`;
    const optimisticIntervention: Intervention = { id: optimisticId, description: submitted.description, responsible_name: responsible.trim() || null, due_date: dueDate || null, status: "pending", outcome: null, cancellation_reason: null, optimistic: true };
    setOperationPending(operationId, true); setCreating(true); setError(""); setInterventions((current) => [...current, optimisticIntervention]); setDescription(""); setResponsible(""); setDueDate(""); setShowInterventionSuggestions(false);
    try {
      const created = await councilFetch<Intervention>(`/api/class-councils/${councilId}/classes/${classId}/interventions`, { method: "POST", body: JSON.stringify({ enrollmentId: student.enrollmentId, description: submitted.description, responsibleName: submitted.responsible, dueDate: submitted.dueDate }) });
      setInterventions((current) => current.map((item) => item.id === optimisticId ? created : item));
    } catch (err) {
      setInterventions((current) => current.filter((item) => item.id !== optimisticId));
      setDescription((current) => current || submitted.description); setResponsible((current) => current || submitted.responsible); setDueDate((current) => current || submitted.dueDate);
      setError(err instanceof Error ? err.message : "Falha ao criar.");
    } finally { setCreating(false); setOperationPending(operationId, false); }
  }
  async function patchIntervention(id: string, payload: InterventionPatch) {
    if (pendingInterventionIdsRef.current.has(id)) return;
    const previous = interventions.find((item) => item.id === id);
    if (!previous || previous.optimistic) return;
    const operationId = `student-intervention-update-${id}`;
    setOperationPending(operationId, true); pendingInterventionIdsRef.current.add(id); setPendingInterventionIds(new Set(pendingInterventionIdsRef.current)); setError("");
    setInterventions((current) => current.map((item) => item.id === id ? applyInterventionPatch(item, payload) : item));
    try {
      const updated = await councilFetch<Intervention>(`/api/class-councils/${councilId}/interventions/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      setInterventions((current) => current.map((item) => item.id === id ? updated : item));
    } catch (err) {
      setInterventions((current) => current.map((item) => item.id === id ? previous : item));
      setError(err instanceof Error ? err.message : "Falha ao atualizar a intervenção.");
    } finally {
      pendingInterventionIdsRef.current.delete(id); setPendingInterventionIds(new Set(pendingInterventionIdsRef.current)); setOperationPending(operationId, false);
    }
  }
  function toggleBehavior(category: BehaviorCategory, checked: boolean) { updateDraft({ behaviors: checked ? [...draft.behaviors, { category, description: null }] : draft.behaviors.filter((item) => item.category !== category) }); }
  const behaviorEntries = Object.entries(BEHAVIOR_LABELS) as Array<[BehaviorCategory, string]>;
  const behaviorColumnBreak = Math.ceil(behaviorEntries.length / 2);
  const behaviorColumns = [behaviorEntries.slice(0, behaviorColumnBreak), behaviorEntries.slice(behaviorColumnBreak)];
  return <article className="min-w-0 p-4 sm:p-6"><div ref={identitySentinelRef} className="h-px" aria-hidden="true" /><div className="relative sticky top-20 z-20 mb-5">{identityIsFloating && <div aria-hidden="true" className="pointer-events-none absolute -left-px -right-px top-1/2 z-0 h-20 -translate-y-full bg-gradient-to-b from-background/80 via-background/95 to-background" />}<div className={`relative z-10 flex flex-wrap items-start justify-between gap-3 bg-background transition-all duration-200 ${identityIsFloating ? "rounded-xl border p-3 shadow-lg" : ""}`}><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{student.name}</h2>{student.isPcd && <Badge variant="secondary" className="border-blue-200 bg-blue-100 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">PCD</Badge>}</div><p className="text-xs text-muted-foreground">Matrícula {student.enrollmentNumber} · Frequência {student.attendanceRate === null ? "não informada" : `${student.attendanceRate}%`}</p></div><div className="flex items-center gap-2"><SaveIndicator state={state} retry={retry} /><Badge variant="outline" className="max-w-32 truncate" title={className}>Turma {className}</Badge><Button variant="outline" size="icon" disabled={!previous} onClick={previous}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" disabled={!next} onClick={next}><ChevronRight className="h-4 w-4" /></Button></div></div></div>
    <section className="mb-5 rounded-xl border bg-muted/30 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><CircleAlert className="h-4 w-4" />Alertas explicados</h3>{student.alerts.reasons.length ? <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">{student.alerts.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Nenhum alerta pelos critérios do conselho.</p>}</section>
    <TooltipProvider delayDuration={600}>
      <div className="mb-5 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="py-2 pl-4 pr-2 text-left">Disciplina</th>
              {visibleTerms.map((visibleTerm) => <th key={visibleTerm} className={`p-2 text-center ${visibleTerm === term ? "bg-primary/10" : ""}`}>{visibleTerm}º bim.</th>)}
              <th className="p-2 text-center">Faltas ({term}º)</th>
            </tr>
          </thead>
          <tbody>
            {subjectRows.map((subject) => {
              const currentResult = student.results.find((item) => item.subject_id === subject.subjectId && item.term === term);
              const previousResult = student.results.find((item) => item.subject_id === subject.subjectId && item.term === term - 1);

              return <tr key={subject.subjectId} className="group border-t transition-colors odd:bg-background even:bg-muted/25 hover:bg-primary/5">
                <td className="py-2 pl-4 pr-2 transition-colors">{subject.subjectName}</td>
                {visibleTerms.map((visibleTerm) => {
                  const result = student.results.find((item) => item.subject_id === subject.subjectId && item.term === visibleTerm);
                  const isCurrentTerm = visibleTerm === term;
                  const hasNumericComparison = isCurrentTerm && result?.grade !== null && result?.grade !== undefined && previousResult?.grade !== null && previousResult?.grade !== undefined;
                  const trend = hasNumericComparison ? Math.sign(result.grade! - previousResult.grade!) : 0;
                  const trendLabel = trend > 0 ? "Melhorou" : trend < 0 ? "Piorou" : null;
                  const cell = <span
                    tabIndex={isCurrentTerm && term > 1 ? 0 : undefined}
                    aria-label={trendLabel ? `${formatGrade(result)}. ${trendLabel} em relação ao bimestre anterior.` : undefined}
                    className="inline-flex min-w-8 items-center justify-center gap-1 rounded px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {formatGrade(result)}
                    {trend > 0 && <ArrowUp aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                    {trend < 0 && <ArrowDown aria-hidden="true" className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
                  </span>;

                  return <td key={visibleTerm} className={`p-2 text-center font-medium transition-colors ${isCurrentTerm ? "bg-primary/5 group-hover:bg-primary/10" : ""} ${result?.grade !== null && result?.grade !== undefined && result.grade < 6 ? "text-destructive" : ""}`}>
                    {isCurrentTerm && term > 1 ? <Tooltip><TooltipTrigger asChild>{cell}</TooltipTrigger><TooltipContent side="top" sideOffset={6}>Bimestre anterior: {formatGrade(previousResult)}{trendLabel ? ` · ${trendLabel}` : ""}</TooltipContent></Tooltip> : cell}
                  </td>;
                })}
                <td className="p-2 text-center transition-colors">{currentResult?.absences ?? "—"}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Realização de atividades</Label><Select disabled={readOnly} value={draft.activitiesStatus} onValueChange={(value) => updateDraft({ activitiesStatus: value as ActivitiesStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_informed">Não informado</SelectItem><SelectItem value="regular">Regular</SelectItem><SelectItem value="irregular">Irregular</SelectItem><SelectItem value="does_not_do">Não realiza</SelectItem></SelectContent></Select></div><label className="flex items-center gap-2 self-end rounded-lg border p-3 text-sm"><Checkbox disabled={readOnly} checked={draft.discussed} onCheckedChange={(value) => updateDraft({ discussed: value === true })} />Estudante discutido</label><div className="space-y-2 sm:col-span-2"><Label>Observação pedagógica</Label><Textarea disabled={readOnly} value={draft.pedagogicalObservation} onChange={(event) => updateDraft({ pedagogicalObservation: event.target.value })} placeholder="Registre fatos observáveis e contexto, evitando diagnósticos e rótulos." /></div><div className="space-y-2 sm:col-span-2"><Label>Pontos positivos</Label><Textarea disabled={readOnly} value={draft.positiveNotes} onChange={(event) => updateDraft({ positiveNotes: event.target.value })} /></div></div>
    <section className="mt-5"><h3 className="text-sm font-semibold">Comportamentos observados</h3><p className="mt-1 text-xs text-muted-foreground">Registre situações observáveis e seu contexto.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{behaviorColumns.map((column, columnIndex) => <div key={columnIndex} className="space-y-2">{column.map(([category, label]) => <BehaviorOption key={category} label={label} behavior={draft.behaviors.find((item) => item.category === category)} disabled={readOnly} onToggle={(checked) => toggleBehavior(category, checked)} onDescriptionChange={(value) => updateDraft({ behaviors: draft.behaviors.map((item) => item.category === category ? { ...item, description: value } : item) })} />)}</div>)}</div></section>
    <section className="mt-6 border-t pt-5"><h3 className="font-semibold">Intervenções</h3><div className="mt-3 space-y-3">{interventions.map((item) => { const saving = item.optimistic || pendingInterventionIds.has(item.id); return <div key={item.id} className={`rounded-lg border p-3 transition-opacity ${saving ? "opacity-70" : ""}`}><div className="mb-3 flex items-start justify-between gap-3"><p className="text-sm">{item.description}</p>{saving && <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Salvando</span>}</div><div className="grid gap-2 sm:grid-cols-2"><Select disabled={saving} value={item.status} onValueChange={(status) => void patchIntervention(item.id, { status: status as InterventionStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="completed">Concluída</SelectItem><SelectItem value="cancelled">Cancelada</SelectItem></SelectContent></Select><Input disabled={saving} defaultValue={item.responsible_name ?? ""} placeholder="Responsável opcional" onBlur={(event) => void patchIntervention(item.id, { responsibleName: event.target.value })} />{item.status === "completed" && <Input disabled={saving} className="sm:col-span-2" defaultValue={item.outcome ?? ""} placeholder="Resultado/retorno opcional" onBlur={(event) => void patchIntervention(item.id, { outcome: event.target.value })} />}{item.status === "cancelled" && <Input disabled={saving} className="sm:col-span-2" defaultValue={item.cancellation_reason ?? ""} placeholder="Motivo do cancelamento opcional" onBlur={(event) => void patchIntervention(item.id, { cancellationReason: event.target.value })} />}</div>{item.due_date && <p className="mt-2 text-xs text-muted-foreground">Prazo: {new Date(`${item.due_date}T12:00:00`).toLocaleDateString("pt-BR")}</p>}</div>; })}</div>{!readOnly && <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="sm:col-span-2" onFocus={() => setShowInterventionSuggestions(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setShowInterventionSuggestions(false); }}><Textarea placeholder="Descrição da nova intervenção" value={description} onChange={(event) => setDescription(event.target.value)} />{showInterventionSuggestions && !description.trim() && <div className="mt-2 flex flex-wrap gap-2" aria-label="Sugestões de intervenção">{INDIVIDUAL_INTERVENTION_SUGGESTIONS.map((suggestion) => <Button key={suggestion} type="button" variant="outline" size="sm" onClick={() => { setDescription(suggestion); setShowInterventionSuggestions(false); }}>{suggestion}</Button>)}</div>}</div><Input placeholder="Responsável (opcional)" value={responsible} onChange={(event) => setResponsible(event.target.value)} /><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /><div className="sm:col-span-2"><Button onClick={addIntervention} disabled={creating || !description.trim()}><Plus className="h-4 w-4" />Adicionar intervenção</Button></div></div>}{error && <p className="mt-2 text-sm text-destructive">{error}</p>}</section>
  </article>;
}

type PresentTeacherDraft = { key: string; name: string; subjectName: string };

function normalizeSubjectOption(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

function StartClassDialog({ open, onOpenChange, data, councilId, classId, reload }: { open: boolean; onOpenChange: (open: boolean) => void; data: ClassWorkspaceData; councilId: string; classId: string; reload: () => Promise<void> }) {
  const [teachers, setTeachers] = useState<PresentTeacherDraft[]>([{ key: "first", name: "", subjectName: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const subjectListId = `start-class-subjects-${classId}`;
  const subjectsByName = useMemo(() => new Map(data.subjects.map((subject) => [normalizeSubjectOption(subject.display_name), subject])), [data.subjects]);
  const selectedSubjectIds = teachers.map((teacher) => subjectsByName.get(normalizeSubjectOption(teacher.subjectName))?.id ?? null);
  const hasDuplicateSubject = selectedSubjectIds.some((subjectId, index) => subjectId !== null && selectedSubjectIds.indexOf(subjectId) !== index);
  const canStart = teachers.length > 0 && teachers.every((teacher, index) => teacher.name.trim() && selectedSubjectIds[index]) && !hasDuplicateSubject;

  useEffect(() => {
    if (open) {
      setTeachers([{ key: "first", name: "", subjectName: "" }]);
      setError("");
    }
  }, [classId, open]);

  function updateTeacher(index: number, patch: Partial<PresentTeacherDraft>) {
    setTeachers((current) => current.map((teacher, teacherIndex) => teacherIndex === index ? { ...teacher, ...patch } : teacher));
  }

  function addTeacher() {
    if (teachers.length >= data.subjects.length) return;
    setTeachers((current) => [...current, { key: crypto.randomUUID(), name: "", subjectName: "" }]);
  }

  function completeSubjectOnTab(index: number) {
    const query = normalizeSubjectOption(teachers[index].subjectName);
    if (!query || subjectsByName.has(query)) return;
    const subjectsUsedElsewhere = new Set(selectedSubjectIds.filter((subjectId, teacherIndex): subjectId is string => teacherIndex !== index && subjectId !== null));
    const availableSubjects = data.subjects.filter((subject) => !subjectsUsedElsewhere.has(subject.id));
    const suggestion = availableSubjects.find((subject) => normalizeSubjectOption(subject.display_name).startsWith(query))
      ?? availableSubjects.find((subject) => normalizeSubjectOption(subject.display_name).includes(query));
    if (suggestion) updateTeacher(index, { subjectName: suggestion.display_name });
  }

  async function startClass() {
    if (!canStart) return;
    setSaving(true);
    setError("");
    try {
      await councilFetch(`/api/class-councils/${councilId}/classes/${classId}/start`, {
        method: "POST",
        body: JSON.stringify({ teachers: teachers.map((teacher, index) => ({ name: teacher.name, subjectId: selectedSubjectIds[index] })) }),
      });
      await reload();
      onOpenChange(false);
      toast.success("Turma iniciada com os professores presentes.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar a turma.");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) onOpenChange(nextOpen); }}>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Informe os professores da turma presentes no conselho</DialogTitle>
        <DialogDescription>Associe cada professor presente a uma disciplina válida da turma. Ao começar, eles serão adicionados simultaneamente como professores e participantes. Você também pode fechar este modal e informar esses dados depois.</DialogDescription>
      </DialogHeader>
      <datalist id={subjectListId}>{data.subjects.map((subject) => <option key={subject.id} value={subject.display_name} />)}</datalist>
      <div className="max-h-[50vh] overflow-y-auto rounded-xl border">
        <div className="hidden grid-cols-[1fr_1fr_40px] gap-3 border-b bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground sm:grid"><span>Professor</span><span>Disciplina</span><span className="sr-only">Ações</span></div>
        <div className="divide-y">{teachers.map((teacher, index) => {
          const subjectIsInvalid = Boolean(teacher.subjectName.trim()) && !selectedSubjectIds[index];
          const subjectIsDuplicated = selectedSubjectIds[index] !== null && selectedSubjectIds.indexOf(selectedSubjectIds[index]) !== index;
          return <div key={teacher.key} className="grid gap-2 bg-background p-3 sm:grid-cols-[1fr_1fr_40px] sm:gap-3">
            <div><Label htmlFor={`${teacher.key}-name`} className="mb-1 sm:sr-only">Professor</Label><Input id={`${teacher.key}-name`} autoComplete="off" placeholder="Nome do professor" value={teacher.name} onChange={(event) => updateTeacher(index, { name: event.target.value })} /></div>
            <div><Label htmlFor={`${teacher.key}-subject`} className="mb-1 sm:sr-only">Disciplina</Label><Input id={`${teacher.key}-subject`} list={subjectListId} autoComplete="off" placeholder="Digite ou selecione" value={teacher.subjectName} aria-invalid={subjectIsInvalid || subjectIsDuplicated} onChange={(event) => updateTeacher(index, { subjectName: event.target.value })} onKeyDown={(event) => { if (event.key === "Tab") completeSubjectOnTab(index); if (event.key === "Enter" && index === teachers.length - 1 && teacher.name.trim() && selectedSubjectIds[index] && !subjectIsDuplicated) { event.preventDefault(); addTeacher(); } }} />{subjectIsInvalid && <p className="mt-1 text-xs text-destructive">Selecione uma disciplina válida da lista.</p>}{subjectIsDuplicated && <p className="mt-1 text-xs text-destructive">Esta disciplina já foi informada.</p>}</div>
            <Button type="button" variant="ghost" size="icon" className="self-end justify-self-end sm:self-start" tabIndex={-1} disabled={teachers.length === 1 || saving} aria-label="Remover professor" onClick={() => setTeachers((current) => current.filter((_, teacherIndex) => teacherIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
          </div>;
        })}</div>
      </div>
      {teachers.length < data.subjects.length && <Button type="button" variant="outline" className="w-fit" disabled={saving} onClick={addTeacher}><Plus className="h-4 w-4" />Adicionar professor</Button>}
      {hasDuplicateSubject && <p className="text-sm text-destructive">Cada disciplina pode ser selecionada apenas uma vez.</p>}
      {error && <p className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</p>}
      <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Fechar e informar depois</Button><Button type="button" disabled={!canStart || saving} onClick={() => void startClass()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}{saving ? "Iniciando" : "Começar"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

const collectiveFields = [["class_strengths","Pontos positivos da turma"],["general_difficulties","Dificuldades gerais"],["behavior_and_coexistence","Comportamento e convivência"],["learning_aspects","Aspectos de aprendizagem"],["collective_strategies","Estratégias e intervenções coletivas"]] as const;
function CollectiveEditor({ data, councilId, classId, setOperationPending }: { data: ClassWorkspaceData; councilId: string; classId: string; setOperationPending: (operation: string, pending: boolean) => void }) { return <div className="space-y-6"><div className="rounded-2xl border bg-white p-5 dark:bg-card"><h2 className="font-semibold">Análise coletiva</h2><p className="mt-1 text-sm text-muted-foreground">Todos os campos são opcionais e salvos automaticamente.</p><div className="mt-5 grid gap-5 lg:grid-cols-2">{collectiveFields.map(([field,label]) => <AutosaveText key={field} operationKey={`collective-${field}`} label={label} initial={data.class[field] ?? ""} disabled={data.readOnly} setOperationPending={setOperationPending} save={(value) => councilFetch(`/api/class-councils/${councilId}/classes/${classId}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) })} />)}</div></div><ClassInterventions data={data} councilId={councilId} classId={classId} setOperationPending={setOperationPending} /></div>; }
function AutosaveText({ label, initial, disabled, operationKey, setOperationPending, save }: { label: string; initial: string; disabled: boolean; operationKey: string; setOperationPending: (operation: string, pending: boolean) => void; save: (value: string) => Promise<unknown> }) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const mounted = useRef(false);
  const sequenceRef = useRef(0);
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; }, [save]);

  const persist = useCallback(async (currentValue: string, operationId: string) => {
    setState("saving"); setOperationPending(operationId, true);
    try { await saveRef.current(currentValue); setState("saved"); }
    catch { setState("error"); }
    finally { setOperationPending(operationId, false); }
  }, [setOperationPending]);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (disabled) return;
    const operationId = `${operationKey}-${++sequenceRef.current}`;
    let started = false;
    setState("saving"); setOperationPending(operationId, true);
    const timer = window.setTimeout(() => { started = true; void persist(value, operationId); }, 650);
    return () => { window.clearTimeout(timer); if (!started) setOperationPending(operationId, false); };
  }, [disabled, operationKey, persist, setOperationPending, value]);

  return <div className="space-y-2"><div className="flex justify-between gap-2"><Label>{label}</Label><SaveIndicator state={state} retry={() => { const operationId = `${operationKey}-retry-${++sequenceRef.current}`; void persist(value, operationId); }} /></div><Textarea disabled={disabled} value={value} onChange={(event) => setValue(event.target.value)} className="min-h-28" /></div>;
}

function ClassInterventions({ data, councilId, classId, setOperationPending }: { data: ClassWorkspaceData; councilId: string; classId: string; setOperationPending: (operation: string, pending: boolean) => void }) {
  const [interventions, setInterventions] = useState(data.classInterventions);
  const [description, setDescription] = useState("");
  const [responsible, setResponsible] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const pendingIdsRef = useRef(new Set<string>());
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");

  async function create() {
    const submitted = { description: description.trim(), responsible, dueDate };
    if (!submitted.description) return;
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const operationId = `class-intervention-create-${optimisticId}`;
    const optimistic: Intervention = { id: optimisticId, description: submitted.description, responsible_name: responsible.trim() || null, due_date: dueDate || null, status: "pending", outcome: null, cancellation_reason: null, optimistic: true };
    setOperationPending(operationId, true); setCreating(true); setError(""); setInterventions((current) => [...current, optimistic]); setDescription(""); setResponsible(""); setDueDate("");
    try {
      const created = await councilFetch<Intervention>(`/api/class-councils/${councilId}/classes/${classId}/interventions`, { method: "POST", body: JSON.stringify({ description: submitted.description, responsibleName: submitted.responsible, dueDate: submitted.dueDate }) });
      setInterventions((current) => current.map((item) => item.id === optimisticId ? created : item));
    } catch (err) {
      setInterventions((current) => current.filter((item) => item.id !== optimisticId));
      setDescription((current) => current || submitted.description); setResponsible((current) => current || submitted.responsible); setDueDate((current) => current || submitted.dueDate);
      setError(err instanceof Error ? err.message : "Falha ao criar.");
    } finally { setCreating(false); setOperationPending(operationId, false); }
  }

  async function update(id: string, status: InterventionStatus) {
    if (pendingIdsRef.current.has(id)) return;
    const previous = interventions.find((item) => item.id === id);
    if (!previous || previous.optimistic) return;
    const operationId = `class-intervention-update-${id}`;
    setOperationPending(operationId, true); pendingIdsRef.current.add(id); setPendingIds(new Set(pendingIdsRef.current)); setError("");
    setInterventions((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    try {
      const updated = await councilFetch<Intervention>(`/api/class-councils/${councilId}/interventions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setInterventions((current) => current.map((item) => item.id === id ? updated : item));
    } catch (err) {
      setInterventions((current) => current.map((item) => item.id === id ? previous : item));
      setError(err instanceof Error ? err.message : "Falha ao atualizar.");
    } finally {
      pendingIdsRef.current.delete(id); setPendingIds(new Set(pendingIdsRef.current)); setOperationPending(operationId, false);
    }
  }

  return <section className="rounded-2xl border bg-white p-5 dark:bg-card"><h2 className="font-semibold">Intervenções coletivas</h2><div className="mt-4 space-y-2">{interventions.map((item) => { const saving = item.optimistic || pendingIds.has(item.id); return <div key={item.id} className={`grid gap-3 rounded-xl border p-3 transition-opacity sm:grid-cols-[1fr_180px] ${saving ? "opacity-70" : ""}`}><div><div className="flex items-start justify-between gap-3"><p className="text-sm">{item.description}</p>{saving && <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Salvando</span>}</div><p className="mt-1 text-xs text-muted-foreground">{item.responsible_name || "Sem responsável"}{item.due_date ? ` · prazo ${new Date(`${item.due_date}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}</p></div><Select disabled={saving} value={item.status} onValueChange={(status) => void update(item.id, status as InterventionStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="completed">Concluída</SelectItem><SelectItem value="cancelled">Cancelada</SelectItem></SelectContent></Select></div>; })}</div>{!data.readOnly && <div className="mt-4 grid gap-2 sm:grid-cols-2"><Textarea className="sm:col-span-2" placeholder="Descrição da intervenção coletiva" value={description} onChange={(event) => setDescription(event.target.value)} /><Input placeholder="Responsável opcional" value={responsible} onChange={(event) => setResponsible(event.target.value)} /><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /><Button className="sm:col-span-2 sm:w-fit" disabled={creating || !description.trim()} onClick={create}><Plus className="h-4 w-4" />Adicionar intervenção coletiva</Button></div>}{error && <p className="mt-3 text-sm text-destructive">{error}</p>}</section>;
}

function ParticipantsEditor({ data, councilId, classId, reload, setOperationPending }: { data: ClassWorkspaceData; councilId: string; classId: string; reload: () => Promise<void>; setOperationPending: (operation: string, pending: boolean) => void }) {
  const [participants, setParticipants] = useState(data.participants.map((item) => ({ name: item.name, roleOrSubject: item.role_or_subject ?? "" })));
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>(() => Object.fromEntries(data.subjects.map((subject) => [subject.id, subject.teacher_name ?? ""])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const teacherSaveSequenceRef = useRef(0);
  const suggestionListId = `class-teachers-${classId}`;
  useEffect(() => { setParticipants(data.participants.map((item) => ({ name: item.name, roleOrSubject: item.role_or_subject ?? "" }))); }, [data.participants]);
  useEffect(() => { setTeacherNames(Object.fromEntries(data.subjects.map((subject) => [subject.id, subject.teacher_name ?? ""]))); }, [data.subjects]);
  const teacherSuggestions = useMemo(() => [...new Map(Object.values(teacherNames)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => [name.toLocaleLowerCase("pt-BR"), name])).values()]
    .sort((a, b) => a.localeCompare(b, "pt-BR")), [teacherNames]);

  async function save() {
    const operationId = "participants-save";
    setOperationPending(operationId, true); setSaving(true); setError("");
    try {
      await councilFetch(`/api/class-councils/${councilId}/classes/${classId}/participants`, { method: "PUT", body: JSON.stringify({ participants }) });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false); setOperationPending(operationId, false);
    }
  }

  async function saveTeacher(subjectId: string) {
    const operationId = `teacher-save-${subjectId}-${++teacherSaveSequenceRef.current}`;
    setOperationPending(operationId, true);
    try {
      await councilFetch(`/api/class-councils/${councilId}/classes/${classId}/subjects/${subjectId}`, { method: "PATCH", body: JSON.stringify({ teacherName: teacherNames[subjectId] }) });
    } catch {
      setError("Não foi possível salvar o professor.");
    } finally { setOperationPending(operationId, false); }
  }

  return <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-5 dark:bg-card"><h2 className="font-semibold">Participantes da turma</h2><p className="mt-1 text-sm text-muted-foreground">É necessário ao menos um participante para concluir. Ao digitar, os professores informados ao lado aparecem como sugestão.</p><datalist id={suggestionListId}>{teacherSuggestions.map((name) => <option key={name} value={name} />)}</datalist><div className="mt-4 space-y-3">{participants.map((item, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><Input list={teacherSuggestions.length ? suggestionListId : undefined} autoComplete="off" disabled={data.readOnly} placeholder="Nome obrigatório" value={item.name} onChange={(event) => setParticipants((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, name: event.target.value } : value))} /><Input disabled={data.readOnly} placeholder="Disciplina/função" value={item.roleOrSubject} onChange={(event) => setParticipants((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, roleOrSubject: event.target.value } : value))} /><Button disabled={data.readOnly} variant="ghost" size="icon" onClick={() => setParticipants((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}</div>{!data.readOnly && <div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => setParticipants((current) => [...current, { name: "", roleOrSubject: "" }])}><Plus className="h-4 w-4" />Adicionar</Button><Button onClick={save} disabled={saving || participants.some((item) => !item.name.trim())}><Save className="h-4 w-4" />{saving ? "Salvando" : "Salvar participantes"}</Button></div>}{error && <p className="mt-3 text-sm text-destructive">{error}</p>}</section><section className="rounded-2xl border bg-white p-5 dark:bg-card"><h2 className="font-semibold">Professores por disciplina</h2><div className="mt-4 space-y-3">{data.subjects.map((subject) => <div key={subject.id} className="grid gap-1"><Label htmlFor={subject.id}>{subject.display_name}</Label><Input id={subject.id} disabled={data.readOnly} value={teacherNames[subject.id] ?? ""} placeholder="Nome opcional" onChange={(event) => setTeacherNames((current) => ({ ...current, [subject.id]: event.target.value }))} onBlur={() => void saveTeacher(subject.id)} /></div>)}</div></section></div>;
}

function ClassVisualizations({ data }: { data: ClassWorkspaceData }) { const max=Math.max(1,...data.visualizations.distribution.map((item)=>item.students)); return <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-5 dark:bg-card"><h2 className="font-semibold">Disciplinas com nota abaixo de 6,0 por estudante</h2><div className="mt-5 space-y-3">{data.visualizations.distribution.map((item)=><div key={item.count} className="grid grid-cols-[90px_1fr_35px] items-center gap-3 text-sm"><span>{item.count} disciplinas</span><div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${(item.students/max)*100}%`}}/></div><strong>{item.students}</strong></div>)}</div></section><section className="rounded-2xl border bg-white p-5 dark:bg-card"><h2 className="font-semibold">Evolução em relação ao bimestre anterior</h2><div className="mt-5 grid grid-cols-2 gap-3">{[["Melhoraram",data.visualizations.evolution.improved],["Estáveis",data.visualizations.evolution.stable],["Pioraram",data.visualizations.evolution.worsened],["Sem comparação",data.visualizations.evolution.unavailable]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-muted/60 p-4"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div></section></div>; }
