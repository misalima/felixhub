"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCHOOL_LOCATION, SCHOOL_NAME } from "@/constants/main/school";
import { councilFetch } from "@/lib/class-council/client";
import { BEHAVIOR_LABELS } from "@/lib/class-council/constants";
import { STUDENT_OCCURRENCE_LABELS } from "@/lib/students/occurrences";
import { STUDENT_SITUATION_LABELS } from "@/lib/students/situations";
import type { StudentCouncilHistoryItem, StudentProfileData } from "@/types/student-profile";

const academicLabels = { normal: "No ritmo esperado", monitoring: "Em monitoramento", retention_risk: "Risco de retenção", completion_risk: "Risco de não conclusão" } as const;
const projectionLabels = { projected_approved: "Aprovação projetada", projected_retained: "Retenção projetada", abandonment: "Abandono", insufficient_data: "Sem projeção suficiente", excluded_movement: "Movimentação excluída do fluxo" } as const;
const interventionLabels = { pending: "Pendente", in_progress: "Em andamento", completed: "Concluída", cancelled: "Cancelada" } as const;

type StudentRecordsResponse = { profiles: StudentProfileData[] };

function formatDate(value: string | null) {
  return value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "Não informado";
}

function formatGrade(value: number | null, marker: string | null) {
  return marker || (value === null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
}

function Loading() {
  return <main className="grid min-h-[60vh] place-items-center"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" />Reunindo os prontuários...</p></main>;
}

function StudentRecordsContent() {
  const params = useSearchParams();
  const classId = params.get("class") ?? "";
  const students = params.get("students") || params.get("student") || "";
  const includeHistory = params.get("history") !== "0";
  const includeInterventions = params.get("interventions") !== "0";
  const includeOccurrences = params.get("occurrences") !== "0";
  const requestUrl = classId ? `/api/reports/student-records?class=${encodeURIComponent(classId)}` : `/api/reports/student-records?students=${encodeURIComponent(students)}`;
  const { data, error, isPending } = useQuery({ queryKey: ["student-record-report", classId || students], queryFn: () => councilFetch<StudentRecordsResponse>(requestUrl), enabled: Boolean(classId || students) });

  useEffect(() => {
    if (!data?.profiles.length) return;
    const previous = document.title;
    document.title = data.profiles.length === 1 ? `Prontuário - ${data.profiles[0].student.name}` : `Prontuários - ${data.profiles.length} estudantes`;
    return () => { document.title = previous; };
  }, [data]);

  if (!classId && !students) return <main className="mx-auto max-w-3xl p-8"><p className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />Selecione estudantes ou uma turma na Central de relatórios.</p></main>;
  if (isPending) return <Loading />;
  if (error || !data?.profiles.length) return <main className="mx-auto max-w-3xl p-8"><p className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />{error instanceof Error ? error.message : "Não foi possível carregar os prontuários."}</p></main>;

  return <div className="student-record-root min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-8 print:bg-white print:p-0">
    <div className="student-record-controls mx-auto mb-4 flex max-w-[200mm] flex-wrap items-center justify-between gap-3"><Button variant="outline" asChild><Link href="/hub/relatorios"><ArrowLeft className="size-4" />Voltar aos relatórios</Link></Button><div className="flex items-center gap-3"><span className="text-xs text-slate-600">{data.profiles.length} {data.profiles.length === 1 ? "estudante" : "estudantes"}</span><Button type="button" onClick={() => window.print()}><Printer className="size-4" />Imprimir ou salvar em PDF</Button></div></div>
    <main className="student-record-pages mx-auto max-w-[200mm] space-y-5 print:max-w-none print:space-y-0">{data.profiles.map((profile, index) => <StudentRecordDocument key={profile.student.id} data={profile} includeHistory={includeHistory} includeInterventions={includeInterventions} includeOccurrences={includeOccurrences} position={index + 1} total={data.profiles.length} />)}</main>
    <style jsx global>{`
      @page { size: A4 portrait; margin: 12mm; }
      .record-student-document { min-height: 273mm; }
      @media print {
        html, body { background: white !important; }
        .reports-app-header, .student-record-controls { display: none !important; }
        .student-record-root { min-height: 0 !important; }
        .record-student-document { box-sizing: border-box; width: 100% !important; max-width: none !important; min-height: 273mm; box-shadow: none !important; break-after: page; page-break-after: always; }
        .record-student-document:last-child { break-after: auto; page-break-after: auto; }
        .record-avoid-break { break-inside: avoid; page-break-inside: avoid; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
  </div>;
}

function StudentRecordDocument({ data, includeHistory, includeInterventions, includeOccurrences, position, total }: { data: StudentProfileData; includeHistory: boolean; includeInterventions: boolean; includeOccurrences: boolean; position: number; total: number }) {
  return <article className="record-student-document bg-white p-[12mm] shadow-lg print:p-0">
    <header className="mb-5 flex items-center gap-4 border-b-2 border-slate-900 pb-3"><Image src="/logo_escola.png" alt={`Logo da ${SCHOOL_NAME}`} width={56} height={56} className="size-14 object-contain" unoptimized /><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide">{SCHOOL_NAME}</p><p className="text-[10px] text-slate-600">{SCHOOL_LOCATION}</p><h1 className="mt-1.5 text-lg font-black">Prontuário individual do estudante</h1></div>{total > 1 ? <span className="text-[8px] text-slate-500">{position}/{total}</span> : null}</header>
    <section className="record-avoid-break rounded-lg border border-slate-300 p-3"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-black">{data.student.name}</h2><p className="mt-0.5 text-[10px] text-slate-600">Matrícula {data.student.enrollmentNumber}{data.latest ? ` · Turma ${data.latest.class.name}` : ""}</p></div><span className="rounded border border-slate-400 px-2 py-1 text-[9px] font-bold uppercase">{STUDENT_SITUATION_LABELS[data.student.currentSituation]}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-5"><RecordMetric value={data.summary.councils} label="Conselhos" /><RecordMetric value={data.latest?.snapshot.attendanceRate === null || !data.latest ? "—" : `${data.latest.snapshot.attendanceRate}%`} label="Frequência atual" /><RecordMetric value={data.summary.behaviorRecords} label="Comportamentos" /><RecordMetric value={data.summary.openInterventions} label="Intervenções abertas" /><RecordMetric value={data.summary.occurrences} label="Ocorrências" /></div></section>
    {includeHistory ? <HistorySection data={data} /> : null}
    {includeInterventions ? <InterventionsSection data={data} /> : null}
    {includeOccurrences ? <OccurrencesSection data={data} /> : null}
    <footer className="mt-7 border-t border-slate-300 pt-2 text-[8px] text-slate-500">Documento gerado pelo FelixHub em {new Date().toLocaleString("pt-BR")}.</footer>
  </article>;
}

function HistorySection({ data }: { data: StudentProfileData }) {
  return <section className="mt-6"><SectionTitle>Histórico dos Conselhos de Classe</SectionTitle>{data.history.length ? <div className="mt-3 space-y-3">{data.history.map((item) => <article key={`${item.council.id}:${item.enrollment.id}`} className="rounded-lg border border-slate-300 p-3"><div className="record-avoid-break"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-bold">{item.council.term}º bimestre de {item.council.schoolYear} · Turma {item.class.name}</h3><p className="mt-0.5 text-[9px] text-slate-500">Conselho realizado em {formatDate(item.council.meetingDate)} · {item.class.officialCode}</p></div><span className="text-[9px] font-bold text-slate-700">{academicLabels[item.alerts.academicStatus]}</span></div><div className="mt-2 grid gap-1.5 text-[9px] sm:grid-cols-3"><p><strong>Frequência:</strong> {item.snapshot.attendanceRate === null ? "não informada" : `${item.snapshot.attendanceRate}%`}</p><p><strong>Fluxo:</strong> {projectionLabels[item.projection.status]}</p><p><strong>Discutido:</strong> {item.enrollment.discussed ? "sim" : "não"}</p></div>{item.alerts.reasons.length ? <p className="mt-2 text-[9px]"><strong>Alertas:</strong> {item.alerts.reasons.join(" · ")}</p> : null}{item.enrollment.pedagogicalObservation ? <p className="mt-1.5 text-[9px]"><strong>Observação pedagógica:</strong> {item.enrollment.pedagogicalObservation}</p> : null}{item.enrollment.positiveNotes ? <p className="mt-1.5 text-[9px]"><strong>Pontos positivos:</strong> {item.enrollment.positiveNotes}</p> : null}{item.behaviors.length ? <p className="mt-1.5 text-[9px]"><strong>Comportamento:</strong> {item.behaviors.map((behavior) => `${BEHAVIOR_LABELS[behavior.category]}${behavior.description ? ` — ${behavior.description}` : ""}`).join(" · ")}</p> : null}</div><SubjectPerformanceTable item={item} /></article>)}</div> : <p className="mt-3 text-[10px] italic text-slate-500">Nenhum Conselho confirmado no histórico.</p>}</section>;
}

function SubjectPerformanceTable({ item }: { item: StudentCouncilHistoryItem }) {
  const subjects = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; results: Map<number, StudentCouncilHistoryItem["results"][number]> }>();
    for (const result of item.results) {
      const group = groups.get(result.subjectId) ?? { id: result.subjectId, name: result.subjectName, results: new Map() };
      group.results.set(result.term, result);
      groups.set(result.subjectId, group);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [item.results]);
  if (!subjects.length) return null;
  const terms = Array.from({ length: item.council.term }, (_, index) => index + 1);
  const detailMap = new Map(item.alerts.subjectDetails.map((detail) => [detail.subjectId, detail]));
  return <div className="mt-3"><p className="mb-1.5 text-[8px] text-slate-500">Uma linha por disciplina. O acumulado é comparado à pontuação esperada até o {item.council.term}º bimestre.</p><table className="w-full table-fixed border-collapse text-[8px]"><colgroup><col className="w-[30%]" />{terms.map((term) => <col key={term} className="w-[8%]" />)}<col className="w-[20%]" /><col /></colgroup><thead><tr className="border-y border-slate-400 bg-slate-50 text-left"><th className="p-1">Disciplina</th>{terms.map((term) => <th key={term} className="p-1 text-center">{term}º</th>)}<th className="p-1 text-center">Acumulado</th><th className="p-1">Situação</th></tr></thead><tbody>{subjects.map((subject) => { const detail = detailMap.get(subject.id); return <tr key={subject.id} className="record-avoid-break border-b border-slate-200"><td className="p-1 font-semibold">{subject.name}</td>{terms.map((term) => { const result = subject.results.get(term); return <td key={term} className="p-1 text-center">{result ? formatGrade(result.grade, result.gradeMarker) : "—"}</td>; })}<td className="p-1 text-center">{detail?.notAssessed ? "s/n" : detail ? `${detail.accumulatedPoints.toLocaleString("pt-BR")}/${detail.expectedPoints.toLocaleString("pt-BR")}` : "—"}</td><td className="p-1">{subjectSituation(detail)}</td></tr>; })}</tbody></table></div>;
}

function subjectSituation(detail: StudentCouncilHistoryItem["alerts"]["subjectDetails"][number] | undefined) {
  if (!detail) return "Sem análise";
  if (detail.notAssessed) return "Não avaliada";
  if (detail.incomplete) return "Dados pendentes";
  if (detail.critical) return "Situação crítica";
  if (detail.underPressure) return "Exige recuperação";
  if (detail.offPace) return "Abaixo do ritmo";
  return "No ritmo";
}

function InterventionsSection({ data }: { data: StudentProfileData }) {
  return <section className="mt-6"><SectionTitle>Intervenções</SectionTitle>{data.interventions.length ? <table className="mt-2 w-full table-fixed border-collapse text-[9px]"><colgroup><col className="w-[43%]" /><col className="w-[18%]" /><col className="w-[15%]" /><col className="w-[24%]" /></colgroup><thead><tr className="border-b border-slate-500 text-left"><th className="p-1">Intervenção</th><th className="p-1">Responsável</th><th className="p-1">Prazo</th><th className="p-1">Status/retorno</th></tr></thead><tbody>{data.interventions.map((item) => <tr key={item.id} className="record-avoid-break border-b border-slate-200 align-top"><td className="p-1"><strong>{item.description}</strong><p className="mt-0.5 text-[8px] text-slate-500">{item.origin.term}º bimestre/{item.origin.schoolYear} · {item.origin.className}</p></td><td className="p-1">{item.responsibleName ?? "—"}</td><td className="p-1">{formatDate(item.dueDate)}</td><td className="p-1"><strong>{interventionLabels[item.status]}</strong>{item.outcome ? <p className="mt-0.5">{item.outcome}</p> : item.cancellationReason ? <p className="mt-0.5">{item.cancellationReason}</p> : null}</td></tr>)}</tbody></table> : <p className="mt-3 text-[10px] italic text-slate-500">Nenhuma intervenção registrada.</p>}</section>;
}

function OccurrencesSection({ data }: { data: StudentProfileData }) {
  return <section className="mt-6"><SectionTitle>Ocorrências</SectionTitle>{data.occurrences.length ? <div className="mt-2 divide-y rounded-lg border border-slate-300">{data.occurrences.map((item) => <article key={item.id} className="record-avoid-break p-2.5"><div className="flex items-start justify-between gap-3"><strong className="text-[10px]">{STUDENT_OCCURRENCE_LABELS[item.category]}</strong><span className="text-[8px] text-slate-500">{formatDate(item.occurredOn)} · {item.guardianNotified ? "responsável ciente" : "responsável não cientificado"}</span></div>{item.notes ? <p className="mt-1 text-[9px] leading-4">{item.notes}</p> : null}</article>)}</div> : <p className="mt-3 text-[10px] italic text-slate-500">Nenhuma ocorrência registrada.</p>}</section>;
}

export default function StudentRecordReportPage() {
  return <Suspense fallback={<Loading />}><StudentRecordsContent /></Suspense>;
}

function SectionTitle({ children }: { children: React.ReactNode }) { return <h2 className="border-b border-slate-400 pb-1.5 text-xs font-black uppercase tracking-wide">{children}</h2>; }
function RecordMetric({ value, label }: { value: string | number; label: string }) { return <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5"><strong className="block text-sm">{value}</strong><span className="text-[8px] text-slate-500">{label}</span></div>; }
