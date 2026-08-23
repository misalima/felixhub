"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { classCouncilQueryKeys } from "@/hooks/useClassCouncils";
import { councilFetch } from "@/lib/class-council/client";

export default function NewCouncilPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState("2");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try { const council = await councilFetch<{ id: string }>("/api/class-councils", { method: "POST", body: JSON.stringify({ schoolYear: year, term: Number(term), meetingDate }) }); await queryClient.invalidateQueries({ queryKey: classCouncilQueryKeys.list(), refetchType: "all" }); router.push(`/hub/conselhos/${council.id}/importar`); }
    catch (err) { setError(err instanceof Error ? err.message : "Erro ao criar."); } finally { setSaving(false); }
  }
  return <main className="mx-auto max-w-xl p-4 py-8 sm:p-8"><Button variant="ghost" asChild className="mb-5"><Link href="/hub/conselhos"><ArrowLeft className="h-4 w-4" />Voltar</Link></Button><form onSubmit={submit} className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-card"><div className="mb-6 flex items-center gap-3"><CalendarPlus className="h-7 w-7" /><div><h1 className="text-xl font-bold">Novo conselho</h1><p className="text-sm text-muted-foreground">Ensino Regular</p></div></div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="year">Ano letivo</Label><Input id="year" type="number" min={2020} max={2100} value={year} onChange={(event) => setYear(Number(event.target.value))} required /></div><div className="space-y-2"><Label>Bimestre</Label><Select value={term} onValueChange={setTerm}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4].map((value) => <SelectItem key={value} value={String(value)}>{value}º bimestre</SelectItem>)}</SelectContent></Select></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="date">Data do conselho</Label><Input id="date" type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} required /></div></div>{error && <p className="mt-4 text-sm text-destructive">{error}</p>}<Button className="mt-6 w-full" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}{saving ? "Criando" : "Criar e importar relatório"}</Button></form></main>;
}
