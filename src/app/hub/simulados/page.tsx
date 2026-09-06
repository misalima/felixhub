"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Plus, Printer, Pencil, Trash2, Loader2, BookOpen, FileCheck2, Copy, Filter, FileText, Users, CheckCircle2, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FilterX } from "lucide-react";
import { 
  useExams, 
  useCreateExam, 
  useDeleteExam, 
  useDuplicateExam,
  useUpdateExamStatus,
  useExamFilters 
} from "@/hooks/useExams";
import { EXAM_STATUS_LABELS, EXAM_STATUS_BADGE_VARIANT, KNOWLEDGE_AREAS, formatAreaSelect, LEVELS, CreateExamPayload, Level } from "@/types/simulados";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/hub/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SimuladosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [titleError, setTitleError] = useState(false);
  
  // URL-driven state (Source of Truth)
  const filterSearch = searchParams.get("q") || "";
  const filterArea = searchParams.get("area") || "all";
  const filterGrade = searchParams.get("grade") || "all";
  const filterClass = searchParams.get("class") || "all";
  const filterStatus = searchParams.get("status") || "all";
  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);

  // Memory for totals to avoid layout jumps
  const [lastTotal, setLastTotal] = useState<number | null>(null);
  const [lastTotalPages, setLastTotalPages] = useState<number | null>(null);

  // Local state for the input field to avoid lag, but debounced to URL
  const [searchInput, setSearchInput] = useState(filterSearch);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Function to update URL params
  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "all" || value === "" || value === "false") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  // Update URL whenever debounced search changes
  useEffect(() => {
    if (debouncedSearch !== filterSearch) {
      updateFilters({ q: debouncedSearch, page: "1" });
    }
  }, [debouncedSearch, filterSearch, updateFilters]);

  const [newExam, setNewExam] = useState({
    title: "",
    description: "",
    grade: "",
    school_class: "",
    date_label: "",
    duration: "",
    school_year: "",
    instructions: "Leia atentamente cada questão. Assinale apenas uma alternativa. Não é permitido o uso de corretivo.",
  });

  const { data: response, isLoading: loading } = useExams({
    search: filterSearch || null,
    area: filterArea !== "all" ? filterArea : null,
    grade: filterGrade !== "all" ? filterGrade : null,
    school_class: filterClass !== "all" ? filterClass : null,
    status: filterStatus,
    page: currentPage,
    pageSize: 12,
  });

  const exams = response?.data || [];
  const totalExams = response?.total ?? lastTotal ?? 0;
  const totalPages = response ? Math.ceil(response.total / 12) : (lastTotalPages ?? 0);

  // Update persistent totals
  useEffect(() => {
    if (response) {
      setLastTotal(response.total);
      setLastTotalPages(Math.ceil(response.total / 12));
    }
  }, [response]);
  
  const { data: filterOptions } = useExamFilters();
  const { mutateAsync: createExamMutation, isPending: creating } = useCreateExam();
  const { mutateAsync: deleteExamMutation } = useDeleteExam();
  const { mutateAsync: duplicateExamMutation } = useDuplicateExam();
  const { mutateAsync: updateStatusMutation } = useUpdateExamStatus();
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  async function createExam() {
    if (!newExam.title.trim()) {
      setTitleError(true);
      toast.error("O título é obrigatório.");
      return;
    }
    
    try {
      const payload: CreateExamPayload = {
        ...newExam,
        grade: (newExam.grade as Level) || null,
      };
      const data = await createExamMutation(payload);
      setDialogOpen(false);
      toast.success("Simulado criado!");
      router.push(`/hub/simulados/${data.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar.";
      toast.error(message);
    }
  }

  async function deleteExam(id: string) {
    try {
      await deleteExamMutation(id);
      toast.success("Simulado excluído.");
    } catch {
      toast.error("Erro ao excluir.");
    }
  }

  async function duplicateExam(id: string) {
    try {
      setDuplicatingId(id);
      await duplicateExamMutation(id);
      toast.success("Simulado duplicado com sucesso.");
    } catch {
      toast.error("Erro ao duplicar o simulado.");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function toggleApplied(id: string, currentStatus: string) {
    try {
      setStatusUpdatingId(id);
      const newStatus = currentStatus === 'applied' ? 'ready' : 'applied';
      await updateStatusMutation({ id, status: newStatus });
      toast.success(newStatus === 'applied' ? "Simulado marcado como aplicado!" : "Simulado revertido para pronto.");
    } catch {
      toast.error("Erro ao atualizar status do simulado.");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mx-auto min-h-full max-w-6xl p-4 py-8 sm:p-6 sm:py-10">
      <PageHeader
        icon={FileText}
        eyebrow="Avaliações"
        title="Simulados"
        description="Crie, organize e prepare simulados para impressão."
        actions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 active:scale-95 transition-transform">
              <Plus className="w-4 h-4" />
              Novo Simulado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Simulado</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>Título *</Label>
                <Input
                  placeholder="Ex: Simulado ENEM — Ciências da Natureza"
                  value={newExam.title}
                  onChange={(e) => {
                    setNewExam((m) => ({ ...m, title: e.target.value }));
                    if (e.target.value.trim()) setTitleError(false);
                  }}
                  className={titleError ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {titleError && (
                  <p className="text-sm text-destructive">O título é obrigatório.</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  placeholder="Ex: Prova bimestral de Ciências da Natureza"
                  value={newExam.description}
                  onChange={(e) => setNewExam((m) => ({ ...m, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Série</Label>
                  <Select value={newExam.grade} onValueChange={(val) => setNewExam((m) => ({ ...m, grade: val }))}>
                    <SelectTrigger className="h-10 bg-white dark:bg-card">
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
                    placeholder="9º Ano B"
                    value={newExam.school_class}
                    onChange={(e) => setNewExam((m) => ({ ...m, school_class: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data</Label>
                  <Input
                    placeholder="Junho/2025"
                    value={newExam.date_label}
                    onChange={(e) => setNewExam((m) => ({ ...m, date_label: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Duração</Label>
                  <Input
                    placeholder="3h"
                    value={newExam.duration}
                    onChange={(e) => setNewExam((m) => ({ ...m, duration: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ano Letivo</Label>
                  <Input
                    placeholder="2025"
                    value={newExam.school_year}
                    onChange={(e) => setNewExam((m) => ({ ...m, school_year: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Instruções</Label>
                <Textarea
                  className="min-h-[70px] resize-none text-sm"
                  value={newExam.instructions}
                  onChange={(e) => setNewExam((m) => ({ ...m, instructions: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createExam} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar Simulado
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        }
      />

      {/* Barra de Filtros Unificada */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/20 dark:bg-muted/5 rounded-2xl border border-border/40 backdrop-blur-sm shadow-sm mb-3">
        {/* Busca com Contador Integrado */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-9 pr-24 h-9 rounded-xl bg-white dark:bg-card border-none focus-visible:ring-1 focus-visible:ring-primary/20 shadow-none text-sm transition-all"
            placeholder="Pesquisar simulados..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-muted/50 rounded-md border border-border/40">
            <span className="text-sm font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">
              {loading && !response ? "..." : `${totalExams} Itens`}
            </span>
          </div>
        </div>

        <div className="hidden sm:block w-px h-5 bg-border/60 mx-1" />

        {/* Filtros em Pílulas */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={filterArea} onValueChange={(v) => updateFilters({ area: v, page: "1" })}>
            <SelectTrigger className="h-9 w-fit min-w-[140px] rounded-xl bg-white dark:bg-card border-border/40 hover:bg-muted/50 transition-colors text-sm font-medium gap-2">
              <Filter className="w-3 h-3 text-primary/60" />
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Áreas</SelectItem>
              {KNOWLEDGE_AREAS.map((area) => (
                <SelectItem key={area} value={area} className="text-sm">
                  {formatAreaSelect(area)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterGrade} onValueChange={(v) => updateFilters({ grade: v, page: "1" })}>
            <SelectTrigger className="h-9 w-fit min-w-[120px] rounded-xl bg-white dark:bg-card border-border/40 hover:bg-muted/50 transition-colors text-sm font-medium gap-2">
              <BookOpen className="w-3 h-3 text-primary/60" />
              <SelectValue placeholder="Série" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Séries</SelectItem>
              {LEVELS.map((level) => (
                <SelectItem key={level} value={level} className="text-sm">
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterClass} onValueChange={(v) => updateFilters({ class: v, page: "1" })}>
            <SelectTrigger className="h-9 w-fit min-w-[120px] rounded-xl bg-white dark:bg-card border-border/40 hover:bg-muted/50 transition-colors text-sm font-medium gap-2">
              <Users className="w-3 h-3 text-primary/60" />
              <SelectValue placeholder="Turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Turmas</SelectItem>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(filterOptions as any)?.school_classes?.map((c: string) => (
                <SelectItem key={c} value={c} className="text-sm">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(v) => updateFilters({ status: v, page: "1" })}>
            <SelectTrigger className="h-9 w-fit min-w-[130px] rounded-xl bg-white dark:bg-card border-border/40 hover:bg-muted/50 transition-colors text-sm font-medium gap-2">
              <CheckCircle2 className="w-3 h-3 text-primary/60" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_applied">Não Aplicados</SelectItem>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="applied">Aplicados</SelectItem>
              <SelectItem value="ready">Prontos</SelectItem>
              <SelectItem value="editing">Em Edição</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Paginação Superior Independente */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-1 p-1 bg-muted/20 dark:bg-muted/5 rounded-2xl border border-border/40 backdrop-blur-sm shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => updateFilters({ page: "1" })}
              disabled={currentPage === 1 || loading}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => updateFilters({ page: Math.max(1, currentPage - 1).toString() })}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <div className="flex items-center gap-1.5 px-4 border-x border-border/40 mx-1">
               <span className="text-sm text-muted-foreground uppercase font-black tracking-widest mr-2">Página</span>
               <span className="text-sm font-black text-foreground">{currentPage}</span>
               <span className="text-sm text-muted-foreground uppercase font-black">/</span>
               <span className="text-sm text-muted-foreground font-medium">{totalPages}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => updateFilters({ page: Math.min(totalPages, currentPage + 1).toString() })}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => updateFilters({ page: totalPages.toString() })}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Lista de simulados */}
      <div className="relative min-h-[400px]">
        {loading && (
          <div className="space-y-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl border border-border/40 bg-muted/20" />
            ))}
          </div>
        )}

        {!loading && exams.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed rounded-3xl bg-muted/5 border-muted-foreground/20">
            <div className="bg-white dark:bg-card w-16 h-16 rounded-2xl shadow-sm border border-border/40 flex items-center justify-center mx-auto mb-4">
              <FilterX className="w-8 h-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Nenhum simulado encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-[320px] mx-auto">
              Tente ajustar seus filtros ou busca para encontrar o que procura.
            </p>
            {(filterSearch || filterStatus !== 'all' || filterArea !== 'all' || filterGrade !== 'all' || filterClass !== 'all') && (
               <Button variant="link" className="mt-4 text-primary font-bold" onClick={() => router.push(pathname)}>
                 Limpar todos os filtros
               </Button>
            )}
          </div>
        ) : (
          <div className={`space-y-4 transition-all duration-300 ${loading ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>
            {exams.map((exam) => (
              <div
                key={exam.id}
                onClick={() => router.push(`/hub/simulados/${exam.id}`)}
                className="group flex flex-col cursor-pointer rounded-2xl border border-border/40 bg-white dark:bg-[#0f111a]/60 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30 overflow-hidden"
              >
              <div className="p-5 flex-1 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-col gap-2">
                      {exam.grade && (
                        <span className="text-sm font-black uppercase tracking-[0.15em] text-primary/80 bg-primary/5 w-fit px-2 py-0.5 rounded">
                          {exam.grade}
                        </span>
                      )}
                      <h3 className="text-xl font-extrabold text-foreground leading-tight group-hover:text-primary transition-colors">
                        {exam.title}
                      </h3>
                    </div>
                    {exam.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {exam.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={EXAM_STATUS_BADGE_VARIANT[exam.status]} className="shrink-0 shadow-sm px-2.5 py-0.5 border-none">
                    {EXAM_STATUS_LABELS[exam.status]}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                    <BookOpen className="w-3.5 h-3.5 text-primary/60" />
                    <span className="font-medium text-foreground/80">{exam.questions_count ?? 0}</span> questões
                  </div>
                  {exam.school_class && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                      <Users className="w-3.5 h-3.5 text-primary/60" />
                      <span className="truncate">
                        Turma: <span className="font-semibold text-foreground/80">{exam.school_class}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                    <FileCheck2 className="w-3.5 h-3.5 text-primary/60" />
                    <span>Criado em {new Date(exam.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-muted/40 dark:bg-black/30 border-t border-border/40 flex flex-wrap items-center gap-2 justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 px-4 rounded-lg bg-white dark:bg-background hover:bg-primary/5 active:scale-95 transition-all text-sm font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/hub/simulados/${exam.id}/imprimir`, "_blank");
                      }}
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir Caderno</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Visualizar para impressão</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 px-4 rounded-lg border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/20 dark:border-violet-900/50 dark:text-violet-400 active:scale-95 transition-all text-sm font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/hub/simulados/${exam.id}/folha-resposta`, "_blank");
                      }}
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>Gabarito/Respostas</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Gerar folha de respostas</TooltipContent>
                </Tooltip>

                <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 gap-2 px-3 hover:bg-primary/5 active:scale-95 transition-all" 
                        onClick={(e) => e.stopPropagation()} 
                        asChild
                      >
                        <Link href={`/hub/simulados/${exam.id}`}>
                          <Pencil className="w-4 h-4" />
                          <span className="hidden sm:inline text-sm font-medium">Editar</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar configurações</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateExam(exam.id);
                        }}
                        disabled={duplicatingId === exam.id}
                      >
                        {duplicatingId === exam.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Duplicar</TooltipContent>
                  </Tooltip>

                  {(exam.status === 'ready' || exam.status === 'applied') && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-9 w-9 active:scale-95 transition-all",
                            exam.status === 'applied' 
                              ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20" 
                              : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleApplied(exam.id, exam.status);
                          }}
                          disabled={statusUpdatingId === exam.id}
                        >
                          {statusUpdatingId === exam.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : exam.status === 'applied' ? (
                            <RotateCcw className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {exam.status === 'applied' ? "Desmarcar como aplicado" : "Marcar como aplicado"}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Excluir permanentemente</TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir simulado?</AlertDialogTitle>
                        <AlertDialogDescription>
                           O simulado &quot;{exam.title}&quot; será removido. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={(e) => { e.stopPropagation(); deleteExam(exam.id); }}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-3 mt-12 pb-16">
          <Button
            variant="outline"
            className="rounded-xl h-10 w-10 p-0 hover:bg-primary/5 hover:text-primary border-border/60"
            onClick={() => updateFilters({ page: "1" })}
            disabled={currentPage === 1 || loading}
            title="Primeira página"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            className="rounded-xl h-10 w-10 p-0 hover:bg-primary/5 hover:text-primary border-border/60"
            onClick={() => updateFilters({ page: Math.max(1, currentPage - 1).toString() })}
            disabled={currentPage === 1 || loading}
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-3 px-6 h-10 rounded-xl border border-border/60 bg-white dark:bg-card shadow-sm">
            <span className="text-sm font-bold text-foreground">Página {currentPage}</span>
            <span className="text-sm text-muted-foreground font-medium">de {totalPages}</span>
          </div>

          <Button
            variant="outline"
            className="rounded-xl h-10 w-10 p-0 hover:bg-primary/5 hover:text-primary border-border/60"
            onClick={() => updateFilters({ page: Math.min(totalPages, currentPage + 1).toString() })}
            disabled={currentPage === totalPages || loading}
            title="Próxima página"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            className="rounded-xl h-10 w-10 p-0 hover:bg-primary/5 hover:text-primary border-border/60"
            onClick={() => updateFilters({ page: totalPages.toString() })}
            disabled={currentPage === totalPages || loading}
            title="Última página"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
