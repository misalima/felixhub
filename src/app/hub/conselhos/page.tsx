"use client";

import Link from "next/link";
import { AlertCircle, ArrowUpRight, BookOpenCheck, CalendarDays, Plus } from "lucide-react";
import { PageHeader } from "@/components/hub/PageHeader";
import { CouncilListSkeleton } from "@/components/class-council/LoadingSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClassCouncils } from "@/hooks/useClassCouncils";
import { cn } from "@/lib/utils";

type CouncilListItem = {
  id: string;
  school_year: number;
  term: number;
  offering: string;
  meeting_date: string;
  status: string;
  current_import_id: string | null;
  classCount: number;
  completedClassCount: number;
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  preparation: "Preparação",
  in_progress: "Em andamento",
  completed: "Concluído",
  reopened: "Reaberto",
};

const statusClasses: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
  preparation: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  in_progress: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  reopened: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300",
};

export default function CouncilsPage() {
  const { data: items = [], error, isPending } = useClassCouncils<CouncilListItem[]>();

  if (isPending) return <CouncilListSkeleton />;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 min-[1800px]:max-w-[1600px] min-[2400px]:max-w-[1800px]">
      <PageHeader
        icon={BookOpenCheck}
        eyebrow="Gestão pedagógica"
        title="Conselhos de Classe"
        description="Crie, importe e acompanhe as turmas do Ensino Regular."
        actions={
          <Button asChild className="rounded-xl shadow-sm">
            <Link href="/hub/conselhos/novo">
              <Plus className="size-4" />
              Novo conselho
            </Link>
          </Button>
        }
      />

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200/70 bg-red-50/80 p-4 text-sm text-red-700 shadow-sm dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-300">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/80 dark:bg-slate-900/70">
            <AlertCircle className="size-4" />
          </span>
          {error instanceof Error ? error.message : "Falha ao carregar os conselhos."}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300/80 bg-white/70 p-12 text-center shadow-[0_18px_55px_-42px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/60">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300">
            <BookOpenCheck className="size-6" />
          </span>
          <h2 className="font-bold text-slate-900 dark:text-white">Nenhum conselho criado</h2>
          <p className="mt-1 text-sm text-muted-foreground">Comece criando o conselho do bimestre atual.</p>
          <Button asChild variant="outline" className="mt-5 rounded-xl bg-white/80 dark:bg-slate-900/70">
            <Link href="/hub/conselhos/novo">
              <Plus className="size-4" />
              Criar primeiro conselho
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((item) => {
            const progress = item.classCount
              ? Math.round((item.completedClassCount / item.classCount) * 100)
              : 0;

            return (
              <Link
                key={item.id}
                href={`/hub/conselhos/${item.id}`}
                className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white/82 p-5 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.55)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300/80 hover:shadow-[0_24px_65px_-40px_rgba(2,132,199,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-900/72 dark:hover:border-sky-800 dark:focus-visible:ring-offset-slate-950"
              >
                <span className="relative flex items-start justify-between gap-3">
                  <span>
                    <strong className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
                      {item.school_year} · {item.term}º bimestre
                    </strong>
                    <span className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                      <CalendarDays className="size-3.5" />
                      {new Date(`${item.meeting_date}T12:00:00`).toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("rounded-full px-2.5 py-1 text-sm font-bold", statusClasses[item.status])}
                  >
                    {statusLabels[item.status] ?? item.status}
                  </Badge>
                </span>

                <span className="relative mt-7 block">
                  <span className="mb-2 flex items-center justify-between text-sm font-medium text-muted-foreground">
                    <span>Progresso das turmas</span>
                    <strong className="text-slate-700 dark:text-slate-200">
                      {item.completedClassCount}/{item.classCount} · {progress}%
                    </strong>
                  </span>
                  <span className="block h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-white/5">
                    <span
                      className="block h-full rounded-full bg-blue-600 transition-[width] duration-500 dark:bg-blue-500"
                      style={{ width: `${progress}%` }}
                    />
                  </span>
                </span>

                <span className="relative mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm dark:border-white/5">
                  <span className={cn("font-medium", item.current_import_id ? "text-slate-500 dark:text-slate-400" : "text-amber-700 dark:text-amber-300")}>
                    {item.current_import_id ? "Relatório disponível" : "Aguardando importação"}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-sky-700 transition-transform group-hover:translate-x-0.5 dark:text-sky-300">
                    Abrir
                    <ArrowUpRight className="size-3.5" />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
