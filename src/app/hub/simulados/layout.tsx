"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { HubHeader } from "@/components/hub/HubHeader";
import { SimuladosSidebarContent } from "@/components/simulados/SimuladosSidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useUser } from "@/hooks/useUser";

export default function SimuladosLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Rotas do professor usam autenticação por cookie — sem Supabase Auth.
  const isProfessorRoute = pathname.includes("/professor");
  const isPrintRoute = pathname.includes("/imprimir");
  const isGabaritoRoute = pathname.includes("/gabarito");
  const isFolhaRespostaRoute = pathname.includes("/folha-resposta");
  const isResumoRoute = pathname.includes("/questoes/resumo");

  useEffect(() => {
    if (isProfessorRoute) return;

    if (!loading) {
      if (isResumoRoute) {
        const hasTeacherSession = document.cookie.includes("teacher_logged_in=");
        if (!user && !hasTeacherSession) {
          const redirectPath = pathname.startsWith("/hub") ? pathname.replace("/hub", "") : pathname;
          router.replace(`/hub/simulados/professor?redirect=${encodeURIComponent(redirectPath)}`);
        }
        return;
      }

      if (!user) {
        router.replace(`/hub/login?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [user, loading, router, isProfessorRoute, isResumoRoute, pathname]);

  // Portais públicos e o resumo compartilhado têm experiência própria.
  if (isProfessorRoute || isResumoRoute) return <>{children}</>;

  if (loading) {
    return (
      <div className="hub-app-background grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-[3px] border-sky-200 border-t-sky-600 dark:border-sky-950 dark:border-t-sky-400" />
          <p className="text-sm font-medium text-muted-foreground">Carregando Simulados...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Documentos precisam de uma superfície limpa, sem a navegação do sistema.
  if (isPrintRoute || isGabaritoRoute || isFolhaRespostaRoute) return <>{children}</>;

  const mobileNavigation = (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl text-slate-600 hover:bg-sky-50 hover:text-sky-800 dark:text-slate-300 dark:hover:bg-sky-950/50 dark:hover:text-sky-200"
          aria-label="Abrir navegação de Simulados"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[19rem] gap-0 border-slate-200 bg-white/95 p-0 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/96">
        <SheetHeader className="sr-only">
          <SheetTitle>Navegação de Simulados</SheetTitle>
          <SheetDescription>Acesse as áreas do módulo de Simulados.</SheetDescription>
        </SheetHeader>
        <SimuladosSidebarContent onNavigate={() => setMobileNavOpen(false)} />
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="hub-app-background flex h-dvh flex-col overflow-hidden">
      <HubHeader module={{ label: "Simulados", href: "/hub/simulados" }} mobileNavigation={mobileNavigation} />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[17rem] shrink-0 border-r border-slate-200/70 bg-white/55 backdrop-blur md:flex dark:border-white/10 dark:bg-slate-950/35">
          <SimuladosSidebarContent />
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
