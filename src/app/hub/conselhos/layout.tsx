"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, ListChecks, LogOut, ShieldAlert } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { SCHOOL_NAME, SCHOOL_SHORT_NAME } from "@/constants/main/school";

export default function CouncilsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && !user) router.replace(`/hub/login?redirect=${encodeURIComponent(pathname)}`);
  }, [loading, pathname, router, user]);

  if (loading || !user) return <div className="min-h-screen grid place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!["admin", "gestor", "coordenador"].includes(user.role)) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="max-w-md rounded-2xl border bg-white p-8 text-center"><ShieldAlert className="mx-auto mb-4 h-10 w-10 text-destructive" /><h1 className="text-xl font-bold">Acesso restrito</h1><p className="mt-2 text-sm text-muted-foreground">Somente perfis ativos de coordenação, gestão ou administração acessam o Conselho de Classe.</p><Button className="mt-5" asChild><Link href="/hub">Voltar ao Hub</Link></Button></div></div>;
  }

  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur dark:bg-card/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/hub/conselhos" className="flex min-w-0 items-center gap-3"><Image src="/logo_escola.png" alt={`Logo da ${SCHOOL_NAME}`} width={42} height={42} className="h-10 w-10 shrink-0 object-contain" priority /><span className="min-w-0"><strong className="block text-sm">Conselho de Classe</strong><span className="block max-w-[180px] truncate text-xs text-muted-foreground sm:max-w-[360px]"><span className="sm:hidden">{SCHOOL_SHORT_NAME}</span><span className="hidden sm:inline">{SCHOOL_NAME}</span></span></span></Link>
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild><Link href="/hub"><Home className="h-4 w-4" /><span className="hidden sm:inline">Hub</span></Link></Button>
          <Button variant="ghost" size="sm" asChild><Link href="/hub/conselhos"><ListChecks className="h-4 w-4" /><span className="hidden sm:inline">Conselhos</span></Link></Button>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sair</span></Button>
        </nav>
      </div>
    </header>
    {children}
  </div>;
}
