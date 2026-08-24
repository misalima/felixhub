"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, BookOpenCheck, CalendarDays, CheckCircle2, ChevronDown, Clock3, GraduationCap, Loader2, MessageSquareText, PencilLine, Plus, ShieldAlert, TriangleAlert, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { councilFetch } from "@/lib/class-council/client";
import { BEHAVIOR_LABELS } from "@/lib/class-council/constants";
import { subjectAbbreviation } from "@/lib/class-council/presentation";
import { STUDENT_OCCURRENCE_CATEGORIES, STUDENT_OCCURRENCE_LABELS } from "@/lib/students/occurrences";
import { STUDENT_SITUATIONS, STUDENT_SITUATION_DESCRIPTIONS, STUDENT_SITUATION_LABELS } from "@/lib/students/situations";
import type { AttendanceSituation } from "@/types/class-council";
import type { StudentCouncilHistoryItem, StudentProfileData } from "@/types/student-profile";
import type { StudentOccurrenceCategory } from "@/types/student-occurrence";

const academicLabels = { normal: "No ritmo", monitoring: "Em monitoramento", retention_risk: "Risco de retenção", completion_risk: "Risco de não conclusão" } as const;
const activityLabels = { not_informed: "Não informado", regular: "Realiza regularmente", irregular: "Realiza de forma irregular", does_not_do: "Não realiza" } as const;
const projectionLabels = { projected_approved: "Aprovação projetada", projected_retained: "Retenção projetada", abandonment: "Abandono", insufficient_data: "Sem projeção", excluded_movement: "Movimentação excluída" } as const;
const interventionLabels = { pending: "Pendente", in_progress: "Em andamento", completed: "Concluída", cancelled: "Cancelada" } as const;
const shiftLabels: Record<string, string> = { morning: "Manhã", afternoon: "Tarde", evening: "Noite" };

function formatDate(value: string | null) {
  return value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "Não informada";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("pt-BR");
}

function academicTone(status: StudentCouncilHistoryItem["alerts"]["academicStatus"]) {
  if (status === "retention_risk" || status === "completion_risk") return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/35 dark:text-rose-200";
  if (status === "monitoring") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-200";
  return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-200";
}

function situationTone(situation: AttendanceSituation) {
  if (situation === "dropout") return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/35 dark:text-rose-200";
  if (situation === "infrequent") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-200";
  if (situation === "transferred") return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/35 dark:text-sky-200";
  return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-200";
}

export default function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { data, error, isPending } = useQuery({
    queryKey: ["student-profile", studentId],
    queryFn: () => councilFetch<StudentProfileData>(`/api/students/${studentId}`),
    enabled: Boolean(studentId),
  });

  if (isPending) return <main className="mx-auto grid min-h-[70vh] max-w-7xl place-items-center p-6"><div className="text-center"><Loader2 className="mx-auto size-7 animate-spin text-sky-600" /><p className="mt-3 text-sm text-muted-foreground">Reunindo o histórico do estudante...</p></div></main>;
  if (error || !data) return <main className="mx-auto max-w-4xl p-6 py-12"><div className="rounded-3xl border border-rose-200 bg-white p-8 text-center dark:bg-slate-900"><ShieldAlert className="mx-auto size-8 text-rose-600" /><h1 className="mt-4 text-xl font-bold">Não foi possível abrir o estudante</h1><p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Tente novamente em instantes."}</p><Button asChild variant="outline" className="mt-6"><Link href="/hub/dashboard">Voltar ao dashboard</Link></Button></div></main>;

  const latest = data.latest;
  return <TooltipProvider delayDuration={250}><main className="mx-auto w-full max-w-7xl p-4 py-8 sm:p-6 lg:p-8 min-[1800px]:max-w-[1600px] min-[2400px]:max-w-[1800px]">
    <Link href="/hub/alunos" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" />Voltar aos estudantes</Link>

    <header className="rounded-3xl border bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4"><div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-slate-950 text-lg font-black text-white dark:bg-white dark:text-slate-950">{initials(data.student.name)}</div><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Perfil do estudante</p><h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">{data.student.name}</h1><p className="mt-1 text-sm text-muted-foreground">Matrícula {data.student.enrollmentNumber}{latest ? ` · Turma ${latest.class.name}` : ""}</p></div></div>
        <div className="flex flex-wrap items-center gap-2"><StudentSituationControl studentId={data.student.id} currentSituation={data.student.currentSituation} situationUpdatedAt={data.student.situationUpdatedAt} />{latest ? <Button asChild variant="outline" className="rounded-xl"><Link href={`/hub/conselhos/${latest.council.id}/turmas/${latest.class.id}`}>Abrir no conselho<ArrowUpRight className="size-4" /></Link></Button> : null}</div>
      </div>
    </header>

    {!latest ? <><section className="mt-6 rounded-3xl border border-dashed bg-white p-12 text-center dark:bg-slate-900"><UserRound className="mx-auto size-9 text-slate-400" /><h2 className="mt-4 text-lg font-bold">Sem histórico confirmado</h2><p className="mt-2 text-sm text-muted-foreground">O estudante está cadastrado, mas ainda não aparece em uma versão ativa de relatório do Conselho de Classe.</p></section><OccurrenceSection studentId={data.student.id} occurrences={data.occurrences} /></> : <>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard icon={CalendarDays} value={data.summary.councils} label={data.summary.councils === 1 ? "conselho no histórico" : "conselhos no histórico"} />
        <SummaryCard icon={Clock3} value={latest.snapshot.attendanceRate === null ? "—" : `${latest.snapshot.attendanceRate.toLocaleString("pt-BR")}%`} label="frequência mais recente" />
        <SummaryCard icon={MessageSquareText} value={data.summary.behaviorRecords} label={data.summary.behaviorRecords === 1 ? "registro de comportamento" : "registros de comportamento"} />
        <SummaryCard icon={BookOpenCheck} value={data.summary.openInterventions} label={data.summary.openInterventions === 1 ? "intervenção aberta" : "intervenções abertas"} />
        <SummaryCard icon={TriangleAlert} value={data.summary.occurrences} label={data.summary.occurrences === 1 ? "ocorrência registrada" : "ocorrências registradas"} />
      </section>

      <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Situação mais recente</p><h2 className="mt-2 text-xl font-black">{latest.council.term}º bimestre de {latest.council.schoolYear}</h2><p className="mt-1 text-sm text-muted-foreground">{latest.class.name} · {latest.class.gradeLevel ? `${latest.class.gradeLevel}ª série` : "Série não identificada"} · {shiftLabels[latest.class.shift] ?? latest.class.shift} · Conselho de {formatDate(latest.council.meetingDate)}</p></div><span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${academicTone(latest.alerts.academicStatus)}`}>{academicLabels[latest.alerts.academicStatus]}</span></div>
        <StatusOverview item={latest} />
        <div className="mt-7 grid gap-6 xl:grid-cols-[1.45fr_0.75fr]"><SubjectTable item={latest} /><CouncilRecords item={latest} /></div>
      </section>

      <OccurrenceSection studentId={data.student.id} occurrences={data.occurrences} />

      <section className="mt-7"><div><h2 className="text-xl font-black">Histórico de conselhos</h2><p className="mt-1 text-sm text-muted-foreground">Registros anteriores, preservados por bimestre e ano letivo.</p></div>
        {data.history.length > 1 ? <div className="mt-4 space-y-3">{data.history.slice(1).map((item) => <details key={item.enrollment.id} className="group rounded-2xl border bg-white shadow-sm open:shadow-md dark:bg-slate-900"><summary className="flex cursor-pointer list-none items-center gap-4 p-5"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 font-black dark:bg-slate-800">{item.council.term}º</div><div className="min-w-0 flex-1"><strong className="block truncate">{item.council.schoolYear} · {item.class.name}</strong><p className="mt-0.5 text-xs text-muted-foreground">{academicLabels[item.alerts.academicStatus]} · frequência {item.snapshot.attendanceRate === null ? "não informada" : `${item.snapshot.attendanceRate.toLocaleString("pt-BR")}%`} · {formatDate(item.council.meetingDate)}</p></div><ChevronDown className="size-4 text-muted-foreground transition group-open:rotate-180" /></summary><div className="border-t p-5 sm:p-6"><StatusOverview item={item} /><div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.75fr]"><SubjectTable item={item} /><CouncilRecords item={item} /></div></div></details>)}</div> : <div className="mt-4 rounded-2xl border border-dashed bg-white p-7 text-sm text-muted-foreground dark:bg-slate-900">Este é o primeiro conselho confirmado deste estudante.</div>}
      </section>
    </>}
  </main></TooltipProvider>;
}

function StudentSituationControl({ studentId, currentSituation, situationUpdatedAt }: { studentId: string; currentSituation: AttendanceSituation; situationUpdatedAt: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [situation, setSituation] = useState<AttendanceSituation>(currentSituation);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await councilFetch(`/api/students/${studentId}/situation`, { method: "PATCH", body: JSON.stringify({ situation }) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["student-profile", studentId] }),
        queryClient.invalidateQueries({ queryKey: ["student-directory"] }),
        queryClient.invalidateQueries({ queryKey: ["pedagogical-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["class-councils"] }),
      ]);
      setOpen(false);
      toast.success(`Situação atualizada para ${STUDENT_SITUATION_LABELS[situation].toLocaleLowerCase("pt-BR")}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a situação do estudante.");
    } finally {
      setSaving(false);
    }
  }

  return <><button type="button" onClick={() => { setSituation(currentSituation); setOpen(true); }} className={`group flex items-center gap-3 rounded-xl border px-3.5 py-2 text-left transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${situationTone(currentSituation)}`}><span><span className="block text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">Situação atual</span><strong className="block text-xs">{STUDENT_SITUATION_LABELS[currentSituation]}</strong></span><PencilLine className="size-3.5 opacity-60 transition group-hover:opacity-100" /></button>
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) setOpen(nextOpen); }}><DialogContent className="rounded-2xl sm:max-w-lg"><DialogHeader><DialogTitle>Frequência e vínculo</DialogTitle><DialogDescription>Esta é a situação permanente do estudante e pode ser alterada mesmo quando ele não aparece no relatório mais recente.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label>Situação atual</Label><Select value={situation} onValueChange={(value) => setSituation(value as AttendanceSituation)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{STUDENT_SITUATIONS.map((item) => <SelectItem key={item} value={item}>{STUDENT_SITUATION_LABELS[item]}</SelectItem>)}</SelectContent></Select></div><div className={`rounded-xl border p-3 text-xs leading-5 ${situationTone(situation)}`}>{STUDENT_SITUATION_DESCRIPTIONS[situation]}</div>{situationUpdatedAt ? <p className="text-[11px] text-muted-foreground">Última alteração em {new Date(situationUpdatedAt).toLocaleString("pt-BR")}.</p> : null}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button><Button type="button" onClick={() => void save()} disabled={saving || situation === currentSituation}>{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{saving ? "Salvando..." : "Salvar situação"}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}

function OccurrenceSection({ studentId, occurrences }: { studentId: string; occurrences: StudentProfileData["occurrences"] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [occurredOn, setOccurredOn] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Maceio", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const [category, setCategory] = useState<StudentOccurrenceCategory>("removed_from_classroom");
  const [notes, setNotes] = useState("");
  const [guardianNotified, setGuardianNotified] = useState("no");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await councilFetch(`/api/students/${studentId}/occurrences`, { method: "POST", body: JSON.stringify({ occurredOn, category, notes, guardianNotified: guardianNotified === "yes" }) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["student-profile", studentId] }),
        queryClient.invalidateQueries({ queryKey: ["student-directory"] }),
      ]);
      setOpen(false);
      setNotes("");
      setGuardianNotified("no");
      toast.success("Ocorrência registrada no prontuário do estudante.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar a ocorrência.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="mt-7 rounded-3xl border bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Prontuário disciplinar</p><h2 className="mt-2 text-xl font-black">Ocorrências</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Registros factuais da vida escolar. Eles não alteram automaticamente o risco acadêmico nem os indicadores de comportamento do conselho.</p></div><Button className="rounded-xl" onClick={() => setOpen(true)}><Plus className="size-4" />Registrar ocorrência</Button></div>
    {occurrences.length ? <div className="mt-5 divide-y rounded-2xl border">{occurrences.map((occurrence) => <article key={occurrence.id} className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-sm">{STUDENT_OCCURRENCE_LABELS[occurrence.category]}</strong><p className="mt-1 text-xs text-muted-foreground">{formatDate(occurrence.occurredOn)}{occurrence.createdByName ? ` · Registrado por ${occurrence.createdByName}` : ""}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${occurrence.guardianNotified ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{occurrence.guardianNotified ? "Responsável ciente" : "Responsável não cientificado"}</span></div>{occurrence.notes ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{occurrence.notes}</p> : null}</article>)}</div> : <div className="mt-5 rounded-2xl border border-dashed p-8 text-center"><TriangleAlert className="mx-auto size-7 text-slate-400" /><p className="mt-3 text-sm font-semibold">Nenhuma ocorrência registrada</p><p className="mt-1 text-xs text-muted-foreground">O histórico será exibido aqui em ordem cronológica.</p></div>}

    <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) setOpen(nextOpen); }}><DialogContent className="rounded-2xl sm:max-w-xl"><form onSubmit={submit}><DialogHeader><DialogTitle>Registrar ocorrência</DialogTitle><DialogDescription>Descreva o fato de maneira objetiva. O registro ficará vinculado permanentemente ao estudante.</DialogDescription></DialogHeader><div className="grid gap-4 py-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="occurrence-date">Data</Label><Input id="occurrence-date" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} max={new Intl.DateTimeFormat("en-CA", { timeZone: "America/Maceio", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())} required /></div><div className="space-y-2"><Label>Responsável ciente</Label><Select value={guardianNotified} onValueChange={setGuardianNotified}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Sim</SelectItem><SelectItem value="no">Não</SelectItem></SelectContent></Select></div><div className="space-y-2 sm:col-span-2"><Label>Tipo de ocorrência</Label><Select value={category} onValueChange={(value) => setCategory(value as StudentOccurrenceCategory)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{STUDENT_OCCURRENCE_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{STUDENT_OCCURRENCE_LABELS[item]}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="occurrence-notes">Observações {category === "other" ? "" : "(opcional)"}</Label><Textarea id="occurrence-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={5} placeholder="Contexto objetivo do ocorrido, providências tomadas e informações relevantes." required={category === "other"} /><p className="text-right text-[10px] text-muted-foreground">{notes.length}/2000</p></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{saving ? "Registrando..." : "Registrar ocorrência"}</Button></DialogFooter></form></DialogContent></Dialog>
  </section>;
}

function SummaryCard({ icon: Icon, value, label }: { icon: typeof CalendarDays; value: string | number; label: string }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Icon className="size-4" /></span><div><strong className="block text-xl font-black">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</strong><span className="text-[11px] text-muted-foreground">{label}</span></div></div></div>;
}

function StatusOverview({ item }: { item: StudentCouncilHistoryItem }) {
  return <div className="mt-6 grid gap-3 md:grid-cols-3"><StatusItem icon={GraduationCap} label="Situação acadêmica" value={academicLabels[item.alerts.academicStatus]} detail={item.alerts.reasons.length ? item.alerts.reasons.join(" · ") : "Dentro do ritmo esperado para o período."} /><StatusItem icon={Clock3} label="Frequência e vínculo no conselho" value={STUDENT_SITUATION_LABELS[item.enrollment.attendanceSituation]} detail={item.snapshot.attendanceRate === null ? "Frequência numérica não informada." : `${item.snapshot.attendanceRate.toLocaleString("pt-BR")}% de frequência no relatório${item.snapshot.enrollmentStatus ? ` · ${item.snapshot.enrollmentStatus}` : ""}.`} /><StatusItem icon={CheckCircle2} label="Fluxo projetado" value={projectionLabels[item.projection.status]} detail={item.projection.projectedFailedSubjects === null ? "Os dados atuais não permitem contar componentes projetados abaixo do ritmo." : `${item.projection.projectedFailedSubjects} ${item.projection.projectedFailedSubjects === 1 ? "componente projetado" : "componentes projetados"} abaixo do ritmo ao fim do ano.`} /></div>;
}

function StatusItem({ icon: Icon, label, value, detail }: { icon: typeof GraduationCap; label: string; value: string; detail: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Icon className="size-3.5" />{label}</div><strong className="mt-2 block text-sm">{value}</strong><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{detail}</p></div>;
}

function SubjectTable({ item }: { item: StudentCouncilHistoryItem }) {
  const subjects = [...new Map(item.results.map((result) => [result.subjectId, { id: result.subjectId, name: result.subjectName, teacher: result.teacherName }])).values()];
  return <div><div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="font-extrabold">Desempenho por componente</h3><p className="mt-1 text-xs text-muted-foreground">Notas e faltas registradas até o {item.council.term}º bimestre.</p></div><span className="text-[10px] text-muted-foreground">{subjects.length} componentes</span></div>
    {subjects.length ? <div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">Componente</th>{Array.from({ length: item.council.term }, (_, index) => <th key={index} className="w-24 px-3 py-3 text-center text-xs font-bold text-muted-foreground">{index + 1}º bim.</th>)}<th className="w-24 px-3 py-3 text-center text-xs font-bold text-muted-foreground">Pontos</th></tr></thead><tbody>{subjects.map((subject) => { const results = item.results.filter((result) => result.subjectId === subject.id); const total = results.reduce((sum, result) => sum + (result.grade ?? 0), 0); return <tr key={subject.id} className="border-t"><td className="px-4 py-3"><div className="flex items-center gap-2"><Tooltip><TooltipTrigger asChild><span tabIndex={0} className="min-w-9 cursor-help rounded-md bg-slate-100 px-1.5 py-1 text-center text-[10px] font-black dark:bg-slate-800">{subjectAbbreviation(subject.name)}</span></TooltipTrigger><TooltipContent>{subject.name}</TooltipContent></Tooltip><div><strong className="block text-xs">{subject.name}</strong>{subject.teacher ? <span className="text-[10px] text-muted-foreground">{subject.teacher}</span> : null}</div></div></td>{Array.from({ length: item.council.term }, (_, index) => { const result = results.find((entry) => entry.term === index + 1); return <td key={index} className="px-3 py-3 text-center"><strong className="text-xs">{result?.grade !== null && result?.grade !== undefined ? result.grade.toLocaleString("pt-BR") : result?.gradeMarker || "—"}</strong>{result?.absences !== null && result?.absences !== undefined ? <span className="mt-0.5 block text-[9px] text-muted-foreground">{result.absences} {result.absences === 1 ? "falta" : "faltas"}</span> : null}</td>; })}<td className="px-3 py-3 text-center font-black">{total.toLocaleString("pt-BR")}</td></tr>; })}</tbody></table></div> : <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum resultado disponível nesta versão.</div>}
  </div>;
}

function CouncilRecords({ item }: { item: StudentCouncilHistoryItem }) {
  return <aside><h3 className="font-extrabold">Registros do conselho</h3><p className="mt-1 text-xs text-muted-foreground">Informações registradas pela equipe.</p><div className="mt-3 space-y-3">
    <RecordBlock title="Participação e atividades" content={activityLabels[item.enrollment.activitiesStatus]} />
    <RecordBlock title="Aspectos positivos" content={item.enrollment.positiveNotes} empty="Nenhum aspecto positivo registrado." />
    <RecordBlock title="Observação pedagógica" content={item.enrollment.pedagogicalObservation} empty="Nenhuma observação registrada." />
    <div className="rounded-2xl border p-4"><div className="flex items-center justify-between gap-3"><strong className="text-xs">Comportamento</strong><span className="text-[10px] text-muted-foreground">{item.behaviors.length}</span></div>{item.behaviors.length ? <ul className="mt-3 space-y-2">{item.behaviors.map((behavior) => <li key={behavior.id} className="text-[11px] leading-5"><span className="font-semibold">{BEHAVIOR_LABELS[behavior.category] ?? behavior.category}</span>{behavior.description ? ` — ${behavior.description}` : ""}</li>)}</ul> : <p className="mt-2 text-[11px] text-muted-foreground">Nenhum registro de comportamento.</p>}</div>
    <div className="rounded-2xl border p-4"><div className="flex items-center justify-between gap-3"><strong className="text-xs">Intervenções</strong><span className="text-[10px] text-muted-foreground">{item.interventions.length}</span></div>{item.interventions.length ? <ul className="mt-3 space-y-3">{item.interventions.map((intervention) => <li key={intervention.id} className="border-t pt-3 first:border-0 first:pt-0"><div className="flex items-start justify-between gap-2"><p className="text-[11px] font-medium leading-5">{intervention.description}</p><span className="shrink-0 text-[9px] font-bold text-muted-foreground">{interventionLabels[intervention.status]}</span></div>{intervention.responsibleName || intervention.dueDate ? <p className="mt-1 text-[10px] text-muted-foreground">{intervention.responsibleName ? `Responsável: ${intervention.responsibleName}` : ""}{intervention.responsibleName && intervention.dueDate ? " · " : ""}{intervention.dueDate ? `Prazo: ${formatDate(intervention.dueDate)}` : ""}</p> : null}{intervention.outcome ? <p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-300">Resultado: {intervention.outcome}</p> : null}</li>)}</ul> : <p className="mt-2 text-[11px] text-muted-foreground">Nenhuma intervenção registrada.</p>}</div>
  </div></aside>;
}

function RecordBlock({ title, content, empty }: { title: string; content: string | null; empty?: string }) {
  return <div className="rounded-2xl border p-4"><strong className="text-xs">{title}</strong><p className={`mt-2 text-[11px] leading-5 ${content ? "text-foreground" : "text-muted-foreground"}`}>{content || empty || "Não informado."}</p></div>;
}
