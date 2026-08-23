"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCHOOL_LOCATION, SCHOOL_NAME } from "@/constants/main/school";
import { BEHAVIOR_LABELS } from "@/lib/class-council/constants";
import { compareStudentReportOrder } from "@/lib/class-council/calculateAlerts";
import type { ClassWorkspaceData } from "./ClassWorkspace";

type WorkspaceStudent = ClassWorkspaceData["students"][number];
type StudentResult = WorkspaceStudent["results"][number];

const activityLabels = {
  not_informed: "Não informado",
  regular: "Regular",
  irregular: "Irregular",
  does_not_do: "Não realiza",
} as const;

const interventionStatusLabels = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
} as const;

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function formatGrade(result: StudentResult | undefined) {
  if (!result) return "-";
  if (result.grade !== null) return result.grade.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return result.grade_marker ?? "-";
}

function formatAttendance(value: number | null) {
  return value === null ? "Não informada" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function formatBehavior(behavior: WorkspaceStudent["behaviors"][number]) {
  if (behavior.category === "other" && behavior.description?.trim()) return `“${behavior.description.trim()}”`;
  const label = BEHAVIOR_LABELS[behavior.category];
  return behavior.description?.trim() ? `${label} - ${behavior.description.trim()}` : label;
}

function evolutionText(student: WorkspaceStudent) {
  const { evolution, currentLowGradeCount, previousLowGradeCount } = student.alerts;
  if (evolution === "worsened") return `Piorou: passou de ${previousLowGradeCount ?? 0} para ${currentLowGradeCount} disciplinas abaixo de 6,0.`;
  if (evolution === "improved") return `Melhorou: passou de ${previousLowGradeCount ?? 0} para ${currentLowGradeCount} disciplinas abaixo de 6,0.`;
  if (evolution === "stable") return `Manteve ${currentLowGradeCount} ${currentLowGradeCount === 1 ? "disciplina" : "disciplinas"} abaixo de 6,0.`;
  return "Sem bimestre anterior disponível para comparação.";
}

function StudentPrintPage({ data, student, pageNumber, pageCount }: { data: ClassWorkspaceData; student: WorkspaceStudent; pageNumber: number; pageCount: number }) {
  const visibleTerms = Array.from({ length: data.council.term }, (_, index) => index + 1);
  const subjects = [...new Map(student.results.map((result) => [result.subject_id, result.subjectName])).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const hasCouncilRecord = student.discussed
    || student.activitiesStatus !== "not_informed"
    || Boolean(student.pedagogicalObservation?.trim())
    || Boolean(student.positiveNotes?.trim())
    || student.behaviors.length > 0
    || student.interventions.length > 0;

  return <section className="student-print-page relative box-border bg-white px-[9mm] py-[8mm] text-slate-950">
    <header className="flex items-center gap-3 border-b-2 border-slate-900 pb-2.5">
      <Image src="/logo_escola.png" alt={`Logo da ${SCHOOL_NAME}`} width={44} height={44} className="h-11 w-11 shrink-0 object-contain" unoptimized />
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-wide">{SCHOOL_NAME}</p>
        <p className="text-[8px] text-slate-500">{SCHOOL_LOCATION}</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div><h1 className="text-[14px] font-bold leading-tight">Registro individual - Conselho de Classe</h1><p className="text-[9px] text-slate-600">{data.council.term}º bimestre de {data.council.school_year} · Conselho realizado em {formatDate(data.council.meeting_date)}</p></div>
          <p className="shrink-0 text-[9px] font-semibold">Turma {data.class.display_name}</p>
        </div>
      </div>
    </header>

    <section className="mt-3 flex items-start justify-between gap-4 rounded-md bg-slate-100 px-3 py-2.5">
      <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="text-[15px] font-bold leading-tight">{student.name}</h2>{student.isPcd && <span className="rounded border border-blue-600 px-1.5 py-0.5 text-[8px] font-bold text-blue-800">PCD</span>}</div><p className="mt-1 text-[9px] text-slate-600">Matrícula {student.enrollmentNumber}{student.enrollmentStatus ? ` · Situação: ${student.enrollmentStatus}` : ""}</p></div>
      <div className="shrink-0 text-right"><p className="text-[8px] uppercase tracking-wide text-slate-500">Frequência anual</p><p className={`text-[15px] font-bold ${student.alerts.lowAttendance ? "text-rose-700" : ""}`}>{formatAttendance(student.attendanceRate)}</p></div>
    </section>

    <div className="mt-3 grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4">
      <section className="min-w-0">
        <h3 className="border-b border-slate-300 pb-1 text-[10px] font-bold uppercase tracking-wide">Notas e faltas</h3>
        {subjects.length ? <table className="mt-1.5 w-full table-fixed border-collapse text-[8px] leading-tight">
          <colgroup><col className="w-[42%]" />{visibleTerms.map((term) => <col key={term} />)}</colgroup>
          <thead><tr className="bg-slate-100 text-left"><th className="border border-slate-300 px-1.5 py-1.5">Disciplina</th>{visibleTerms.map((term) => <th key={term} className="border border-slate-300 px-1 py-1.5 text-center">{term}º bim.</th>)}</tr></thead>
          <tbody>{subjects.map((subject, index) => <tr key={subject.id} className={index % 2 ? "bg-slate-50" : "bg-white"}>
            <td className="border border-slate-300 px-1.5 py-1 font-medium">{subject.name}</td>
            {visibleTerms.map((term) => {
              const result = student.results.find((item) => item.subject_id === subject.id && item.term === term);
              const lowGrade = typeof result?.grade === "number" && result.grade < 6;
              return <td key={term} className="border border-slate-300 px-1 py-1 text-center"><strong className={lowGrade ? "text-rose-700" : ""}>{formatGrade(result)}</strong><span className="mt-0.5 block text-[7px] font-normal text-slate-500">{result?.absences === null || result?.absences === undefined ? "- faltas" : `${result.absences} ${result.absences === 1 ? "falta" : "faltas"}`}</span></td>;
            })}
          </tr>)}</tbody>
        </table> : <p className="mt-2 text-[9px] italic text-slate-500">Nenhum resultado acadêmico disponível até este bimestre.</p>}
        <p className="mt-1.5 text-[7px] leading-relaxed text-slate-500"><strong>Marcadores:</strong> * nota não lançada · ** frequência/faltas não iniciadas · - não completou os três instrumentos · s/n componente sem nota.</p>
      </section>

      <section className="min-w-0 space-y-3">
        <div>
          <h3 className="border-b border-slate-300 pb-1 text-[10px] font-bold uppercase tracking-wide">Síntese acadêmica</h3>
          <div className="mt-1.5 space-y-1 text-[9px] leading-relaxed">
            <p><strong>{student.alerts.currentLowGradeCount}</strong> {student.alerts.currentLowGradeCount === 1 ? "disciplina com nota" : "disciplinas com nota"} abaixo de 6,0.</p>
            <p>{evolutionText(student)}</p>
            {student.alerts.atRisk ? <div className="rounded border border-rose-300 bg-rose-50 p-1.5 text-rose-900"><strong>Em risco</strong>{student.alerts.reasons.length > 0 && <ul className="mt-0.5 list-disc pl-3.5">{student.alerts.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}</div> : <p className="text-slate-600">Não atende aos critérios atuais de risco.</p>}
          </div>
        </div>

        <div>
          <h3 className="border-b border-slate-300 pb-1 text-[10px] font-bold uppercase tracking-wide">Registros do conselho</h3>
          {!hasCouncilRecord ? <p className="mt-1.5 text-[9px] italic text-slate-500">Nenhum registro individual foi realizado para este estudante.</p> : <dl className="mt-1.5 space-y-1.5 text-[9px] leading-relaxed">
            <div><dt className="font-semibold">Situação no conselho</dt><dd className="text-slate-700">{student.discussed ? "Estudante discutido" : "Não marcado como discutido"}</dd></div>
            <div><dt className="font-semibold">Realização de atividades</dt><dd className="text-slate-700">{activityLabels[student.activitiesStatus]}</dd></div>
            {student.pedagogicalObservation?.trim() && <div><dt className="font-semibold">Observação pedagógica</dt><dd className="whitespace-pre-wrap text-slate-700">{student.pedagogicalObservation}</dd></div>}
            {student.positiveNotes?.trim() && <div><dt className="font-semibold">Pontos positivos</dt><dd className="whitespace-pre-wrap text-slate-700">{student.positiveNotes}</dd></div>}
            {student.behaviors.length > 0 && <div><dt className="font-semibold">Comportamentos observados</dt><dd className="text-slate-700">{student.behaviors.map(formatBehavior).join(" · ")}</dd></div>}
          </dl>}
        </div>

        <div>
          <h3 className="border-b border-slate-300 pb-1 text-[10px] font-bold uppercase tracking-wide">Intervenções individuais</h3>
          {student.interventions.length ? <div className="mt-1.5 divide-y divide-slate-200 rounded border border-slate-300">{student.interventions.map((intervention) => <div key={intervention.id} className="p-1.5 text-[8px] leading-relaxed">
            <div className="flex items-start justify-between gap-2"><strong>{intervention.description}</strong><span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[7px] font-semibold">{interventionStatusLabels[intervention.status]}</span></div>
            {(intervention.responsible_name || intervention.due_date) && <p className="mt-0.5 text-slate-600">{intervention.responsible_name ? `Responsável: ${intervention.responsible_name}` : "Sem responsável"}{intervention.due_date ? ` · Prazo: ${formatDate(intervention.due_date)}` : ""}</p>}
            {intervention.outcome && <p className="mt-0.5"><strong>Resultado:</strong> {intervention.outcome}</p>}
            {intervention.cancellation_reason && <p className="mt-0.5"><strong>Motivo do cancelamento:</strong> {intervention.cancellation_reason}</p>}
          </div>)}</div> : <p className="mt-1.5 text-[9px] italic text-slate-500">Nenhuma intervenção individual registrada.</p>}
        </div>
      </section>
    </div>

    <footer className="absolute bottom-[6mm] left-[9mm] right-[9mm] flex items-center justify-between border-t border-slate-300 pt-1.5 text-[7px] text-slate-500"><span>Documento gerado pelo Felix Hub.</span><span>Página {pageNumber} de {pageCount}</span></footer>
  </section>;
}

export function CouncilStudentsPrintDocument({ data, enrollmentId }: { data: ClassWorkspaceData; enrollmentId?: string | null }) {
  const orderedStudents = [...data.students].sort(compareStudentReportOrder);
  const students = enrollmentId ? orderedStudents.filter((student) => student.enrollmentId === enrollmentId) : orderedStudents;
  return <>{students.map((student, index) => <StudentPrintPage key={student.enrollmentId} data={data} student={student} pageNumber={index + 1} pageCount={students.length} />)}</>;
}

export function CouncilStudentsPrintShell({ backHref, documentTitle, studentCount, children }: { backHref: string; documentTitle: string; studentCount: number; children: React.ReactNode }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = documentTitle;
    return () => { document.title = previousTitle; };
  }, [documentTitle]);

  return <div className="student-print-root min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-8 print:bg-white print:p-0">
    <div className="student-print-controls mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
      <Button variant="outline" asChild><Link href={backHref}><ArrowLeft className="h-4 w-4" />Voltar à turma</Link></Button>
      <div className="flex items-center gap-3"><span className="text-sm text-slate-600">{studentCount} {studentCount === 1 ? "estudante" : "estudantes"}</span><Button type="button" onClick={() => { document.title = documentTitle; window.print(); }}><Printer className="h-4 w-4" />Imprimir ou salvar em PDF</Button></div>
    </div>
    <main className="student-print-pages mx-auto max-w-[182mm] space-y-5 print:max-w-none print:space-y-0">{children}</main>
    <style jsx global>{`
      @page { size: A4 portrait; margin: 14mm; }
      .student-print-page { min-height: 269mm; box-shadow: 0 8px 30px rgb(15 23 42 / 0.12); }
      @media print {
        html, body { background: white !important; }
        .council-app-header, .student-print-controls { display: none !important; }
        .student-print-root { min-height: 0 !important; }
        .student-print-page { width: 100%; min-height: 269mm; box-shadow: none; break-after: page; page-break-after: always; break-inside: avoid; page-break-inside: avoid; }
        .student-print-page:last-child { break-after: auto; page-break-after: auto; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
  </div>;
}
