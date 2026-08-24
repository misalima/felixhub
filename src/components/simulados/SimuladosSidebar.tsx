"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Database, ExternalLink, FileText, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SimuladosSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isExamsActive =
    pathname === "/hub/simulados" ||
    (pathname.startsWith("/hub/simulados/") &&
      !pathname.startsWith("/hub/simulados/questoes") &&
      !pathname.startsWith("/hub/simulados/professor"));

  return (
    <div className="flex h-full flex-col bg-white/72 dark:bg-slate-950/35">
      <div className="px-5 pb-3 pt-6 pr-12 md:pr-5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
          <Layers3 className="size-3.5" />
          Módulo
        </div>
        <h2 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">Simulados</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Avaliações e banco pedagógico</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Navegação de Simulados">
        <NavLink href="/hub/simulados" icon={<FileText className="size-4" />} label="Simulados" description="Criar e gerenciar" active={isExamsActive} onNavigate={onNavigate} />
        <NavLink href="/hub/simulados/questoes" icon={<Database className="size-4" />} label="Banco de questões" description="Consultar e organizar" active={pathname.startsWith("/hub/simulados/questoes")} onNavigate={onNavigate} />

        <div className="px-3 pb-1 pt-5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Acesso externo</div>
        <NavLink href="/hub/simulados/professor" icon={<BookOpen className="size-4" />} label="Portal do professor" description="Abrir em nova aba" external onNavigate={onNavigate} />
      </nav>

      <div className="p-4">
        <div className="rounded-2xl border border-sky-100 bg-sky-50/75 p-3.5 dark:border-sky-900/50 dark:bg-sky-950/35">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-900 dark:text-sky-100">
            <span className="flex size-7 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm dark:bg-slate-900 dark:text-sky-300"><Database className="size-3.5" /></span>
            Acervo pedagógico
          </div>
          <p className="mt-2 text-[11px] leading-4 text-sky-700/80 dark:text-sky-300/75">Questões e avaliações centralizadas para toda a equipe.</p>
        </div>
      </div>
    </div>
  );
}

function NavLink({ href, icon, label, description, active = false, external = false, onNavigate }: { href: string; icon: React.ReactNode; label: string; description: string; active?: boolean; external?: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-sky-500/50",
        active
          ? "bg-sky-50 text-sky-900 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.55)] dark:bg-sky-950/55 dark:text-sky-100 dark:shadow-[inset_0_0_0_1px_rgba(7,89,133,0.65)]"
          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white",
      )}
    >
      {active ? <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-sky-600 dark:bg-sky-400" /> : null}
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors", active ? "bg-white text-sky-700 shadow-sm dark:bg-slate-900 dark:text-sky-300" : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-sky-700 dark:bg-white/5 dark:text-slate-400 dark:group-hover:bg-slate-900 dark:group-hover:text-sky-300")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold">{label}</span>
        <span className="block truncate text-[10px] font-medium opacity-65">{description}</span>
      </span>
      {external ? <ExternalLink className="size-3.5 shrink-0 opacity-45" /> : null}
    </Link>
  );
}
