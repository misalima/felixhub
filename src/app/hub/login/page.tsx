"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

export default function HubLoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Se já estiver logado, vai direto para a home do hub
  useEffect(() => {
    if (!loading && user) {
      router.replace("/hub");
    }
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await login(email, password);
    if (error) {
      toast.error("E-mail ou senha incorretos.");
      setSubmitting(false);
      return;
    }
    toast.success("Bem-vindo!");
    router.push("/hub");
  }

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Painel esquerdo: identidade visual ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-primary p-12 text-primary-foreground relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-16 w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-0 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center text-center gap-6 max-w-sm">
          <div className="w-28 h-28 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shadow-xl">
            <Image
              src="/logo_escola.png"
              alt="Logo da Escola"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold leading-tight">
              Escola Estadual Prof. José Félix de Carvalho Alves
            </h1>
            <p className="mt-3 text-primary-foreground/70 text-sm leading-relaxed">
              Plataforma de gestão escolar — acesso restrito à coordenação e gestão.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-primary-foreground/60 bg-white/10 px-4 py-2 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            Área restrita — somente pessoal autorizado
          </div>
        </div>
      </div>

      {/* ── Painel direito: formulário ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
        {/* Logo mobile */}
        <div className="flex lg:hidden flex-col items-center mb-8 gap-3">
          <Image
            src="/logo_escola.png"
            alt="Logo"
            width={64}
            height={64}
            className="object-contain"
          />
          <p className="text-sm font-semibold text-center text-foreground max-w-xs">
            Escola Estadual Prof. José Félix de Carvalho Alves
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Entrar</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Acesse com seu e-mail e senha institucionais.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold mt-2"
              disabled={submitting || !email || !password}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-8 leading-relaxed">
            FelixHub · Plataforma de gestão escolar<br />
            All rights reserved &copy; {new Date().getFullYear()} Desenvolvido por Misael Lima
          </p>
        </div>
      </div>
    </div>
  );
}
