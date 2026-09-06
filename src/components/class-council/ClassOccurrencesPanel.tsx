"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TriangleAlert, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { councilFetch } from "@/lib/class-council/client";
import { STUDENT_OCCURRENCE_LABELS } from "@/lib/students/occurrences";
import type { ClassCouncilOccurrences, StudentOccurrence } from "@/types/student-occurrence";

function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR"); }

export function ClassOccurrencesPanel({ councilId, classId, active }: { councilId: string; classId: string; active: boolean }) {
  const query = useQuery({
    queryKey: ["class-occurrences", councilId, classId],
    queryFn: () => councilFetch<ClassCouncilOccurrences>(`/api/class-councils/${councilId}/classes/${classId}/occurrences`),
    enabled: active,
    staleTime: 60_000,
  });
  if (query.isPending) return <div className="grid min-h-80 place-items-center rounded-2xl border bg-white dark:bg-card"><div className="text-center"><Loader2 className="mx-auto size-7 animate-spin text-amber-600" /><p className="mt-3 text-sm text-muted-foreground">Carregando ocorrências do ano letivo...</p></div></div>;
  if (query.error || !query.data) return <div className="rounded-2xl border border-rose-200 bg-white p-6 text-sm text-rose-700 dark:bg-card">{query.error instanceof Error ? query.error.message : "Não foi possível carregar as ocorrências."}</div>;
  const data = query.data;
  const byStudent = new Map<string, StudentOccurrence[]>();
  const classStudentIds = new Set(data.classStudentIds);
  for (const item of data.studentOccurrences) {
    const studentIds = item.targetType === "collective" ? item.participants.filter((participant) => classStudentIds.has(participant.studentId)).map((participant) => participant.studentId) : item.studentId ? [item.studentId] : [];
    for (const studentId of studentIds) {
      const values = byStudent.get(studentId) ?? [];
      values.push(item); byStudent.set(studentId, values);
    }
  }
  return <section className="rounded-2xl border bg-white p-5 dark:bg-card sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Ano letivo de {data.schoolYear}</p><h2 className="mt-2 text-xl font-black">Ocorrências da turma e dos estudantes</h2><p className="mt-1 text-sm text-muted-foreground">Todos os registros do ano, independentemente do bimestre em que foram cadastrados.</p></div><div className="flex items-center gap-3"><strong className="text-2xl">{data.total}</strong><Button variant="outline" asChild><Link href="/hub/ocorrencias">Abrir módulo</Link></Button></div></div>
    {data.total === 0 ? <div className="mt-6 rounded-2xl border border-dashed p-10 text-center"><TriangleAlert className="mx-auto size-7 text-slate-400" /><p className="mt-3 text-sm font-semibold">Nenhuma ocorrência neste ano letivo</p></div> : <div className="mt-6 space-y-7">
      <OccurrenceGroup icon={UsersRound} title="Registros da turma" items={data.classOccurrences} empty="Nenhuma ocorrência coletiva registrada." />
      <section><div className="mb-3 flex items-center gap-2"><UserRound className="size-4 text-sky-700" /><h3 className="font-bold">Registros dos estudantes</h3><span className="text-sm text-muted-foreground">({data.studentOccurrences.length})</span></div>{byStudent.size ? <div className="space-y-3">{[...byStudent.entries()].map(([studentId, items]) => { const participant = items.flatMap((item) => item.participants).find((item) => item.studentId === studentId); const name = items.find((item) => item.studentId === studentId)?.studentName ?? participant?.name ?? "Estudante"; const enrollmentNumber = items.find((item) => item.studentId === studentId)?.enrollmentNumber ?? participant?.enrollmentNumber ?? "Matrícula não informada"; return <div key={studentId} className="rounded-xl border"><div className="flex items-center justify-between gap-3 border-b bg-slate-50/70 px-4 py-3 dark:bg-slate-900/50"><div><strong className="text-sm">{name}</strong><p className="text-sm text-muted-foreground">{enrollmentNumber} · {items.length} {items.length === 1 ? "registro" : "registros"}</p></div><Link href={`/hub/alunos/${studentId}`} className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300">Abrir prontuário</Link></div><div className="divide-y">{items.map((item) => <OccurrenceLine key={item.id} item={item} />)}</div></div>; })}</div> : <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Nenhuma ocorrência individual ou coletiva registrada.</p>}</section>
    </div>}
  </section>;
}

function OccurrenceGroup({ icon: Icon, title, items, empty }: { icon: typeof UsersRound; title: string; items: StudentOccurrence[]; empty: string }) {
  return <section><div className="mb-3 flex items-center gap-2"><Icon className="size-4 text-violet-700" /><h3 className="font-bold">{title}</h3><span className="text-sm text-muted-foreground">({items.length})</span></div>{items.length ? <div className="divide-y rounded-xl border">{items.map((item) => <OccurrenceLine key={item.id} item={item} />)}</div> : <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">{empty}</p>}</section>;
}

function OccurrenceLine({ item }: { item: StudentOccurrence }) {
  return <article className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{STUDENT_OCCURRENCE_LABELS[item.category]}</strong>{item.targetType === "collective" ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-bold uppercase text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">Coletiva · {item.participants.length} estudantes</span> : null}</div><span className="text-sm text-muted-foreground">{formatDate(item.occurredOn)}</span></div>{item.notes ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{item.notes}</p> : null}<p className="mt-2 text-sm text-muted-foreground">{item.guardianNotified ? "Responsável(is) ciente(s)" : "Responsável(is) não cientificado(s)"}{item.createdByName ? ` · Registrado por ${item.createdByName}` : ""}</p></article>;
}
