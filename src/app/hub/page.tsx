"use client";

import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpenCheck, FileText, LogOut, LayoutDashboard } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";

export default function HubHomePage() {
  const { user, loading, logout } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/hub/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo_escola.png"
            alt="Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <div>
            <h1 className="text-sm font-bold text-foreground">FelixHub</h1>
            <p className="text-xs text-muted-foreground">Portal da Coordenação</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm font-medium text-muted-foreground hidden sm:block">
            {user.email}
          </p>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6" />
            Painel de Módulos
          </h2>
          <p className="text-muted-foreground mt-1">
            Selecione o módulo que deseja acessar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/hub/simulados"
            className="group flex flex-col p-6 rounded-2xl border bg-white dark:bg-card hover:shadow-md hover:border-primary/50 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Simulados</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Módulo de criação, gerenciamento e impressão de simulados e banco de questões.
            </p>
          </Link>
          <RoleGate allowed={["admin", "gestor", "coordenador"]}>
            <Link
              href="/hub/conselhos"
              className="group flex flex-col p-6 rounded-2xl border bg-white dark:bg-card hover:shadow-md hover:border-primary/50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BookOpenCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Conselho de Classe</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Importe o desempenho, conduza as reuniões por turma e acompanhe intervenções.
              </p>
            </Link>
          </RoleGate>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground border-t bg-white dark:bg-card leading-relaxed">
        FelixHub · Plataforma de gestão escolar<br />
        All rights reserved  &copy; {new Date().getFullYear()} Desenvolvido por Misael Lima
      </footer>
    </div>
  );
}
