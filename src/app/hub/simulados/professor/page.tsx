"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LockKeyhole, Loader2, Eye, EyeOff } from "lucide-react";

function TeacherLoginForm() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const redirectTo = searchParams.get('redirect');
    
    try {
      const res = await fetch("/api/auth/teacher-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Senha incorreta.");
        return;
      }
      toast.success("Acesso liberado!");
      
      // Se houver um destino específico, vai para lá. Senão, vai para nova-questao padrão.
      const finalDest = redirectTo ? `/hub${redirectTo}` : "/hub/simulados/professor/nova-questao";
      router.push(finalDest);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-sm">
        {/* Logo e nome da escola */}
        <div className="flex flex-col items-center mb-8 text-center gap-3">
          <Image
            src="/logo_escola.png"
            alt="Logo da escola"
            width={80}
            height={80}
            className="object-contain"
          />
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">
              Banco de Questões
            </p>
            <h1 className="text-lg font-bold text-foreground leading-tight max-w-xs">
              Escola Estadual Prof. José Félix de Carvalho Alves
            </h1>
          </div>
        </div>

        {/* Card de login */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-lg border p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <LockKeyhole className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Acesso de Professor</h2>
              <p className="text-sm text-muted-foreground">Digite a senha compartilhada</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha de Acesso</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword((s) => !s)}
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
              className="w-full h-11 font-semibold"
              disabled={loading || !password}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </span>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Em caso de dúvidas, contate a coordenação.
        </p>
      </div>
    </div>
  );
}

export default function TeacherLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <TeacherLoginForm />
    </Suspense>
  );
}
