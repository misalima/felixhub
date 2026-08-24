"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, ArrowUpRight, Footprints, GraduationCap, Loader2, Search, TriangleAlert, UserMinus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { councilFetch } from "@/lib/class-council/client";
import { STUDENT_OCCURRENCE_LABELS } from "@/lib/students/occurrences";
import { STUDENT_SITUATION_LABELS } from "@/lib/students/situations";
import type { AttendanceSituation } from "@/types/class-council";
import type { StudentDirectoryData } from "@/types/student-directory";

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function situationClassName(situation: AttendanceSituation) {
  if (situation === "dropout") return "font-semibold text-rose-700 dark:text-rose-300";
  if (situation === "infrequent") return "font-semibold text-amber-700 dark:text-amber-300";
  if (situation === "transferred") return "font-semibold text-sky-700 dark:text-sky-300";
  return "font-semibold text-emerald-700 dark:text-emerald-300";
}

export default function StudentsDirectoryPage() {
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("all");
  const [classId, setClassId] = useState("all");
  const [situation, setSituation] = useState("all");
  const [visibleCount, setVisibleCount] = useState(36);
  const { data, error, isPending } = useQuery({ queryKey: ["student-directory"], queryFn: () => councilFetch<StudentDirectoryData>("/api/students") });

  const classes = useMemo(() => [...new Map((data?.students ?? []).flatMap((student) => student.current ? [[student.current.classId, student.current.className] as const] : [])).entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR")), [data]);
  const filteredStudents = useMemo(() => {
    const normalized = normalizeSearch(search);
    return (data?.students ?? []).filter((student) => {
      if (normalized && !normalizeSearch(`${student.name} ${student.enrollmentNumber} ${student.current?.className ?? ""}`).includes(normalized)) return false;
      if (grade !== "all" && (grade === "unknown" ? student.current?.gradeLevel !== null : student.current?.gradeLevel !== Number(grade))) return false;
      if (classId !== "all" && student.current?.classId !== classId) return false;
      if (situation === "current" && !student.current) return false;
      if (situation === "not_current" && student.current) return false;
      if (situation === "with_occurrences" && student.occurrences.count === 0) return false;
      if (["regular", "infrequent", "dropout", "transferred"].includes(situation) && student.situation !== situation) return false;
      return true;
    });
  }, [classId, data, grade, search, situation]);

  useEffect(() => setVisibleCount(36), [classId, grade, search, situation]);

  if (isPending) return <main className="mx-auto grid min-h-[70vh] max-w-7xl place-items-center p-6"><div className="text-center"><Loader2 className="mx-auto size-7 animate-spin text-sky-600" /><p className="mt-3 text-sm text-muted-foreground">Organizando os estudantes...</p></div></main>;
  if (error || !data) return <main className="mx-auto max-w-5xl p-8"><div className="rounded-2xl border border-rose-200 bg-white p-6 text-sm text-rose-700 dark:bg-slate-900">{error instanceof Error ? error.message : "Não foi possível carregar os estudantes."}</div></main>;

  return <main className="mx-auto w-full max-w-7xl p-4 py-8 sm:p-6 lg:p-8 min-[1800px]:max-w-[1600px] min-[2400px]:max-w-[1800px]">
    <header className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Diretório escolar</p><h1 className="mt-2 text-3xl font-black tracking-tight">Estudantes</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Localize estudantes, consulte o histórico pedagógico e registre ocorrências em um único prontuário.</p></div>{data.source ? <p className="rounded-xl border bg-white px-4 py-2 text-xs text-muted-foreground shadow-sm dark:bg-slate-900">Contexto atual: <strong className="text-foreground">{data.source.term}º bimestre de {data.source.schoolYear}</strong></p> : null}</header>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><Metric icon={UsersRound} value={data.metrics.total} label="cadastrados" /><Metric icon={GraduationCap} value={data.metrics.current} label="no relatório atual" /><Metric icon={Footprints} value={data.metrics.infrequent} label="infrequentes" /><Metric icon={UserMinus} value={data.metrics.dropout} label="desistentes" /><Metric icon={ArrowLeftRight} value={data.metrics.transferred} label="transferidos" /><Metric icon={TriangleAlert} value={data.metrics.occurrences} label="ocorrências registradas" /></section>

    <section className="mt-5 rounded-2xl border bg-white p-3 shadow-sm dark:bg-slate-900"><div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por nome, matrícula ou turma" className="h-12 rounded-xl border-0 bg-slate-50 pl-10 pr-4 text-base shadow-none focus-visible:ring-sky-500 dark:bg-slate-800/70" /></div><div className="mt-3 grid gap-2 sm:grid-cols-3"><Select value={grade} onValueChange={setGrade}><SelectTrigger className="h-10 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="all">Todas as séries</SelectItem><SelectItem value="1">1ª série</SelectItem><SelectItem value="2">2ª série</SelectItem><SelectItem value="3">3ª série</SelectItem><SelectItem value="unknown">Série não identificada</SelectItem></SelectContent></Select><Select value={classId} onValueChange={setClassId}><SelectTrigger className="h-10 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="all">Todas as turmas</SelectItem>{classes.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select><Select value={situation} onValueChange={setSituation}><SelectTrigger className="h-10 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent position="popper" side="bottom" sideOffset={6}><SelectItem value="all">Todas as situações</SelectItem><SelectItem value="current">No relatório atual</SelectItem><SelectItem value="regular">Frequência regular</SelectItem><SelectItem value="infrequent">Infrequentes</SelectItem><SelectItem value="dropout">Desistentes</SelectItem><SelectItem value="transferred">Transferidos</SelectItem><SelectItem value="with_occurrences">Com ocorrências</SelectItem><SelectItem value="not_current">Fora do relatório atual</SelectItem></SelectContent></Select></div></section>

    <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground"><strong className="text-foreground">{filteredStudents.length.toLocaleString("pt-BR")}</strong> {filteredStudents.length === 1 ? "estudante encontrado" : "estudantes encontrados"}</p>{search || grade !== "all" || classId !== "all" || situation !== "all" ? <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setGrade("all"); setClassId("all"); setSituation("all"); }}>Limpar filtros</Button> : null}</div>

    <section className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-4 min-[2400px]:grid-cols-5">{filteredStudents.slice(0, visibleCount).map((student) => <Link key={student.studentId} href={`/hub/alunos/${student.studentId}`} className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:bg-slate-900 dark:hover:border-sky-800"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm">{student.name}</strong><p className="mt-1 text-xs text-muted-foreground">Matrícula {student.enrollmentNumber}</p></div><ArrowUpRight className="mt-0.5 size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-sky-600" /></div>{student.current ? <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground"><span>Turma <strong className="text-foreground">{student.current.className}</strong></span><span>{student.current.gradeLevel ? `${student.current.gradeLevel}ª série` : "Série não identificada"}</span><span>Frequência {student.current.attendanceRate === null ? "—" : `${student.current.attendanceRate.toLocaleString("pt-BR")}%`}</span></div> : <p className="mt-3 text-[11px] text-muted-foreground">Fora do relatório mais recente.</p>}{student.situation !== "regular" ? <p className={`mt-2 text-[11px] ${situationClassName(student.situation)}`}>{STUDENT_SITUATION_LABELS[student.situation]}{student.situation === "transferred" ? " · fora do fluxo" : ""}</p> : null}{student.occurrences.latest ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[11px] dark:border-amber-900 dark:bg-amber-950/25"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-amber-900 dark:text-amber-200">{student.occurrences.count} {student.occurrences.count === 1 ? "ocorrência" : "ocorrências"}</span><span className="text-amber-700 dark:text-amber-300">{formatDate(student.occurrences.latest.occurredOn)}</span></div><p className="mt-1 truncate text-amber-800/80 dark:text-amber-200/70">Última: {STUDENT_OCCURRENCE_LABELS[student.occurrences.latest.category]}</p></div> : null}</Link>)}</section>
    {filteredStudents.length === 0 ? <div className="mt-3 rounded-2xl border border-dashed bg-white p-12 text-center dark:bg-slate-900"><Search className="mx-auto size-8 text-slate-400" /><h2 className="mt-4 font-bold">Nenhum estudante encontrado</h2><p className="mt-1 text-sm text-muted-foreground">Tente outro nome, matrícula ou combinação de filtros.</p></div> : null}
    {visibleCount < filteredStudents.length ? <div className="mt-6 text-center"><Button variant="outline" className="rounded-xl" onClick={() => setVisibleCount((count) => count + 36)}>Mostrar mais estudantes</Button></div> : null}
  </main>;
}

function Metric({ icon: Icon, value, label }: { icon: typeof UsersRound; value: number; label: string }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Icon className="size-4" /></span><div><strong className="block text-xl font-black">{value.toLocaleString("pt-BR")}</strong><span className="text-[11px] text-muted-foreground">{label}</span></div></div></div>;
}
