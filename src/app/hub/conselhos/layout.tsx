"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { HubHeader } from "@/components/hub/HubHeader";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";

const COUNCIL_ROLES = ["admin", "gestor", "coordenador"];

export default function CouncilsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/hub/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  if (loading || !user) {
    return (
      <div className="hub-app-background grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-[3px] border-sky-200 border-t-sky-600 dark:border-sky-950 dark:border-t-sky-400" />
          <p className="text-sm font-medium text-muted-foreground">Carregando Conselho de Classe...</p>
        </div>
      </div>
    );
  }

  if (!COUNCIL_ROLES.includes(user.role)) {
    return (
      <div className="hub-app-background grid min-h-screen place-items-center p-6">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 text-center shadow-[0_24px_70px_-38px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/10 dark:bg-slate-900/85">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Acesso restrito</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Somente perfis ativos de coordenação, gestão ou administração acessam o Conselho de Classe.
          </p>
          <Button className="mt-6 rounded-xl" asChild>
            <Link href="/hub">Voltar ao painel</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="hub-app-background min-h-screen">
      <HubHeader
        module={{ label: "Conselho de Classe", href: "/hub/conselhos" }}
        className="council-app-header"
      />
      {children}
    </div>
  );
}
