"use client";

import Image from "next/image";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { CouncilPrintShell } from "@/components/class-council/CouncilPrintDocuments";
import { SCHOOL_LOCATION, SCHOOL_NAME } from "@/constants/main/school";
import { councilFetch } from "@/lib/class-council/client";
import type { DashboardMissingGradeDetail, PedagogicalDashboardOverviewData } from "@/types/dashboard";

function Loading() {
  return <main className="grid min-h-[60vh] place-items-center"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" />Conferindo as notas pendentes...</p></main>;
}

function sourceDate(value: string | null | undefined) {
  if (!value) return "data de geração não informada";
  return new Date(value).toLocaleString("pt-BR");
}

function MissingGradesDocument({ data }: { data: PedagogicalDashboardOverviewData }) {
  const selected = data.selected!;
  const terms = Array.from({ length: selected.term }, (_, index) => index + 1);
  const groups = useMemo(() => [...data.quality.missingGradeDetails.reduce((map, item) => {
    const group = map.get(item.classId) ?? { classId: item.classId, className: item.className, classCode: item.classCode, items: [] as DashboardMissingGradeDetail[] };
    group.items.push(item);
    map.set(item.classId, group);
    return map;
  }, new Map<string, { classId: string; className: string; classCode: string; items: DashboardMissingGradeDetail[] }>()).values()], [data.quality.missingGradeDetails]);
  const affectedSubjects = new Set(data.quality.missingGradeDetails.map((item) => item.subjectName)).size;

  return <>
    <header className="council-print-header mb-5 flex items-center gap-4 border-b-2 border-slate-900 pb-3">
      <Image src="/logo_escola.png" alt={`Logo da ${SCHOOL_NAME}`} width={64} height={64} className="council-print-logo size-14 object-contain" unoptimized />
      <div><p className="text-xs font-bold uppercase tracking-wide">{SCHOOL_NAME}</p><p className="text-[11px] text-slate-600">{SCHOOL_LOCATION}</p><h1 className="mt-1.5 text-lg font-black">Relatório de notas pendentes</h1><p className="text-[11px] text-slate-600">{selected.year} · até o {selected.term}º bimestre · relatório gerado em {sourceDate(data.source?.generatedAt)}</p></div>
    </header>

    <section className="grid grid-cols-3 gap-2">
      <Summary value={data.metrics.missingGrades} label="notas pendentes" />
      <Summary value={groups.length} label="turmas afetadas" />
      <Summary value={affectedSubjects} label="disciplinas afetadas" />
    </section>

    <p className="print-avoid-break mt-4 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-700"><strong>Critério:</strong> entram apenas resultados sem nota numérica marcados com <strong className="font-mono">*</strong> ou deixados vazios nos bimestres já transcorridos. <strong className="font-mono">s/n</strong> significa componente sem nota e não é contabilizado; outros marcadores especiais também ficam fora.</p>

    {groups.length ? <div className="mt-5 space-y-5">{groups.map((group) => {
      const classTotal = group.items.reduce((total, item) => total + item.missingGrades, 0);
      return <section key={group.classId} className="missing-grades-group">
        <div className="missing-grades-group-header flex items-end justify-between gap-4 border-b-2 border-slate-800 pb-1.5"><div><h2 className="text-sm font-black">Turma {group.className}</h2><p className="text-[9px] text-slate-500">{group.classCode}</p></div><strong className="text-[10px]">{classTotal} {classTotal === 1 ? "nota pendente" : "notas pendentes"}</strong></div>
        <table className="mt-1.5 w-full table-fixed border-collapse text-[9px] leading-snug">
          <colgroup><col />{terms.map((term) => <col key={term} className="w-[12%]" />)}<col className="w-[12%]" /></colgroup>
          <thead><tr className="border-b border-slate-400 text-left"><th className="px-1.5 py-1">Disciplina</th>{terms.map((term) => <th key={term} className="px-1 py-1 text-center">{term}º bim.</th>)}<th className="px-1 py-1 text-center">Total</th></tr></thead>
          <tbody>{group.items.map((item) => {
            const byTerm = new Map(item.byTerm.map((term) => [term.term, term.missingGrades]));
            return <tr key={item.subjectId} className="print-avoid-break border-b border-slate-200"><td className="px-1.5 py-1.5 font-medium">{item.subjectName}</td>{terms.map((term) => <td key={term} className="px-1 py-1.5 text-center text-slate-600">{byTerm.get(term) || "—"}</td>)}<td className="px-1 py-1.5 text-center font-bold">{item.missingGrades}</td></tr>;
          })}<tr className="print-avoid-break border-t border-slate-500 bg-slate-50 font-bold"><td className="px-1.5 py-1">Total da turma</td>{terms.map((term) => <td key={term} className="px-1 py-1 text-center">{group.items.reduce((total, item) => total + (item.byTerm.find((entry) => entry.term === term)?.missingGrades ?? 0), 0) || "—"}</td>)}<td className="px-1 py-1 text-center">{classTotal}</td></tr></tbody>
        </table>
      </section>;
    })}</div> : <div className="mt-8 rounded-xl border border-emerald-300 bg-emerald-50 p-8 text-center text-emerald-900"><CheckCircle2 className="mx-auto size-7" /><h2 className="mt-3 font-bold">Nenhuma nota pendente</h2><p className="mt-1 text-xs">A versão selecionada não possui notas faltantes nos bimestres transcorridos.</p></div>}

    <p className="mt-7 border-t border-slate-300 pt-2 text-[9px] text-slate-500">Fonte: versão {data.source?.version ?? "—"} do Relatório de Desempenho. Documento gerado pelo Felix Hub.</p>
    <style jsx global>{`
      .missing-grades-group-header { break-after: avoid; page-break-after: avoid; }
      .council-print-compact .missing-grades-group { margin-top: .65rem; }
      .council-print-compact .missing-grades-group table { margin-top: .2rem; font-size: .48rem; }
      .council-print-compact .missing-grades-group th,
      .council-print-compact .missing-grades-group td { padding-top: .15rem; padding-bottom: .15rem; }
    `}</style>
  </>;
}

function Summary({ value, label }: { value: number; label: string }) {
  return <div className="print-avoid-break rounded-lg border border-slate-300 px-3 py-2"><strong className="block text-lg font-black">{value.toLocaleString("pt-BR")}</strong><span className="text-[10px] text-slate-600">{label}</span></div>;
}

function MissingGradesReportContent() {
  const params = useSearchParams();
  const year = Number(params.get("ano"));
  const term = Number(params.get("bimestre"));
  const valid = Number.isInteger(year) && year > 0 && [1, 2, 3, 4].includes(term);
  const [compact, setCompact] = useState(false);
  const query = useQuery({
    queryKey: ["pedagogical-dashboard", "missing-grades-report", year, term],
    queryFn: () => councilFetch<PedagogicalDashboardOverviewData>(`/api/dashboard/summary?year=${year}&term=${term}`),
    enabled: valid,
  });

  if (!valid) return <main className="mx-auto max-w-3xl p-8"><p className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />Selecione um Conselho válido na Central de relatórios.</p></main>;
  if (query.isPending) return <Loading />;
  if (query.error || !query.data?.selected) return <main className="mx-auto max-w-3xl p-8"><p className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />{query.error instanceof Error ? query.error.message : "Não foi possível carregar as notas pendentes."}</p></main>;

  return <CouncilPrintShell backHref="/hub/relatorios" documentTitle={`Notas pendentes - ${term}º Bimestre ${year}`} compact={compact} onCompactChange={setCompact}><MissingGradesDocument data={query.data} /></CouncilPrintShell>;
}

export default function MissingGradesReportPage() {
  return <Suspense fallback={<Loading />}><MissingGradesReportContent /></Suspense>;
}
