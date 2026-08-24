"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  BookOpenCheck,
  FileText,
  LayoutDashboard,
  UsersRound,
} from "lucide-react";
import { HubHeader } from "@/components/hub/HubHeader";
import { PageHeader } from "@/components/hub/PageHeader";
import { RoleGate } from "@/components/RoleGate";
import { useUser } from "@/hooks/useUser";

export default function HubHomePage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/hub/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="hub-app-background grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-9 animate-spin rounded-full border-[3px] border-sky-200 border-t-sky-600 dark:border-sky-950 dark:border-t-sky-400" />
          <p className="text-xs font-medium text-muted-foreground">Preparando seu painel...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="hub-app-background flex min-h-screen flex-col">
      <HubHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 min-[1800px]:max-w-[1600px] min-[2400px]:max-w-[1800px]">
        <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-slate-900/72 sm:p-8">
          <div className="relative">
            <PageHeader
              icon={LayoutDashboard}
              title="Painel de módulos"
              description="Tudo o que a coordenação precisa, organizado em um só lugar. Escolha uma área para começar."
              className="mb-0"
            />
          </div>
        </section>

        <section aria-labelledby="modules-title">
          <div className="mb-4 px-1">
            <div>
              <h2 id="modules-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Seus módulos
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Acessos disponíveis para o seu perfil.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <RoleGate allowed={["admin", "gestor", "coordenador"]}>
              <ModuleCard
                href="/hub/alunos"
                icon={UsersRound}
                title="Estudantes"
                description="Consulte prontuários, históricos pedagógicos e ocorrências da vida escolar."
                accent="blue"
              />
            </RoleGate>

            <RoleGate allowed={["admin", "gestor", "coordenador"]}>
              <ModuleCard
                href="/hub/dashboard"
                icon={BarChart3}
                title="Dashboard pedagógico"
                description="Acompanhe ritmo acadêmico, riscos, e outros dados em uma visão consolidada."
                accent="violet"
              />
            </RoleGate>

            <ModuleCard
              href="/hub/simulados"
              icon={FileText}
              title="Simulados"
              description="Crie avaliações, gerencie o banco de questões e prepare materiais para impressão."
              accent="blue"
            />

            <RoleGate allowed={["admin", "gestor", "coordenador"]}>
              <ModuleCard
                href="/hub/conselhos"
                icon={BookOpenCheck}
                title="Conselho de Classe"
                description="Importe desempenhos, conduza reuniões por turma e acompanhe intervenções."
                accent="emerald"
              />
            </RoleGate>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-white/55 px-4 py-5 text-center text-[11px] leading-relaxed text-muted-foreground backdrop-blur dark:border-white/10 dark:bg-slate-950/45">
        <strong className="font-semibold text-slate-600 dark:text-slate-300">FelixHub</strong> · Plataforma de gestão escolar
        <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
        © {new Date().getFullYear()} Misael Lima
      </footer>
    </div>
  );
}

function ModuleCard({
  href,
  icon: Icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: typeof FileText;
  title: string;
  description: string;
  accent: "blue" | "emerald" | "violet";
}) {
  const styles = accent === "blue"
    ? {
          icon: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/70 dark:text-sky-300",
          hover: "hover:border-sky-300/80 dark:hover:border-sky-800",
      }
    : accent === "emerald"
      ? {
          icon: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300",
          hover: "hover:border-emerald-300/80 dark:hover:border-emerald-800",
      }
      : {
          icon: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/70 dark:text-violet-300",
          hover: "hover:border-violet-300/80 dark:hover:border-violet-800",
      };

  return (
    <Link
      href={href}
      className={`group relative min-h-64 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_55px_-38px_rgba(15,23,42,0.5)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-38px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-900/75 dark:focus-visible:ring-offset-slate-950 ${styles.hover}`}
    >
      <span className="relative flex h-full flex-col">
        <span className="flex items-start">
          <span className={`flex size-12 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:-rotate-2 group-hover:scale-105 ${styles.icon}`}>
            <Icon className="size-5" />
          </span>
        </span>

        <span className="mt-auto pt-9">
          <span className="flex items-center justify-between gap-3">
            <strong className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              {title}
            </strong>
            <span className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-300 group-hover:translate-x-1 group-hover:border-sky-200 group-hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:border-sky-800 dark:group-hover:text-sky-300">
              <ArrowUpRight className="size-4" />
            </span>
          </span>
          <span className="mt-2 block max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </span>
        </span>
      </span>
    </Link>
  );
}
