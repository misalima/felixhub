"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BEHAVIOR_LABELS } from "@/lib/class-council/constants";
import { classStatusLabel } from "@/lib/class-council/presentation";
import { SCHOOL_LOCATION, SCHOOL_NAME } from "@/constants/main/school";
import type { ClassWorkspaceData } from "./ClassWorkspace";

type PrintClass = {
  id: string;
  official_code: string;
  display_name: string;
  status: string;
  studentCount?: number;
  atRiskCount?: number;
  class_strengths: string | null;
  general_difficulties: string | null;
  behavior_and_coexistence: string | null;
  learning_aspects: string | null;
  collective_strategies: string | null;
  participants: Array<{ name: string; role_or_subject: string | null }>;
};

export type CouncilPrintOverviewData = {
  council: { id: string; school_year: number; term: number; meeting_date: string; status: string; current_import_id: string | null };
  classes: PrintClass[];
  metrics: { students: number; monitoring: number; atRisk: number; retentionRisk: number; completionRisk: number; lowAttendance: number; infrequent: number; dropout: number; worsened: number; pendingInterventions: number };
  interventionDetails: Array<{ id: string; description: string; responsible_name: string | null; due_date: string | null; className: string; studentName: string | null; studentProblems: string[] }>;
};

const councilStatusLabels: Record<string, string> = { draft: "Rascunho", preparation: "Preparação", in_progress: "Em andamento", completed: "Concluído", reopened: "Reaberto" };
const activityLabels: Record<string, string> = { not_informed: "Não informado", regular: "Regular", irregular: "Irregular", does_not_do: "Não realiza" };
const attendanceSituationLabels: Record<string, string> = { regular: "Regular", infrequent: "Infrequente", dropout: "Desistente", transferred: "Transferido(a)" };

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function formatStudentProblems(problems: string[], limit = 4) {
  if (!problems.length) return "-";
  const visible = problems.slice(0, limit);
  const hiddenCount = problems.length - visible.length;
  return `${visible.join(" · ")}${hiddenCount > 0 ? ` · e mais ${hiddenCount} ${hiddenCount === 1 ? "problema" : "problemas"}` : ""}`;
}

function PrintHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="council-print-header mb-6 flex items-center gap-4 border-b-2 border-slate-900 pb-4">
    <Image src="/logo_escola.png" alt={`Logo da ${SCHOOL_NAME}`} width={64} height={64} className="council-print-logo h-16 w-16 object-contain" unoptimized />
    <div><p className="text-sm font-bold uppercase tracking-wide">{SCHOOL_NAME}</p><p className="text-xs text-slate-600">{SCHOOL_LOCATION}</p><h1 className="mt-2 text-xl font-bold">{title}</h1><p className="text-sm text-slate-600">{subtitle}</p></div>
  </header>;
}

export function CouncilPrintShell({ backHref, documentTitle, compact, onCompactChange, children }: { backHref: string; documentTitle: string; compact: boolean; onCompactChange: (compact: boolean) => void; children: React.ReactNode }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = documentTitle;
    return () => { document.title = previousTitle; };
  }, [documentTitle]);

  function printDocument() {
    document.title = documentTitle;
    window.print();
  }

  return <div className={`council-print-root min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-8 print:bg-white print:p-0 ${compact ? "council-print-compact" : ""}`} data-compact={compact}>
    <div className="council-print-controls mx-auto mb-4 flex max-w-[200mm] flex-wrap items-center justify-between gap-3">
      <Button variant="outline" asChild><Link href={backHref}><ArrowLeft className="h-4 w-4" />Voltar</Link></Button>
      <div className="flex items-center gap-3">
        <button type="button" role="switch" aria-checked={compact} onClick={() => onCompactChange(!compact)} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-ring">
          <span className={`relative h-5 w-9 rounded-full transition-colors ${compact ? "bg-primary" : "bg-slate-300"}`} aria-hidden="true"><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${compact ? "translate-x-4" : "translate-x-0"}`} /></span>
          Modo compacto
        </button>
        <Button type="button" onClick={printDocument}><Printer className="h-4 w-4" />Imprimir ou salvar em PDF</Button>
      </div>
    </div>
    <article className="council-print-document mx-auto min-h-[297mm] w-full max-w-[200mm] bg-white p-[12mm] shadow-lg print:min-h-0 print:p-0 print:shadow-none">{children}</article>
    <style jsx global>{`
      @page { size: A4 portrait; margin: 14mm; }
      .council-print-compact .council-print-header { margin-bottom: .85rem; gap: .75rem; padding-bottom: .6rem; }
      .council-print-compact .council-print-logo { width: 3rem; height: 3rem; }
      .council-print-compact .council-print-section { margin-top: 1rem !important; }
      .council-print-compact .council-print-stack { margin-top: .5rem !important; gap: .4rem !important; }
      .council-print-compact .council-print-card { border-radius: .3rem; padding: .45rem !important; }
      .council-print-compact .council-print-card p { margin-top: .15rem; }
      .council-print-compact .council-print-synthesis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .council-print-compact .council-print-synthesis > :not([hidden]) ~ :not([hidden]) { margin-top: 0 !important; }
      @media print {
        html, body { background: white !important; }
        .council-app-header, .reports-app-header, .council-print-controls { display: none !important; }
        .council-print-root { min-height: 0 !important; }
        .council-print-document { box-sizing: border-box; width: calc(100% - 4mm) !important; max-width: none !important; margin-right: 2mm !important; margin-left: 2mm !important; overflow: visible !important; }
        .council-intervention-group-header { break-after: avoid; page-break-after: avoid; }
        .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
        .print-break-before { break-before: page; page-break-before: always; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
  </div>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="council-print-card print-avoid-break rounded-lg border border-slate-300 p-3"><p className="text-xl font-bold">{value}</p><p className="text-[11px] text-slate-600">{label}</p></div>;
}

function CollectiveSummary({ item }: { item: PrintClass }) {
  const notes = [
    ["Pontos positivos", item.class_strengths],
    ["Dificuldades gerais", item.general_difficulties],
    ["Comportamento e convivência", item.behavior_and_coexistence],
    ["Aspectos de aprendizagem", item.learning_aspects],
    ["Estratégias coletivas", item.collective_strategies],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  if (!notes.length) return <p className="mt-2 text-xs italic text-slate-500">Sem análise coletiva registrada.</p>;
  return <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">{notes.map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap text-slate-700">{value}</dd></div>)}</dl>;
}

export function CouncilGeneralPrintDocument({ data, compact = false }: { data: CouncilPrintOverviewData; compact?: boolean }) {
  const completed = data.classes.filter((item) => item.status === "completed").length;
  const classOrder = new Map(data.classes.map((item, index) => [item.display_name, index]));
  const interventionGroups = [...data.interventionDetails.reduce((groups, intervention) => {
    const current = groups.get(intervention.className) ?? [];
    current.push(intervention);
    groups.set(intervention.className, current);
    return groups;
  }, new Map<string, CouncilPrintOverviewData["interventionDetails"]>())].map(([className, interventions]) => ({
    className,
    interventions: interventions.sort((a, b) => {
      if (a.studentName === null && b.studentName !== null) return -1;
      if (a.studentName !== null && b.studentName === null) return 1;
      return (a.studentName ?? "").localeCompare(b.studentName ?? "", "pt-BR");
    }),
  })).sort((a, b) => (classOrder.get(a.className) ?? Number.MAX_SAFE_INTEGER) - (classOrder.get(b.className) ?? Number.MAX_SAFE_INTEGER) || a.className.localeCompare(b.className, "pt-BR"));
  return <>
    <PrintHeader title="Resumo do Conselho de Classe" subtitle={`${data.council.school_year} · ${data.council.term}º bimestre · ${formatDate(data.council.meeting_date)} · ${councilStatusLabels[data.council.status] ?? data.council.status}`} />
    <section className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      <Metric value={data.metrics.students} label="Estudantes" /><Metric value={data.metrics.atRisk} label="Em risco" /><Metric value={data.metrics.lowAttendance} label="Frequência abaixo de 80%" /><Metric value={data.metrics.infrequent} label="Infrequentes" /><Metric value={data.metrics.dropout} label="Desistentes" /><Metric value={data.metrics.worsened} label="Pioraram" /><Metric value={data.metrics.pendingInterventions} label="Intervenções pendentes" />
    </section>
    <section className="council-print-section print-avoid-break mt-6"><div className="flex items-end justify-between border-b border-slate-300 pb-2"><h2 className="font-bold">Progresso das turmas</h2><span className="text-sm">{completed}/{data.classes.length} concluídas</span></div><div className="council-print-stack mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{data.classes.map((item) => <div key={item.id} className="council-print-card rounded border border-slate-300 p-2 text-xs"><strong>{item.display_name}</strong><span className="ml-1 text-slate-500">{item.official_code}</span><p className="mt-1">{classStatusLabel(item.status)} · {item.studentCount ?? 0} estudantes · {item.atRiskCount ?? 0} em risco</p></div>)}</div></section>
    <section className="council-print-section mt-7"><h2 className="border-b border-slate-300 pb-2 font-bold">Síntese por turma</h2><div className="council-print-stack council-print-synthesis mt-3 space-y-4">{data.classes.map((item) => <div key={item.id} className="council-print-card print-avoid-break rounded-lg border border-slate-300 p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold">Turma {item.display_name}</h3><p className="text-xs text-slate-500">{item.official_code} · {item.studentCount ?? 0} estudantes · {item.atRiskCount ?? 0} em risco</p></div><span className="text-xs font-medium">{classStatusLabel(item.status)}</span></div><CollectiveSummary item={item} /><div className="mt-3 border-t border-slate-200 pt-2"><p className="text-xs font-semibold">Participantes</p><p className="mt-1 text-xs text-slate-700">{item.participants.length ? item.participants.map((participant) => `${participant.name}${participant.role_or_subject ? ` (${participant.role_or_subject})` : ""}`).join(" · ") : "Nenhum participante registrado."}</p></div></div>)}</div></section>
    <section className="council-print-section mt-7">
      <h2 className="border-b border-slate-300 pb-2 font-bold">Intervenções pendentes ou em andamento</h2>
      {!data.interventionDetails.length ? <p className="mt-3 text-xs italic text-slate-500">Nenhuma intervenção pendente.</p> : compact ? <table className="mt-2 w-full table-fixed border-collapse text-[10px] leading-snug">
        <colgroup><col className="w-[24%]" /><col className="w-[46%]" /><col className="w-[18%]" /><col className="w-[12%]" /></colgroup>
        <thead><tr className="border-b border-slate-400 text-left"><th className="px-1.5 py-1 font-semibold">Estudante/escopo</th><th className="px-1.5 py-1 font-semibold">Intervenção</th><th className="px-1.5 py-1 font-semibold">Responsável</th><th className="px-1.5 py-1 font-semibold">Prazo</th></tr></thead>
        {interventionGroups.map((group) => <tbody key={group.className}>
          <tr className="council-intervention-group-header border-y border-slate-300 bg-slate-100"><th colSpan={4} className="px-1.5 py-1 text-left text-[11px] font-bold">Turma {group.className}</th></tr>
          {group.interventions.map((item) => <tr key={item.id} className="border-b border-slate-200 align-top"><td className="px-1.5 py-1 font-medium">{item.studentName ?? "Intervenção coletiva"}</td><td className="px-1.5 py-1">{item.description}</td><td className="px-1.5 py-1 text-slate-600">{item.responsible_name ?? "-"}</td><td className="px-1.5 py-1 text-slate-600">{item.due_date ? formatDate(item.due_date) : "-"}</td></tr>)}
        </tbody>)}
      </table> : <div className="council-print-stack mt-3 space-y-3">{interventionGroups.map((group) => <div key={group.className} className="council-print-card rounded-lg border border-slate-300">
        <h3 className="border-b border-slate-300 bg-slate-50 px-4 py-2 text-sm font-bold">Turma {group.className}</h3>
        <div className="grid grid-cols-[1fr_1.5fr_2fr] gap-4 border-b border-slate-200 px-4 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500"><span>Estudante/escopo</span><span>Principais problemas</span><span>Intervenção</span></div>
        <div className="divide-y divide-slate-200">{group.interventions.map((item) => <div key={item.id} className="print-avoid-break grid grid-cols-[1fr_1.5fr_2fr] gap-4 px-4 py-2.5 text-xs">
          <p className="font-semibold text-slate-700">{item.studentName ?? "Intervenção coletiva"}</p>
          <p className="text-[11px] leading-relaxed text-slate-600">{formatStudentProblems(item.studentProblems ?? [])}</p>
          <div><p className="font-medium">{item.description}</p>{(item.responsible_name || item.due_date) && <p className="mt-1 text-slate-600">{item.responsible_name ? `Responsável: ${item.responsible_name}` : "Sem responsável"}{item.due_date ? ` · Prazo: ${formatDate(item.due_date)}` : ""}</p>}</div>
        </div>)}</div>
      </div>)}</div>}
    </section>
    <p className="mt-8 border-t border-slate-300 pt-2 text-[10px] text-slate-500">Documento gerado pelo Felix Hub.</p>
  </>;
}

export function CouncilClassPrintDocument({ data }: { data: ClassWorkspaceData }) {
  const discussed = data.students.filter((student) => student.discussed);
  const atRisk = data.students.filter((student) => student.alerts.atRisk).length;
  const individualInterventions = data.students.flatMap((student) => student.interventions.map((intervention) => ({ ...intervention, studentName: student.name })));
  return <>
    <PrintHeader title={`Resumo da turma ${data.class.display_name}`} subtitle={`${data.council.school_year} · ${data.council.term}º bimestre · ${formatDate(data.council.meeting_date)} · ${data.class.official_code}`} />
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric value={data.students.length} label="Estudantes" /><Metric value={atRisk} label="Em risco" /><Metric value={discussed.length} label="Discutidos" /><Metric value={individualInterventions.length + data.classInterventions.length} label="Intervenções" /></section>
    <section className="council-print-section print-avoid-break mt-6"><h2 className="border-b border-slate-300 pb-2 font-bold">Participantes e professores</h2><p className="mt-3 text-xs text-slate-700">{data.participants.length ? data.participants.map((participant) => `${participant.name}${participant.role_or_subject ? ` (${participant.role_or_subject})` : ""}`).join(" · ") : "Nenhum participante registrado."}</p>{data.subjects.some((subject) => subject.teacher_name) && <div className="council-print-stack mt-3 grid grid-cols-2 gap-x-5 gap-y-1 text-xs">{data.subjects.filter((subject) => subject.teacher_name).map((subject) => <p key={subject.id}><strong>{subject.display_name}:</strong> {subject.teacher_name}</p>)}</div>}</section>
    <section className="council-print-section mt-6"><h2 className="border-b border-slate-300 pb-2 font-bold">Análise coletiva</h2><div className="council-print-stack mt-3"><CollectiveSummary item={{ ...data.class, studentCount: data.students.length, atRiskCount: atRisk, participants: data.participants, id: data.class.id, official_code: data.class.official_code, display_name: data.class.display_name, status: data.class.status }} /></div></section>
    <section className="council-print-section mt-7"><h2 className="border-b border-slate-300 pb-2 font-bold">Estudantes discutidos</h2>{discussed.length ? <div className="council-print-stack mt-3 space-y-3">{discussed.map((student) => <div key={student.enrollmentId} className="council-print-card print-avoid-break rounded-lg border border-slate-300 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-bold">{student.name}</h3>{student.isPcd && <span className="rounded border border-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-blue-800">PCD</span>}</div><p className="text-xs text-slate-500">Matrícula {student.enrollmentNumber} · Frequência {student.attendanceRate === null ? "não informada" : `${student.attendanceRate}%`} · Situação observada: {attendanceSituationLabels[student.attendanceSituation] ?? student.attendanceSituation}</p></div>{student.alerts.atRisk && <span className="rounded border border-slate-400 px-2 py-0.5 text-[10px] font-semibold">EM RISCO</span>}</div>{student.alerts.reasons.length > 0 && <p className="mt-2 text-xs"><strong>Alertas:</strong> {student.alerts.reasons.join(" · ")}</p>}<div className="mt-2 grid gap-2 text-xs sm:grid-cols-2"><p><strong>Atividades:</strong> {activityLabels[student.activitiesStatus] ?? student.activitiesStatus}</p>{student.pedagogicalObservation && <p className="sm:col-span-2"><strong>Observação pedagógica:</strong> {student.pedagogicalObservation}</p>}{student.positiveNotes && <p className="sm:col-span-2"><strong>Pontos positivos:</strong> {student.positiveNotes}</p>}{student.behaviors.length > 0 && <p className="sm:col-span-2"><strong>Comportamentos observados:</strong> {student.behaviors.map((behavior) => `${BEHAVIOR_LABELS[behavior.category]}${behavior.description ? ` - ${behavior.description}` : ""}`).join(" · ")}</p>}</div>{student.interventions.length > 0 && <div className="mt-3 border-t border-slate-200 pt-2 text-xs"><strong>Intervenções:</strong><ul className="mt-1 list-disc space-y-1 pl-4">{student.interventions.map((item) => <li key={item.id}>{item.description}{item.responsible_name ? ` · ${item.responsible_name}` : ""}{item.due_date ? ` · até ${formatDate(item.due_date)}` : ""}</li>)}</ul></div>}</div>)}</div> : <p className="mt-3 text-xs italic text-slate-500">Nenhum estudante foi marcado como discutido.</p>}</section>
    <section className="council-print-section mt-7"><h2 className="border-b border-slate-300 pb-2 font-bold">Intervenções coletivas</h2>{data.classInterventions.length ? <ul className="council-print-stack mt-3 space-y-2">{data.classInterventions.map((item) => <li key={item.id} className="council-print-card print-avoid-break rounded border border-slate-300 p-3 text-xs"><strong>{item.description}</strong><p className="mt-1 text-slate-600">{item.responsible_name || "Sem responsável"}{item.due_date ? ` · até ${formatDate(item.due_date)}` : ""}</p></li>)}</ul> : <p className="mt-3 text-xs italic text-slate-500">Nenhuma intervenção coletiva registrada.</p>}</section>
    <p className="mt-8 border-t border-slate-300 pt-2 text-[10px] text-slate-500">Documento gerado pelo Felix Hub.</p>
  </>;
}
