"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Loader2, Plus, Search, SlidersHorizontal, TriangleAlert, UserRound, UsersRound, X } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { councilFetch } from "@/lib/class-council/client";
import { STUDENT_OCCURRENCE_CATEGORIES, STUDENT_OCCURRENCE_LABELS } from "@/lib/students/occurrences";
import type { OccurrenceContext, OccurrenceListData, SchoolOccurrenceTargetType, StudentOccurrence, StudentOccurrenceCategory } from "@/types/student-occurrence";

function schoolToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Maceio", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function defaultDateForYear(schoolYear: number) { const today = schoolToday(); return Number(today.slice(0, 4)) === schoolYear ? today : `${schoolYear}-${today.slice(5)}`; }
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR"); }

export default function OccurrencesPage() {
  const queryClient = useQueryClient();
  const [schoolYear, setSchoolYear] = useState<number | null>(null);
  const [targetType, setTargetType] = useState<"all" | SchoolOccurrenceTargetType>("all");
  const [category, setCategory] = useState<"all" | StudentOccurrenceCategory>("all");
  const [classCode, setClassCode] = useState("all");
  const [formTarget, setFormTarget] = useState<SchoolOccurrenceTargetType | null>(null);
  const contextQuery = useQuery({ queryKey: ["occurrence-context", schoolYear], queryFn: () => councilFetch<OccurrenceContext>(`/api/occurrences/context${schoolYear ? `?schoolYear=${schoolYear}` : ""}`), staleTime: 5 * 60_000 });
  useEffect(() => { if (schoolYear === null && contextQuery.data) setSchoolYear(contextQuery.data.schoolYear); }, [contextQuery.data, schoolYear]);
  const queryKey = ["occurrences", schoolYear, targetType, category, classCode] as const;
  const occurrencesQuery = useInfiniteQuery({
    queryKey,
    enabled: schoolYear !== null,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ schoolYear: String(schoolYear), cursor: String(pageParam), limit: "30", targetType });
      if (category !== "all") params.set("category", category);
      if (classCode !== "all") params.set("classOfficialCode", classCode);
      return councilFetch<OccurrenceListData>(`/api/occurrences?${params}`);
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const items = occurrencesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const total = occurrencesQuery.data?.pages[0]?.total ?? 0;
  const years = contextQuery.data?.availableYears.length ? contextQuery.data.availableYears : schoolYear ? [schoolYear] : [];
  const hasActiveFilters = targetType !== "all" || category !== "all" || classCode !== "all";
  function clearFilters() { setTargetType("all"); setCategory("all"); setClassCode("all"); }

  async function created() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["occurrences"] }),
      queryClient.invalidateQueries({ queryKey: ["student-directory"] }),
      queryClient.invalidateQueries({ queryKey: ["class-occurrences"] }),
    ]);
    setFormTarget(null);
  }

  return <main className="mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-7xl flex-col p-4 py-8 sm:p-6 lg:p-8">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Acompanhamento escolar</p><h1 className="mt-2 text-3xl font-black tracking-tight">Ocorrências</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Consulte e registre fatos vinculados a estudantes ou turmas, organizados por ano letivo.</p></div><OccurrenceCreateMenu disabled={!contextQuery.data?.classes.length} onSelect={setFormTarget} /></header>

    <section className="mt-6 rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-amber-700 dark:text-amber-300" /><div><h2 className="text-sm font-bold">Filtrar registros</h2><p className="text-sm text-muted-foreground">Refine a lista por período, tipo ou contexto.</p></div></div>{hasActiveFilters ? <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button> : null}</div><div className="mt-4 flex flex-wrap items-end gap-3">
      <div className="w-full space-y-1.5 sm:w-32"><Label className="text-sm text-muted-foreground">Ano letivo</Label><Select value={schoolYear ? String(schoolYear) : ""} onValueChange={(value) => { setSchoolYear(Number(value)); setClassCode("all"); }}><SelectTrigger className="w-full"><SelectValue placeholder="Ano letivo" /></SelectTrigger><SelectContent>{years.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select></div>
      <div className="w-full space-y-1.5 sm:w-56"><Label className="text-sm text-muted-foreground">Tipo de ocorrência</Label><Select value={targetType} onValueChange={(value) => setTargetType(value as typeof targetType)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="student">Individuais</SelectItem><SelectItem value="collective">Coletivas</SelectItem><SelectItem value="class">De turma</SelectItem></SelectContent></Select></div>
      <div className="w-full space-y-1.5 sm:w-56"><Label className="text-sm text-muted-foreground">Turma relacionada</Label><Select value={classCode} onValueChange={setClassCode}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as turmas</SelectItem>{contextQuery.data?.classes.map((item) => <SelectItem key={item.officialCode} value={item.officialCode}>{item.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="w-full space-y-1.5 sm:w-72"><Label className="text-sm text-muted-foreground">Categoria</Label><Select value={category} onValueChange={(value) => setCategory(value as typeof category)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as categorias</SelectItem>{STUDENT_OCCURRENCE_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{STUDENT_OCCURRENCE_LABELS[item]}</SelectItem>)}</SelectContent></Select></div>
    </div></section>

    {occurrencesQuery.isPending ? <div className="grid min-h-72 flex-1 place-items-center"><Loader2 className="size-7 animate-spin text-amber-600" /></div> : occurrencesQuery.error ? <div className="mt-5 rounded-2xl border border-rose-200 bg-white p-6 text-sm text-rose-700">{occurrencesQuery.error.message}</div> : items.length ? <><div className="mt-5 flex items-center justify-between"><p className="text-sm text-muted-foreground"><strong className="text-foreground">{total.toLocaleString("pt-BR")}</strong> {total === 1 ? "ocorrência" : "ocorrências"} em {schoolYear}</p></div><section className="mt-3 space-y-3">{items.map((item) => <OccurrenceCard key={item.id} item={item} />)}</section></> : <div className="mt-5 flex min-h-72 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed bg-white px-6 py-14 text-center dark:bg-slate-900"><TriangleAlert className="size-8 text-slate-400" /><h2 className="mt-4 font-bold">{hasActiveFilters ? "Nenhuma ocorrência com esses filtros" : `Ainda não há ocorrências em ${schoolYear}`}</h2><p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{hasActiveFilters ? "Tente ampliar a busca removendo um ou mais filtros." : "Os registros individuais, coletivos e de turma aparecerão aqui."}</p><div className="mt-5 flex justify-center">{hasActiveFilters ? <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button> : <OccurrenceCreateMenu disabled={!contextQuery.data?.classes.length} onSelect={setFormTarget} />}</div></div>}
    {occurrencesQuery.hasNextPage ? <div className="mt-6 text-center"><Button variant="outline" disabled={occurrencesQuery.isFetchingNextPage} onClick={() => void occurrencesQuery.fetchNextPage()}>{occurrencesQuery.isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : null}Mostrar mais</Button></div> : null}
    {contextQuery.data && schoolYear && formTarget ? <OccurrenceForm key={`${schoolYear}-${formTarget}`} open targetType={formTarget} onOpenChange={(open) => { if (!open) setFormTarget(null); }} context={contextQuery.data} schoolYear={schoolYear} onCreated={created} /> : null}
  </main>;
}

function OccurrenceCreateMenu({ disabled, onSelect }: { disabled: boolean; onSelect: (target: SchoolOccurrenceTargetType) => void }) {
  return <DropdownMenu.Root><DropdownMenu.Trigger asChild><Button className="rounded-xl" disabled={disabled}><Plus className="size-4" />Registrar ocorrência<ChevronDown className="size-4" /></Button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl outline-none dark:border-slate-800 dark:bg-slate-900">
    <DropdownMenu.Item onSelect={() => onSelect("student")} className="flex cursor-pointer items-start gap-3 rounded-xl p-3 outline-none transition-colors hover:bg-sky-50 focus:bg-sky-50 dark:hover:bg-sky-950/40 dark:focus:bg-sky-950/40"><span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><UserRound className="size-4" /></span><span><strong className="block text-sm">Ocorrência individual</strong><span className="mt-0.5 block text-sm leading-5 text-muted-foreground">Registre um fato para um estudante.</span></span></DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => onSelect("collective")} className="mt-1 flex cursor-pointer items-start gap-3 rounded-xl p-3 outline-none transition-colors hover:bg-amber-50 focus:bg-amber-50 dark:hover:bg-amber-950/40 dark:focus:bg-amber-950/40"><span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><UsersRound className="size-4" /></span><span><strong className="block text-sm">Ocorrência coletiva</strong><span className="mt-0.5 block text-sm leading-5 text-muted-foreground">Escolha dois ou mais estudantes, mesmo de turmas diferentes.</span></span></DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => onSelect("class")} className="mt-1 flex cursor-pointer items-start gap-3 rounded-xl p-3 outline-none transition-colors hover:bg-violet-50 focus:bg-violet-50 dark:hover:bg-violet-950/40 dark:focus:bg-violet-950/40"><span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"><UsersRound className="size-4" /></span><span><strong className="block text-sm">Ocorrência de turma</strong><span className="mt-0.5 block text-sm leading-5 text-muted-foreground">Registre um fato atribuído à turma inteira.</span></span></DropdownMenu.Item>
  </DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
}

function OccurrenceCard({ item }: { item: StudentOccurrence }) {
  const isCollective = item.targetType === "collective";
  const target = item.targetType === "class" ? item.className ?? "Turma" : isCollective ? `${item.participants.length} estudantes` : item.studentName ?? "Estudante";
  const typeLabel = item.targetType === "class" ? "Turma" : isCollective ? "Coletiva" : "Individual";
  return <article className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.targetType === "class" ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50" : isCollective ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50" : "bg-sky-50 text-sky-700 dark:bg-sky-950/50"}`}>{item.targetType === "student" ? <UserRound className="size-5" /> : <UsersRound className="size-5" />}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{target}</strong><span className="rounded-full bg-slate-100 px-2 py-0.5 text-sm font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">{typeLabel}</span></div><p className="mt-1 text-sm text-muted-foreground">{STUDENT_OCCURRENCE_LABELS[item.category]} · {formatDate(item.occurredOn)}{item.className && item.targetType === "student" ? ` · Turma ${item.className}` : ""}</p></div></div><span className={`rounded-full px-2.5 py-1 text-sm font-bold ${item.guardianNotified ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{item.guardianNotified ? "Responsável(is) ciente(s)" : "Responsável(is) não cientificado(s)"}</span></div>{isCollective ? <div className="mt-3 flex flex-wrap gap-1.5">{item.participants.map((participant) => <Link key={participant.studentId} href={`/hub/alunos/${participant.studentId}`} className="rounded-full border bg-slate-50 px-2.5 py-1 text-sm font-medium hover:border-sky-300 hover:text-sky-700 dark:bg-slate-800/60">{participant.name}{participant.className ? ` · ${participant.className}` : ""}</Link>)}</div> : null}{item.notes ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{item.notes}</p> : null}<div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm text-muted-foreground"><span>{item.createdByName ? `Registrado por ${item.createdByName}` : "Autoria não identificada"}</span>{item.studentId ? <Link className="font-semibold text-sky-700 hover:underline dark:text-sky-300" href={`/hub/alunos/${item.studentId}`}>Abrir prontuário</Link> : null}</div></article>;
}

function OccurrenceForm({ open, targetType, onOpenChange, context, schoolYear, onCreated }: { open: boolean; targetType: SchoolOccurrenceTargetType; onOpenChange: (open: boolean) => void; context: OccurrenceContext; schoolYear: number; onCreated: () => Promise<void> }) {
  const [selectedClass, setSelectedClass] = useState(targetType === "collective" ? "all" : context.classes[0]?.officialCode ?? "");
  const schoolClass = context.classes.find((item) => item.officialCode === selectedClass);
  const [studentId, setStudentId] = useState(context.classes[0]?.students[0]?.id ?? "");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSearchOpen, setStudentSearchOpen] = useState(false);
  const [occurredOn, setOccurredOn] = useState(() => defaultDateForYear(schoolYear));
  const [category, setCategory] = useState<StudentOccurrenceCategory>(STUDENT_OCCURRENCE_CATEGORIES[0]);
  const [notes, setNotes] = useState("");
  const [guardianNotified, setGuardianNotified] = useState("no");
  const [saving, setSaving] = useState(false);
  const normalizedSearch = studentSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
  const allStudents = context.classes.flatMap((item) => item.students.map((student) => ({ ...student, classCode: item.officialCode, className: item.name })));
  const selectedStudents = studentIds.flatMap((id) => {
    const student = allStudents.find((item) => item.id === id);
    return student ? [student] : [];
  });
  const collectiveStudents = allStudents.filter((student) => {
    if (normalizedSearch.length < 2 || studentIds.includes(student.id)) return false;
    if (selectedClass !== "all" && student.classCode !== selectedClass) return false;
    return `${student.name} ${student.enrollmentNumber}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(normalizedSearch);
  }).slice(0, 8);
  useEffect(() => { if (targetType === "student" && schoolClass && !schoolClass.students.some((item) => item.id === studentId)) setStudentId(schoolClass.students[0]?.id ?? ""); }, [schoolClass, studentId, targetType]);
  function selectStudent(id: string) {
    setStudentIds((current) => current.includes(id) ? current : [...current, id]);
    setStudentSearch("");
    setStudentSearchOpen(false);
  }
  function removeStudent(id: string) { setStudentIds((current) => current.filter((item) => item !== id)); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      await councilFetch("/api/occurrences", { method: "POST", body: JSON.stringify({ targetType, studentId: targetType === "student" ? studentId : undefined, studentIds: targetType === "collective" ? studentIds : undefined, classOfficialCode: targetType === "class" ? selectedClass : undefined, schoolYear, occurredOn, category, notes, guardianNotified: guardianNotified === "yes" }) });
      toast.success("Ocorrência registrada com sucesso."); setNotes(""); await onCreated();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível registrar a ocorrência."); } finally { setSaving(false); }
  }
  const title = targetType === "student" ? "Registrar ocorrência individual" : targetType === "collective" ? "Registrar ocorrência coletiva" : "Registrar ocorrência de turma";
  const description = targetType === "student" ? `Selecione o estudante e descreva o fato ocorrido em ${schoolYear}.` : targetType === "collective" ? `Selecione pelo menos dois estudantes envolvidos no fato ocorrido em ${schoolYear}.` : `Selecione a turma e descreva o fato ocorrido em ${schoolYear}.`;
  const FormIcon = targetType === "student" ? UserRound : UsersRound;
  const notesRequired = targetType !== "student" || category === "other";
  const canSubmit = Boolean(
    occurredOn
    && (!notesRequired || notes.trim())
    && (targetType === "collective" ? studentIds.length >= 2 : selectedClass)
    && (targetType !== "student" || studentId)
  );
  const iconTone = targetType === "student"
    ? "bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300"
    : targetType === "collective"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300"
      : "bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300";

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!saving) onOpenChange(value); }}>
      <DialogContent
        className={`max-h-[calc(100svh-2rem)] gap-0 overflow-hidden rounded-3xl border-slate-200/80 p-0 shadow-2xl dark:border-white/10 ${targetType === "collective" ? "sm:max-w-2xl" : "sm:max-w-xl"} [&>[data-slot=dialog-close]]:right-5 [&>[data-slot=dialog-close]]:top-5 [&>[data-slot=dialog-close]]:grid [&>[data-slot=dialog-close]]:size-9 [&>[data-slot=dialog-close]]:place-items-center [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:hover:bg-slate-100 dark:[&>[data-slot=dialog-close]]:hover:bg-white/10`}
      >
        <form onSubmit={submit} className="flex max-h-[calc(100svh-2rem)] flex-col">
          <DialogHeader className="border-b border-slate-100 px-6 py-5 pr-16 dark:border-white/5 sm:px-7 sm:py-6">
            <div className="flex items-start gap-4 text-left">
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${iconTone}`}>
                <FormIcon className="size-5" />
              </span>
              <div className="min-w-0 pt-0.5">
                <DialogTitle className="text-xl font-extrabold tracking-tight">{title}</DialogTitle>
                <DialogDescription className="mt-2 max-w-lg text-sm leading-6">
                  {description} O registro ficará disponível nos Conselhos correspondentes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-6 sm:px-7">
            <div className="space-y-5">
              <section className="grid gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-slate-950/25 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="module-occurrence-class">
                    {targetType === "collective" ? "Filtrar estudantes por turma" : "Turma"}
                  </Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger id="module-occurrence-class" className="h-11 w-full rounded-xl bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetType === "collective" ? <SelectItem value="all">Todas as turmas</SelectItem> : null}
                      {context.classes.map((item) => <SelectItem key={item.officialCode} value={item.officialCode}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {targetType === "student" ? (
                  <div className="space-y-2">
                    <Label htmlFor="module-occurrence-student">Estudante</Label>
                    <Select value={studentId} onValueChange={setStudentId}>
                      <SelectTrigger id="module-occurrence-student" className="h-11 w-full rounded-xl bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Selecione o estudante" />
                      </SelectTrigger>
                      <SelectContent>
                        {schoolClass?.students.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.enrollmentNumber}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="module-occurrence-category">Categoria</Label>
                    <Select value={category} onValueChange={(value) => setCategory(value as StudentOccurrenceCategory)}>
                      <SelectTrigger id="module-occurrence-category" className="h-11 w-full rounded-xl bg-white dark:bg-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STUDENT_OCCURRENCE_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{STUDENT_OCCURRENCE_LABELS[item]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {targetType === "student" ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="module-occurrence-category">Categoria</Label>
                    <Select value={category} onValueChange={(value) => setCategory(value as StudentOccurrenceCategory)}>
                      <SelectTrigger id="module-occurrence-category" className="h-11 w-full rounded-xl bg-white dark:bg-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STUDENT_OCCURRENCE_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{STUDENT_OCCURRENCE_LABELS[item]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="module-occurrence-date">Data</Label>
                  <Input
                    id="module-occurrence-date"
                    type="date"
                    value={occurredOn}
                    min={`${schoolYear}-01-01`}
                    max={schoolYear === Number(schoolToday().slice(0, 4)) ? schoolToday() : `${schoolYear}-12-31`}
                    onChange={(event) => setOccurredOn(event.target.value)}
                    className="h-11 rounded-xl bg-white dark:bg-slate-900"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="module-occurrence-guardian">Responsável(is) ciente(s)</Label>
                  <Select value={guardianNotified} onValueChange={setGuardianNotified}>
                    <SelectTrigger id="module-occurrence-guardian" className="h-11 w-full rounded-xl bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Sim</SelectItem>
                      <SelectItem value="no">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {targetType === "collective" ? (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="module-occurrence-student-search">Estudantes envolvidos</Label>
                    <span className={`text-sm font-semibold ${studentIds.length >= 2 ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}>
                      {studentIds.length} selecionados
                    </span>
                  </div>
                  <div
                    className="relative"
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setStudentSearchOpen(false);
                    }}
                  >
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="module-occurrence-student-search"
                      value={studentSearch}
                      onChange={(event) => { setStudentSearch(event.target.value); setStudentSearchOpen(true); }}
                      onFocus={() => setStudentSearchOpen(true)}
                      placeholder="Digite o nome ou a matrícula do estudante"
                      className="h-11 rounded-xl pl-10"
                      role="combobox"
                      aria-expanded={studentSearchOpen && normalizedSearch.length >= 2}
                      aria-controls="module-occurrence-student-results"
                      aria-autocomplete="list"
                      autoComplete="off"
                    />
                    {studentSearchOpen && normalizedSearch.length >= 2 ? (
                      <div
                        id="module-occurrence-student-results"
                        role="listbox"
                        className="absolute inset-x-0 top-full z-30 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                      >
                        {collectiveStudents.length ? collectiveStudents.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            role="option"
                            aria-selected="false"
                            onClick={() => selectStudent(student.id)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
                          >
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                              <UserRound className="size-4" />
                            </span>
                            <span className="min-w-0">
                              <strong className="block truncate text-sm">{student.name}</strong>
                              <span className="block text-sm text-muted-foreground">{student.enrollmentNumber} · {student.className}</span>
                            </span>
                          </button>
                        )) : <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum estudante encontrado.</p>}
                      </div>
                    ) : null}
                  </div>

                  {selectedStudents.length ? (
                    <div className="max-h-32 space-y-2 overflow-y-auto pr-1" aria-label="Estudantes selecionados">
                      {selectedStudents.map((student) => (
                        <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-2 dark:border-amber-900/70 dark:bg-amber-950/25">
                          <span className="min-w-0">
                            <strong className="block truncate text-sm">{student.name}</strong>
                            <span className="block text-sm text-muted-foreground">{student.enrollmentNumber} · {student.className}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeStudent(student.id)}
                            disabled={saving}
                            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-amber-100 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-amber-900/50 dark:hover:text-amber-100"
                            aria-label={`Remover ${student.name}`}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Digite pelo menos dois caracteres e escolha os estudantes nos resultados.</p>
                  )}

                  {studentIds.length === 1 ? <p className="text-sm text-amber-700 dark:text-amber-300">Selecione mais um estudante para continuar.</p> : null}
                </section>
              ) : null}

              <section className="space-y-2">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <Label htmlFor="module-occurrence-notes">Descrição {notesRequired ? "" : "(opcional)"}</Label>
                    <p className="mt-1 text-sm text-muted-foreground">Registre o fato de forma objetiva e inclua as providências tomadas.</p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{notes.length}/2000</span>
                </div>
                <Textarea
                  id="module-occurrence-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={2000}
                  rows={5}
                  required={notesRequired}
                  placeholder="Descreva o que aconteceu e quais providências foram tomadas..."
                  className="min-h-32 resize-y rounded-2xl px-4 py-3 leading-6"
                />
              </section>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-slate-950/25 sm:px-7">
            <Button type="button" variant="ghost" className="h-11 rounded-xl px-5" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="h-11 rounded-xl px-5" disabled={saving || !canSubmit}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {saving ? "Registrando..." : "Registrar ocorrência"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
