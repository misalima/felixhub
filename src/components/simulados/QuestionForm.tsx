"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { KNOWLEDGE_AREAS, DISCIPLINES_BY_AREA, DIFFICULTIES, LEVELS, type KnowledgeArea, type AnswerOption, type Difficulty, type Level } from "@/types/simulados";
import { Upload, X, Loader2, CheckCircle2, Info } from "lucide-react";

const emptyForm = {
  knowledge_area: "" as KnowledgeArea | "",
  subject: "",
  topic: "",
  statement: "",
  teacher_name: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  option_e: "",
  answer: "" as AnswerOption | "",
  image_url: null as string | null,
  difficulty: "" as Difficulty | "",
  level: "" as Level | "",
};

const ANSWER_OPTIONS: AnswerOption[] = ["A", "B", "C", "D", "E"];

export function QuestionForm() {
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof emptyForm, value: string | null) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Ao mudar a área, limpa a disciplina
  function handleAreaChange(area: string) {
    setForm((prev) => ({ ...prev, knowledge_area: area as KnowledgeArea, subject: "" }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/questions/upload-image", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro no upload");
      set("image_url", json.url);
      toast.success("Imagem enviada com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    set("image_url", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.knowledge_area || !form.subject || !form.statement ||
        !form.option_a || !form.option_b || !form.option_c ||
        !form.option_d || !form.option_e || !form.answer || !form.level) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          difficulty: form.difficulty || null,
          level: form.level || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar");
      setSubmitted(true);
      setTimeout(() => {
        setForm(emptyForm);
        setSubmitted(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 2500);
      toast.success("Questão enviada com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  const optionLabels: { key: "option_a" | "option_b" | "option_c" | "option_d" | "option_e"; label: AnswerOption }[] = [
    { key: "option_a", label: "A" },
    { key: "option_b", label: "B" },
    { key: "option_c", label: "C" },
    { key: "option_d", label: "D" },
    { key: "option_e", label: "E" },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {/* ── FORMULÁRIO ── */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Área + Disciplina — empilhados verticalmente para evitar sobreposição */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="area">Área de Conhecimento *</Label>
            <Select
              value={form.knowledge_area}
              onValueChange={handleAreaChange}
            >
              <SelectTrigger id="area" className="w-full">
                <SelectValue placeholder="Selecione a área" />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Disciplina *</Label>
            <Select
              value={form.subject}
              onValueChange={(v) => set("subject", v)}
              disabled={!form.knowledge_area}
            >
              <SelectTrigger id="subject" className="w-full">
                <SelectValue
                  placeholder={
                    form.knowledge_area
                      ? "Selecione a disciplina"
                      : "Selecione a área primeiro"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {form.knowledge_area &&
                  DISCIPLINES_BY_AREA[form.knowledge_area as KnowledgeArea]?.map((disc) => (
                    <SelectItem key={disc} value={disc}>
                      {disc}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="topic">Conteúdo / Tópico <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              id="topic"
              placeholder="Ex: Era Vargas, Funções do 2º grau, Fotossíntese..."
              value={form.topic}
              onChange={(e) => set("topic", e.target.value)}
            />
          </div>
        </div>

        {/* Nome do Professor */}
        <div className="space-y-1.5">
          <Label htmlFor="teacher">Seu Nome</Label>
          <Input
            id="teacher"
            placeholder="Nome do professor (opcional)"
            value={form.teacher_name}
            onChange={(e) => set("teacher_name", e.target.value)}
          />
        </div>

        {/* Dificuldade + Nível */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="difficulty">Dificuldade</Label>
            <Select
              value={form.difficulty}
              onValueChange={(v) => set("difficulty", v)}
            >
              <SelectTrigger id="difficulty" className="w-full">
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="level">Nível / Série *</Label>
            <Select
              value={form.level}
              onValueChange={(v) => set("level", v)}
            >
              <SelectTrigger id="level" className="w-full">
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Enunciado */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="statement">Enunciado da Questão *</Label>
          </div>
          <Textarea
            id="statement"
            placeholder="Digite o enunciado completo da questão aqui..."
            className="min-h-[120px] resize-y"
            value={form.statement}
            onChange={(e) => set("statement", e.target.value)}
          />
          <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-1">
            <Info className="w-4 h-4 shrink-0 text-blue-500" />
            <span>
              <strong>Dica de Matemática:</strong> Para equações dentro do texto use cifrão no início o no fim. Ex.: <code className="bg-muted px-1 py-0.5 rounded text-foreground">$1+1=2$</code>. Para blocos isolados use dois cifrões no início o no fim. Ex.: <code className="bg-muted px-1 py-0.5 rounded text-foreground">$$f(x)=x^2$$</code> (Sintaxe LaTeX).
              <Link href="/hub/simulados/professor/guia-matematica" target="_blank" className="font-medium text-primary hover:underline ml-1 whitespace-nowrap">
                Ver Guia de Símbolos &rarr;
              </Link>
            </span>
          </p>
        </div>

        {/* Imagem (opcional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Imagem (opcional)</Label>
            {!form.image_url && (
              <div className="flex rounded-md border text-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setImageInputMode("upload")}
                  className={`px-3 py-1 transition-colors ${imageInputMode === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode("url")}
                  className={`px-3 py-1 transition-colors ${imageInputMode === "url" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  URL
                </button>
              </div>
            )}
          </div>

          {form.image_url ? (
            <div className="relative inline-block">
              <Image
                src={form.image_url}
                alt="Imagem da questão"
                width={320}
                height={200}
                unoptimized
                className="rounded-lg border object-contain max-h-40"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:scale-110 transition-transform"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : imageInputMode === "url" ? (
            <Input
              placeholder="https://exemplo.com/imagem.png"
              onBlur={(e) => {
                const url = e.target.value.trim();
                if (url) set("image_url", url);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const url = (e.target as HTMLInputElement).value.trim();
                  if (url) set("image_url", url);
                }
              }}
            />
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploading ? "Enviando..." : "Clique ou arraste uma imagem (JPG, PNG, WebP — máx. 5 MB)"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {/* Alternativas */}
        <div className="space-y-2">
          <Label>Alternativas *</Label>
          {optionLabels.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0 border-2 transition-colors ${
                  form.answer === label
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {label}
              </span>
              <Input
                placeholder={`Alternativa ${label}`}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Gabarito */}
        <div className="space-y-1.5">
          <Label htmlFor="answer">Gabarito (Resposta Correta) *</Label>
          <Select
            value={form.answer}
            onValueChange={(v) => set("answer", v)}
          >
            <SelectTrigger id="answer">
              <SelectValue placeholder="Selecione o gabarito" />
            </SelectTrigger>
            <SelectContent>
              {ANSWER_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  Alternativa {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={submitting || submitted}
        >
          {submitted ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Questão Enviada!
            </span>
          ) : submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Salvando...
            </span>
          ) : (
            "Enviar Questão"
          )}
        </Button>
      </form>

      {/* ── PREVIEW ── */}
      <div className="hidden xl:block">
        <div className="sticky top-6">
          <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Pré-visualização
          </p>
          <QuestionPreview form={form} />
        </div>
      </div>
    </div>
  );
}

type FormState = typeof emptyForm;

function QuestionPreview({ form }: { form: FormState }) {
  const options = [
    { label: "A", value: form.option_a },
    { label: "B", value: form.option_b },
    { label: "C", value: form.option_c },
    { label: "D", value: form.option_d },
    { label: "E", value: form.option_e },
  ];

  const hasContent =
    form.knowledge_area || form.subject || form.statement || form.option_a;

  if (!hasContent) {
    return (
      <div className="rounded-xl border-2 border-dashed p-8 text-center text-muted-foreground text-sm">
        Preencha o formulário para ver o preview aqui
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white dark:bg-card shadow-sm p-6 text-sm font-serif leading-relaxed">
      {(form.knowledge_area || form.subject) && (
        <div className="mb-3 pb-2 border-b flex flex-wrap gap-2 items-center">
          {form.knowledge_area && (
            <span className="text-sm font-sans font-semibold uppercase tracking-wide text-muted-foreground">
              {form.knowledge_area}
            </span>
          )}
          {form.knowledge_area && form.subject && (
            <span className="text-muted-foreground">·</span>
          )}
          {form.subject && (
            <span className="text-sm font-sans font-medium text-foreground">
              {form.subject}
            </span>
          )}
        </div>
      )}

      {form.statement && (
        <div className="mb-4 prose prose-sm dark:prose-invert max-w-none">
          <MarkdownRenderer>
            {form.statement}
          </MarkdownRenderer>
        </div>
      )}

      {form.image_url && (
        <div className="mb-4">
          <Image
            src={form.image_url}
            alt="Imagem da questão"
            width={400}
            height={250}
            unoptimized
            className="max-h-40 object-contain rounded border"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {options.map(({ label, value }) =>
          value ? (
            <div key={label} className="flex items-start gap-2">
              <span
                className={`shrink-0 w-5 h-5 rounded-full text-sm flex items-center justify-center font-bold mt-0.5 ${
                  form.answer === label
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </span>
              <span className="flex-1 text-sm break-words prose prose-sm dark:prose-invert">
                <MarkdownRenderer>
                  {String(value)}
                </MarkdownRenderer>
              </span>
            </div>
          ) : null
        )}
      </div>

      {form.answer && (
        <p className="mt-3 pt-2 border-t text-sm font-sans text-muted-foreground">
          Gabarito: <strong className="text-foreground">{form.answer}</strong>
          {form.difficulty && ` · ${form.difficulty}`}
          {form.level && ` · ${form.level}`}
        </p>
      )}
    </div>
  );
}
