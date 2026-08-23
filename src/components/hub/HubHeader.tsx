"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LayoutGrid, LogOut, ShieldCheck } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import { SCHOOL_SHORT_NAME } from "@/constants/main/school";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { Button } from "@/components/ui/button";

type HubHeaderProps = {
  module?: {
    label: string;
    href: string;
  };
  mobileNavigation?: React.ReactNode;
  className?: string;
};

const roleLabels: Record<string, string> = {
  admin: "Administração",
  gestor: "Gestão",
  coordenador: "Coordenação",
  professor: "Professor",
};

function getInitials(email?: string) {
  if (!email) return "FH";

  return (
    email
      .split("@")[0]
      .split(/[._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "FH"
  );
}

export function HubHeader({ module, mobileNavigation, className }: HubHeaderProps) {
  const { user, logout } = useUser();
  const initials = getInitials(user?.email);
  const displayName = user?.email.split("@")[0] || "Usuário";
  const roleLabel = user ? roleLabels[user.role] ?? user.role : "FelixHub";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 shrink-0 border-b border-slate-200/70 bg-white/80 shadow-[0_1px_0_rgba(15,23,42,0.035)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/78",
        className,
      )}
    >
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {mobileNavigation ? <div className="shrink-0 md:hidden">{mobileNavigation}</div> : null}

          <Link
            href="/hub"
            className="group flex min-w-0 items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            aria-label="Ir para o painel do FelixHub"
          >
            <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-100 via-white to-blue-100 shadow-[0_8px_24px_-12px_rgba(2,132,199,0.75)] transition-transform duration-300 group-hover:-translate-y-0.5 dark:border-sky-800/80 dark:from-sky-900/80 dark:via-slate-900 dark:to-blue-950/80">
              <Image
                src="/logo_escola.png"
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
                priority
              />
            </span>

            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <strong className="truncate text-[15px] font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-base">
                  FelixHub
                </strong>
              </span>
              <span className="block truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">
                {module ? (
                  <>
                    <span className="lg:hidden">{module.label}</span>
                    <span className="hidden lg:inline">Portal da coordenação</span>
                  </>
                ) : (
                  "Portal da coordenação"
                )}
              </span>
            </span>
          </Link>

          {module ? (
            <div className="ml-2 hidden items-center gap-2 border-l border-slate-200 pl-4 dark:border-slate-800 lg:flex">
              <Link
                href={module.href}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white"
              >
                {module.label}
              </Link>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {module ? (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden rounded-xl text-slate-600 hover:bg-sky-50 hover:text-sky-800 dark:text-slate-300 dark:hover:bg-sky-950/50 dark:hover:text-sky-200 sm:inline-flex"
            >
              <Link href="/hub">
                <LayoutGrid className="size-4" />
                Painel
              </Link>
            </Button>
          ) : null}

          <ThemeToggleButton className="rounded-xl text-slate-600 hover:bg-sky-50 hover:text-sky-800 dark:text-slate-300 dark:hover:bg-sky-950/50 dark:hover:text-sky-200" />

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="group flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/90 p-1.5 pr-2 shadow-sm outline-none transition-all hover:border-sky-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-sky-500/60 dark:border-slate-700 dark:bg-slate-900/90 dark:hover:border-sky-800 sm:pr-3"
                aria-label="Abrir menu do usuário"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-xs font-bold text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.9)]">
                  {initials}
                </span>
                <span className="hidden max-w-36 min-w-0 text-left sm:block">
                  <span className="block truncate text-xs font-bold text-slate-800 dark:text-white">
                    {displayName}
                  </span>
                  <span className="block truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {roleLabel}
                  </span>
                </span>
                <ChevronDown className="size-3.5 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={10}
                className="z-50 w-72 origin-[var(--radix-dropdown-menu-content-transform-origin)] rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.42)] backdrop-blur-xl outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 dark:border-white/10 dark:bg-slate-900/96"
              >
                <DropdownMenu.Label className="p-2.5">
                  <span className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-sm font-bold text-white shadow-md">
                      {initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                        {displayName}
                      </span>
                      <span className="block truncate text-xs font-normal text-slate-500 dark:text-slate-400">
                        {user?.email}
                      </span>
                    </span>
                  </span>
                </DropdownMenu.Label>

                <div className="mx-2 mb-2 flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs font-medium text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
                  <ShieldCheck className="size-4" />
                  {roleLabel} · {SCHOOL_SHORT_NAME}
                </div>

                <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-800" />

                {module ? (
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/hub"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 dark:focus:bg-white/5 sm:hidden"
                    >
                      <LayoutGrid className="size-4" />
                      Voltar ao painel
                    </Link>
                  </DropdownMenu.Item>
                ) : null}

                <DropdownMenu.Item
                  onSelect={() => void logout()}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 outline-none transition-colors hover:bg-red-50 focus:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"
                >
                  <LogOut className="size-4" />
                  Sair do FelixHub
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}
