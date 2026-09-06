"use client";

import { useState, useEffect } from "react";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, Pencil, Loader2 } from "lucide-react";
import type { Question, AnswerOption } from "@/types/simulados";
import {
  KNOWLEDGE_AREAS,
  DISCIPLINES_BY_AREA,
  DIFFICULTIES,
  LEVELS,
  type KnowledgeArea,
  type Difficulty,
  type Level,
} from "@/types/simulados";
import { useUpdateQuestion } from "@/hooks/useQuestions";

interface QuestionEditModalProps {
  question: Question;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d", "option_e"] as const;
const OPTION_LABELS = ["A", "B", "C", "D", "E"] as const;
const ANSWER_OPTIONS: AnswerOption[] = ["A", "B", "C", "D", "E"];

export function QuestionEditModal({ question, open, onOpenChange }: QuestionEditModalProps) {
  const { mutateAsync: updateQuestion, isPending } = useUpdateQuestion();

  const [form, setForm] = useState({ ...question });
  const [previewStatement, setPreviewStatement] = useState(false);

  // Sync form if question prop changes (e.g. parent re-renders with updated data)
  useEffect(() => {
    setForm({ ...question });
  }, [question]);

  function handleField<K extends keyof Question>(key: K, value: Question[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleAreaChange(area: KnowledgeArea) {
    setForm((prev) => ({ ...prev, knowledge_area: area, subject: "" }));
  }

  const availableSubjects = DISCIPLINES_BY_AREA[form.knowledge_area] ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { id, created_at: _c, updated_at: _u, ...payload } = form;
    try {
      await updateQuestion({ id, payload });
      toast.success("Questão atualizada com sucesso.");
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar a questão.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Editar Questão
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* Área de Conhecimento */}
          <div className="space-y-1.5">
            <Label>Área de Conhecimento</Label>
            <Select
              value={form.knowledge_area}
              onValueChange={(v) => handleAreaChange(v as KnowledgeArea)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_AREAS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Disciplina + Conteúdo — empilhados para evitar sobreposicao */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Disciplina</Label>
              <Select
                value={form.subject || ""}
                onValueChange={(v) => handleField("subject", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="[ Selecione ]" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Conteúdo / Tópico{" "}
                <span className="text-muted-foreground text-sm">(opcional)</span>
              </Label>
              <Input
                value={form.topic ?? ""}
                onChange={(e) => handleField("topic", e.target.value || null)}
                placeholder="Ex: Era Vargas, Fotossíntese..."
              />
            </div>
          </div>

          {/* Enunciado */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Enunciado</Label>
              <button
                type="button"
                onClick={() => setPreviewStatement((p) => !p)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                {previewStatement ? "Editar" : "Preview"}
              </button>
            </div>
            {previewStatement ? (
              <div className="min-h-[100px] p-3 rounded-md border bg-muted/30 prose prose-sm dark:prose-invert max-w-none text-sm">
                <MarkdownRenderer>
                  {form.statement || "*Enunciado vazio*"}
                </MarkdownRenderer>
              </div>
            ) : (
              <Textarea
                value={form.statement}
                onChange={(e) => handleField("statement", e.target.value)}
                rows={4}
                placeholder="Texto do enunciado (Markdown e LaTeX suportados)"
                required
              />
            )}
          </div>

          {/* URL da imagem */}
          <div className="space-y-1.5">
            <Label>URL da Imagem <span className="text-muted-foreground text-sm">(opcional)</span></Label>
            <Input
              value={form.image_url ?? ""}
              onChange={(e) => handleField("image_url", e.target.value || null)}
              placeholder="https://..."
            />
          </div>

          {/* Alternativas */}
          <div className="space-y-2">
            <Label>Alternativas</Label>
            {OPTION_KEYS.map((key, i) => (
              <div key={key} className="flex items-center gap-3">
                <span
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    form.answer === OPTION_LABELS[i]
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {OPTION_LABELS[i]}
                </span>
                <Input
                  value={String(form[key])}
                  onChange={(e) => handleField(key, e.target.value)}
                  placeholder={`Alternativa ${OPTION_LABELS[i]}`}
                  required
                />
              </div>
            ))}
          </div>

          {/* Gabarito — campo crítico */}
          <div className="space-y-1.5 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
            <Label className="text-primary font-semibold">Gabarito (resposta correta)</Label>
            <div className="flex gap-2 flex-wrap">
              {ANSWER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleField("answer", opt)}
                  className={`w-10 h-10 rounded-full text-sm font-bold transition-all border-2 ${
                    form.answer === opt
                      ? "bg-primary text-primary-foreground border-primary scale-110"
                      : "bg-background border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Dificuldade + Nível + Professor */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Dificuldade</Label>
              <Select
                value={form.difficulty ?? ""}
                onValueChange={(v) => handleField("difficulty", (v as Difficulty) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nível</Label>
              <Select
                value={form.level ?? ""}
                onValueChange={(v) => handleField("level", (v as Level) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Professor</Label>
              <Input
                value={form.teacher_name ?? ""}
                onChange={(e) => handleField("teacher_name", e.target.value || null)}
                placeholder="Nome"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Salvar alterações"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
