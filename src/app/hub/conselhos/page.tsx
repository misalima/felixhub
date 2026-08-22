"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookOpenCheck, CalendarDays, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { councilFetch } from "@/lib/class-council/client";

type CouncilListItem = { id: string; school_year: number; term: number; offering: string; meeting_date: string; status: string; current_import_id: string | null; classCount: number; completedClassCount: number };
const statusLabels: Record<string, string> = { draft: "Rascunho", preparation: "Preparação", in_progress: "Em andamento", completed: "Concluído", reopened: "Reaberto" };

export default function CouncilsPage() {
  const [items, setItems] = useState<CouncilListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { councilFetch<CouncilListItem[]>("/api/class-councils").then(setItems).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);
  return <main className="mx-auto max-w-6xl p-4 py-8 sm:p-8">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold">Conselhos de Classe</h1><p className="mt-1 text-sm text-muted-foreground">Crie, importe e acompanhe as turmas do Ensino Regular.</p></div><Button asChild><Link href="/hub/conselhos/novo"><Plus className="h-4 w-4" />Novo conselho</Link></Button></div>
    {loading ? <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div> : error ? <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertCircle className="h-5 w-5" />{error}</div> : items.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-12 text-center dark:bg-card"><BookOpenCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><h2 className="font-semibold">Nenhum conselho criado</h2><p className="mt-1 text-sm text-muted-foreground">Comece criando o conselho do bimestre atual.</p></div> : <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <Link key={item.id} href={`/hub/conselhos/${item.id}`} className="rounded-2xl border bg-white p-5 transition hover:border-primary/40 hover:shadow-sm dark:bg-card"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{item.school_year} · {item.term}º bimestre</h2><p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{new Date(`${item.meeting_date}T12:00:00`).toLocaleDateString("pt-BR")}</p></div><Badge variant="secondary">{statusLabels[item.status] ?? item.status}</Badge></div><div className="mt-5"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Progresso das turmas</span><span>{item.completedClassCount}/{item.classCount}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${item.classCount ? (item.completedClassCount / item.classCount) * 100 : 0}%` }} /></div></div>{!item.current_import_id && <p className="mt-4 text-xs font-medium text-amber-700">Aguardando importação do relatório</p>}</Link>)}</div>}
  </main>;
}
