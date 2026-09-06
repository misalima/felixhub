"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { QuestionCard } from "@/components/simulados/QuestionCard";
import { toast } from "sonner";
import {
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
  Search,
  ClipboardCheck,
  Pencil,
  Trash2,
  ListOrdered,
  PlusCircle,
  Eye,
  BarChart3,
  GraduationCap,
  Shuffle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Exam, Question, ExamWithQuestions } from "@/types/simulados";
import {
  KNOWLEDGE_AREAS,
  LEVELS,
  DISCIPLINES_BY_AREA,
  formatAreaSelect,
  formatAreaBadge,
  type KnowledgeArea,
} from "@/types/simulados";
import { Badge } from "@/components/ui/badge";
import { useQuestions } from "@/hooks/useQuestions";
import { useDebounce } from "@/hooks/useDebounce";
import { QuestionEditModal } from "@/components/simulados/QuestionEditModal";
import Image from "next/image";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExamBuilderProps {
  exam: Exam;
  initialQuestions: ExamWithQuestions["exam_questions"];
  onStatusChange?: (status: "draft" | "ready" | "editing" | "applied") => void;
  isUpdatingStatus?: boolean;
}

export function ExamBuilder({
  exam,
  initialQuestions,
  onStatusChange,
  isUpdatingStatus,
}: ExamBuilderProps) {
  const [examQuestions, setExamQuestions] = useState(
    [...initialQuestions].sort((a, b) => a.position - b.position)
  );
  const [filterArea, setFilterArea] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterHideUsed, setFilterHideUsed] = useState(false);
  const [bankPage, setBankPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);

  // Exam meta editing
  const [meta, setMeta] = useState({
    title: exam.title,
    description: exam.description ?? "",
    grade: exam.grade ?? "",
    school_class: exam.school_class ?? "",
    date_label: exam.date_label ?? "",
    duration: exam.duration ?? "",
    school_year: exam.school_year ?? "",
    instructions: exam.instructions ?? "",
  });

  const debouncedSearch = useDebounce(filterSearch, 300);

  // Subjects available for the selected area filter
  const availableSubjects =
    filterArea !== "all"
      ? (DISCIPLINES_BY_AREA[filterArea as KnowledgeArea] ?? [])
      : [];

  // Reset subject when area changes
  function handleAreaChange(area: string) {
    setFilterArea(area);
    setFilterSubject("all");
  }

  const { data: response, isLoading: loadingBank, isError, refetch } = useQuestions({
    area: filterArea !== "all" ? filterArea : null,
    subject: filterSubject !== "all" ? filterSubject : null,
    level: filterLevel !== "all" ? filterLevel : null,
    search: debouncedSearch || null,
    hideUsed: filterHideUsed,
    page: bankPage,
    pageSize: 15,
  });

  const bankQuestions = response?.data || [];
  const bankTotal = response?.total || 0;
  const bankTotalPages = Math.ceil(bankTotal / 15);
  const bankResultsLabel =
    bankTotal === 0
      ? "Nenhuma questão encontrada."
      : bankTotal === 1
        ? `Mostrando ${Math.min(bankQuestions.length, 1)} de 1 questão encontrada`
        : `Mostrando ${bankQuestions.length} de ${bankTotal} questões encontradas`;

  useEffect(() => {
    setBankPage(1);
  }, [filterArea, filterSubject, filterLevel, debouncedSearch, filterHideUsed]);

  const selectedIds = new Set(examQuestions.map((eq) => eq.question_id));

  // ── Individual add / remove ──────────────────────────────────────────────

  async function addQuestion(question: Question) {
    if (selectedIds.has(question.id)) {
      await removeQuestion(question.id);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: question.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExamQuestions((prev) => [...prev, { ...data, question }]);
      toast.success(`Questão adicionada.`);
    } catch {
      toast.error("Erro ao adicionar questão.");
    } finally {
      setSaving(false);
    }
  }

  async function removeQuestion(questionId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}/questions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId }),
      });
      if (!res.ok) throw new Error();
      setExamQuestions((prev) => prev.filter((eq) => eq.question_id !== questionId));
      toast.success("Questão removida.");
    } catch {
      toast.error("Erro ao remover questão.");
    } finally {
      setSaving(false);
    }
  }

  // ── Bulk: Adicionar todas ────────────────────────────────────────────────

  async function addAllVisible() {
    const toAdd = bankQuestions.filter((q) => !selectedIds.has(q.id));
    if (toAdd.length === 0) {
      toast.info("Todas as questões visíveis já estão no simulado.");
      return;
    }
    setBulkLoading(true);
    let added = 0;
    let failed = 0;
    const newEntries: typeof examQuestions = [];
    for (const q of toAdd) {
      try {
        const res = await fetch(`/api/exams/${exam.id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question_id: q.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        newEntries.push({ ...data, question: q });
        added++;
      } catch {
        failed++;
      }
    }
    setExamQuestions((prev) => [...prev, ...newEntries]);
    if (added > 0) toast.success(`${added} questão(ões) adicionada(s).`);
    if (failed > 0) toast.error(`${failed} questão(ões) não puderam ser adicionadas.`);
    setBulkLoading(false);
  }

  // ── Bulk: Remover todas ──────────────────────────────────────────────────

  async function removeAll() {
    if (examQuestions.length === 0) return;
    setBulkLoading(true);
    let removed = 0;
    let failed = 0;
    for (const eq of examQuestions) {
      try {
        const res = await fetch(`/api/exams/${exam.id}/questions`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question_id: eq.question_id }),
        });
        if (!res.ok) throw new Error();
        removed++;
      } catch {
        failed++;
      }
    }
    if (removed > 0) {
      setExamQuestions([]);
      toast.success(`${removed} questão(ões) removida(s).`);
    }
    if (failed > 0) toast.error(`${failed} questão(ões) não puderam ser removidas.`);
    setBulkLoading(false);
  }

  // ── Ordenar por área ─────────────────────────────────────────────────────

  async function sortByArea() {
    // Stable sort: preserves the current relative order within each subject group,
    // so that after a shuffle, re-sorting by area keeps the shuffled intra-group order.
    const sorted = [...examQuestions].sort((a, b) => {
      const areaA = KNOWLEDGE_AREAS.indexOf(a.question.knowledge_area as KnowledgeArea);
      const areaB = KNOWLEDGE_AREAS.indexOf(b.question.knowledge_area as KnowledgeArea);
      if (areaA !== areaB) return areaA - areaB;
      const subjectCmp = (a.question.subject ?? "").localeCompare(b.question.subject ?? "");
      if (subjectCmp !== 0) return subjectCmp;
      // Preserve current relative order within the same group
      return a.position - b.position;
    });
    const reordered = sorted.map((item, i) => ({ ...item, position: i }));
    setExamQuestions(reordered);
    try {
      await fetch(`/api/exams/${exam.id}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positions: reordered.map(({ id, position }) => ({ id, position })),
        }),
      });
      toast.success("Questões ordenadas por área.");
    } catch {
      toast.error("Erro ao salvar ordem.");
    }
  }

  // ── Move individual ──────────────────────────────────────────────────────

  async function move(index: number, direction: "up" | "down") {
    const newList = [...examQuestions];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newList.length) return;
    [newList[index], newList[target]] = [newList[target], newList[index]];
    const reordered = newList.map((item, i) => ({ ...item, position: i }));
    setExamQuestions(reordered);
    try {
      await fetch(`/api/exams/${exam.id}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positions: reordered.map(({ id, position }) => ({ id, position })),
        }),
      });
    } catch {
      toast.error("Erro ao salvar ordem.");
    }
  }

  // ── Embaralhar questões ────────────────────────────────────────

  async function shuffleQuestions() {
    // Fisher-Yates shuffle
    const shuffled = [...examQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const reordered = shuffled.map((item, i) => ({ ...item, position: i }));
    setExamQuestions(reordered);
    try {
      await fetch(`/api/exams/${exam.id}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positions: reordered.map(({ id, position }) => ({ id, position })),
        }),
      });
      toast.success("Questões embaralhadas.");
    } catch {
      toast.error("Erro ao salvar ordem.");
    }
  }

  // ── Meta ─────────────────────────────────────────────────────────────────

  async function saveMeta() {
    setSaving(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
      });
      if (!res.ok) throw new Error();
      toast.success("Simulado atualizado.");
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const isReady = exam.status === "ready" || exam.status === "applied";

  async function handleStatusChange(newStatus: "draft" | "ready" | "editing" | "applied") {
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={cn("grid grid-cols-1 gap-8", isReady ? "max-w-4xl mx-auto" : "xl:grid-cols-2")}>
      {/* ── COLUNA ESQUERDA: Meta + Questões do simulado ── */}
      <div className="space-y-6">
        {/* Dados do simulado */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Dados do Simulado</h3>
            {isReady && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => handleStatusChange("editing")}
                disabled={isUpdatingStatus}
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar Dados
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Título</Label>
              <Input
                value={meta.title}
                onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
                disabled={isReady}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>
                Descrição{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                placeholder="Ex: Prova bimestral de Ciências da Natureza"
                value={meta.description}
                onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
                disabled={isReady}
              />
            </div>
            <div className="space-y-1">
              <Label>Série</Label>
              <Select value={meta.grade} onValueChange={(val) => setMeta((m) => ({ ...m, grade: val }))} disabled={isReady}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Turma</Label>
              <Input
                placeholder="Ex: 9º Ano B"
                value={meta.school_class}
                onChange={(e) => setMeta((m) => ({ ...m, school_class: e.target.value }))}
                disabled={isReady}
              />
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                placeholder="Ex: Junho/2025"
                value={meta.date_label}
                onChange={(e) => setMeta((m) => ({ ...m, date_label: e.target.value }))}
                disabled={isReady}
              />
            </div>
            <div className="space-y-1">
              <Label>Duração</Label>
              <Input
                placeholder="Ex: 3h"
                value={meta.duration}
                onChange={(e) => setMeta((m) => ({ ...m, duration: e.target.value }))}
                disabled={isReady}
              />
            </div>
            <div className="space-y-1">
              <Label>Ano Letivo</Label>
              <Input
                placeholder="Ex: 2025"
                value={meta.school_year}
                onChange={(e) => setMeta((m) => ({ ...m, school_year: e.target.value }))}
                disabled={isReady}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Instruções</Label>
              <Textarea
                placeholder="Leia atentamente..."
                className="min-h-[70px] resize-none"
                value={meta.instructions}
                onChange={(e) => setMeta((m) => ({ ...m, instructions: e.target.value }))}
                disabled={isReady}
              />
            </div>
          </div>
          {!isReady && (
            <Button onClick={saveMeta} disabled={saving} size="sm" className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Dados
            </Button>
          )}
        </div>

        {/* Questões selecionadas */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Questões do Simulado</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{examQuestions.length} questões</Badge>
              {isReady ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400"
                  onClick={() => handleStatusChange("editing")}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Pencil className="w-3.5 h-3.5" />
                  )}
                  Editar Questões
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleStatusChange("ready")}
                  disabled={isUpdatingStatus || examQuestions.length === 0}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ClipboardCheck className="w-3.5 h-3.5" />
                  )}
                  Concluir Simulado
                </Button>
              )}
              {exam.status === "ready" && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleStatusChange("applied")}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ClipboardCheck className="w-3.5 h-3.5" />
                  )}
                  Marcar como Aplicado
                </Button>
              )}
              {exam.status === "applied" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => handleStatusChange("ready")}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  Desmarcar Aplicado
                </Button>
              )}
            </div>
          </div>

          {/* Ações em massa — lado esquerdo */}
          {!isReady && examQuestions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-sm"
                onClick={sortByArea}
                disabled={bulkLoading}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Ordenar por área
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-sm"
                onClick={shuffleQuestions}
                disabled={bulkLoading}
              >
                <Shuffle className="w-3.5 h-3.5" />
                Embaralhar questões
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-sm text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={removeAll}
                disabled={bulkLoading}
              >
                {bulkLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Remover todas
              </Button>
            </div>
          )}

          {examQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma questão adicionada. Selecione do banco ao lado.
            </p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto space-y-2 pr-1">
              {examQuestions.map((eq, index) => (
                <div
                  key={eq.id}
                  className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 group cursor-pointer hover:bg-muted/60 transition-colors"
                  onClick={() => setViewingQuestion(eq.question)}
                >
                  <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{eq.question.subject}</p>
                      {eq.question.deleted_at && (
                        <Badge
                          variant="outline"
                          className="h-4 text-sm px-1.5 uppercase font-bold tracking-tighter border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400"
                        >
                          Excluída do Banco
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {eq.question.statement.slice(0, 70)}…
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setViewingQuestion(eq.question); }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); move(index, "up"); }}
                      disabled={isReady || index === 0}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); move(index, "down"); }}
                      disabled={isReady || index === examQuestions.length - 1}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeQuestion(eq.question_id); }}
                      disabled={isReady}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {examQuestions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => window.open(`/hub/simulados/${exam.id}/imprimir`, "_blank")}
            >
              Visualizar Impressão →
            </Button>
          )}
        </div>
      </div>

      {/* ── COLUNA DIREITA: Banco de questões ── */}
      {!isReady && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Busca */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar no enunciado..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
            </div>

            {/* Área */}
            <Select value={filterArea} onValueChange={handleAreaChange}>
              <SelectTrigger className="w-[155px]">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                {KNOWLEDGE_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {formatAreaSelect(area)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Disciplina — só aparece quando uma área está selecionada */}
            {filterArea !== "all" && availableSubjects.length > 0 && (
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Disciplina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as disciplinas</SelectItem>
                  {availableSubjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Nível */}
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                {LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pb-2">
            <Checkbox 
              id="hide-used-builder" 
              checked={filterHideUsed} 
              onCheckedChange={(checked) => setFilterHideUsed(!!checked)} 
            />
            <label
              htmlFor="hide-used-builder"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Ocultar questões já utilizadas em simulados
            </label>
          </div>

          <Separator />

          {loadingBank ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <p className="text-sm text-destructive font-medium mb-3">
                Erro ao carregar o banco de questões.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch?.()}>
                Tentar novamente
              </Button>
            </div>
          ) : bankQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma questão encontrada.
            </p>
          ) : (
            <>
              {/* Barra de ação em massa — lado direito */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {bankResultsLabel}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-sm"
                  onClick={addAllVisible}
                  disabled={bulkLoading}
                >
                  {bulkLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5" />
                  )}
                  Adicionar todas
                </Button>
              </div>

              <div className="grid gap-3 max-h-[700px] overflow-y-auto pr-1">
                {bankQuestions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    questionNumber={(bankPage - 1) * 15 + i + 1}
                    selectable
                    selected={selectedIds.has(q.id)}
                    onSelect={isReady ? undefined : addQuestion}
                    onEdit={(q) => setEditingQuestion(q)}
                  />
                ))}
              </div>

              {/* Pagination controls for sidebar */}
              {bankTotalPages > 1 && (
                <div className="flex items-center justify-between gap-2 mt-4 py-2 border-t sticky bottom-0 bg-white dark:bg-card">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => setBankPage(prev => Math.max(1, prev - 1))}
                    disabled={bankPage === 1 || loadingBank}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                  <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Página {bankPage} de {bankTotalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => setBankPage(prev => Math.min(bankTotalPages, prev + 1))}
                    disabled={bankPage === bankTotalPages || loadingBank}
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de edição de questão inline */}
      {editingQuestion && (
        <QuestionEditModal
          question={editingQuestion}
          open={!!editingQuestion}
          onOpenChange={(open) => {
            if (!open) {
              setEditingQuestion(null);
              refetch();
            }
          }}
        />
      )}

      {/* Modal de visualização — questões do lado esquerdo */}
      <Dialog open={!!viewingQuestion} onOpenChange={(open) => { if (!open) setViewingQuestion(null); }}>
        {viewingQuestion && (
          <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {formatAreaBadge(viewingQuestion.knowledge_area)}
                </span>
                <Badge variant="outline">{viewingQuestion.subject}</Badge>
                {viewingQuestion.difficulty && (
                  <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    <BarChart3 className="w-3 h-3 inline mr-0.5" />
                    {viewingQuestion.difficulty}
                  </span>
                )}
                {viewingQuestion.level && (
                  <Badge variant="secondary" className="text-sm">
                    <GraduationCap className="w-3 h-3 mr-0.5" />
                    {viewingQuestion.level}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="prose font-serif text-[15px] dark:prose-invert max-w-none leading-relaxed">
                <MarkdownRenderer>{viewingQuestion.statement}</MarkdownRenderer>
              </div>
              {viewingQuestion.image_url && (
                <Image
                  src={viewingQuestion.image_url}
                  alt="Imagem da questão"
                  width={500}
                  height={300}
                  unoptimized
                  className="max-h-56 object-contain rounded border"
                />
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {(["option_a", "option_b", "option_c", "option_d", "option_e"] as const).map((key, i) => {
                  const label = ["A", "B", "C", "D", "E"][i];
                  return (
                    <div key={key} className="flex items-start gap-2 text-sm">
                      <span
                        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                          viewingQuestion.answer === label
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {label}
                      </span>
                      <span className="flex-1 mt-[2px] font-serif text-[15px] break-words prose dark:prose-invert">
                        <MarkdownRenderer>{String(viewingQuestion[key])}</MarkdownRenderer>
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-sm text-muted-foreground border-t pt-2 flex items-center justify-between">
                <span>
                  Gabarito: <strong className="text-foreground">{viewingQuestion.answer}</strong>
                  {viewingQuestion.teacher_name && ` · Prof. ${viewingQuestion.teacher_name}`}
                </span>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
