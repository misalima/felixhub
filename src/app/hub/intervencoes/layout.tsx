"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { HubHeader } from "@/components/hub/HubHeader";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";

const INTERVENTION_ROLES = ["admin", "gestor", "coordenador"];

export default function InterventionsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { if (!loading && !user) router.replace(`/hub/login?redirect=${encodeURIComponent(pathname)}`); }, [loading, pathname, router, user]);

  if (loading || !user) return <div className="hub-app-background grid min-h-screen place-items-center"><div className="size-8 animate-spin rounded-full border-[3px] border-sky-200 border-t-sky-600" /></div>;
  if (!INTERVENTION_ROLES.includes(user.role)) return <div className="hub-app-background grid min-h-screen place-items-center p-6"><div className="max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm dark:bg-slate-900"><ShieldAlert className="mx-auto size-8 text-rose-600" /><h1 className="mt-4 text-xl font-bold">Acesso restrito</h1><p className="mt-2 text-sm text-muted-foreground">O acompanhamento de intervenções é destinado à coordenação, gestão e administração.</p><Button asChild className="mt-6"><Link href="/hub">Voltar ao painel</Link></Button></div></div>;

  return <div className="hub-app-background min-h-screen"><HubHeader module={{ label: "Intervenções", href: "/hub/intervencoes" }} className="interventions-app-header" />{children}</div>;
}
