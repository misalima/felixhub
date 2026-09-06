"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { QuestionCard } from "@/components/simulados/QuestionCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Database, BarChart3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FilterX } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { KNOWLEDGE_AREAS, DISCIPLINES_BY_AREA, DIFFICULTIES, LEVELS, type KnowledgeArea, formatAreaSelect } from "@/types/simulados";
import { useQuestions } from "@/hooks/useQuestions";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/hub/PageHeader";

export default function QuestoesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // URL-driven state (Source of Truth)
  const filterArea = searchParams.get("area") || "all";
  const filterSubject = searchParams.get("subject") || "all";
  const filterDifficulty = searchParams.get("difficulty") || "all";
  const filterLevel = searchParams.get("level") || "all";
  const filterSearch = searchParams.get("q") || "";
  const filterHideUsed = searchParams.get("hideUsed") === "true";
  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  
  // Keep track of total questions even when loading to avoid layout jumps
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

  const { data: response, isLoading: loading, isError } = useQuestions({
    area: filterArea !== "all" ? filterArea : null,
    subject: filterSubject !== "all" ? filterSubject : null,
    difficulty: filterDifficulty !== "all" ? filterDifficulty : null,
    level: filterLevel !== "all" ? filterLevel : null,
    search: filterSearch || null,
    hideUsed: filterHideUsed,
    page: currentPage,
    pageSize: 21,
  });

  const questions = response?.data || [];
  const totalQuestions = response?.total ?? lastTotal ?? 0;
  const totalPages = response ? Math.ceil(response.total / 21) : (lastTotalPages ?? 0);

  // Update persistent totals
  useEffect(() => {
    if (response) {
      setLastTotal(response.total);
      setLastTotalPages(Math.ceil(response.total / 21));
    }
  }, [response]);

  useEffect(() => {
    if (isError) {
      toast.error("Erro ao carregar questões.");
    }
  }, [isError]);

  function handleAreaChange(value: string) {
    updateFilters({ 
      area: value, 
      subject: "all", 
      page: "1" 
    });
  }

  // Get available disciplines based on selected area
  const availableDisciplines =
    filterArea && filterArea !== "all"
      ? DISCIPLINES_BY_AREA[filterArea as KnowledgeArea] ?? []
      : Object.values(DISCIPLINES_BY_AREA).flat().filter((v, i, a) => a.indexOf(v) === i);

  function handleDelete(_id: string) {
    // The visual deletion is now handled by optimistic UI or React Query invalidation in QuestionCard
  }

  return (
    <div className="mx-auto min-h-full max-w-6xl p-4 py-8 sm:p-6 sm:py-10">
      <PageHeader
        icon={Database}
        eyebrow="Acervo pedagógico"
        title="Banco de questões"
        description="Visualize, filtre e organize as questões enviadas pelos professores."
        actions={
        <Button asChild variant="outline" className="rounded-xl bg-white/70 shadow-sm dark:bg-slate-900/70">
          <Link href="/hub/simulados/questoes/resumo">
            <BarChart3 className="w-4 h-4" />
            Ver Resumo
          </Link>
        </Button>
        }
      />

      {/* Filtros */}
      <div className="space-y-3 mb-6">
        {/* Linha 1: Busca + Área */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar enunciado ou conteúdo..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select value={filterArea} onValueChange={handleAreaChange}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Filtrar por área" />
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
        </div>

        {/* Linha 2: Disciplina + Dificuldade + Nível + Counter */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterSubject} onValueChange={(v) => updateFilters({ subject: v, page: "1" })}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as disciplinas</SelectItem>
              {availableDisciplines.map((disc) => (
                <SelectItem key={disc} value={disc}>
                  {disc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterDifficulty} onValueChange={(v) => updateFilters({ difficulty: v, page: "1" })}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Dificuldade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterLevel} onValueChange={(v) => updateFilters({ level: v, page: "1" })}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden md:flex items-center px-3 py-1.5 bg-muted/40 rounded-full border border-border/40">
              <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
                {loading && !response ? "Buscando..." : `${totalQuestions} questões encontradas`}
              </span>
            </div>

            {totalPages > 1 && (
              <nav className="flex items-center gap-1 p-1 bg-white dark:bg-[#0f111a]/60 backdrop-blur-sm border border-border/60 rounded-xl shadow-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => updateFilters({ page: "1" })}
                  disabled={currentPage === 1 || loading}
                  title="Primeira página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => updateFilters({ page: Math.max(1, currentPage - 1).toString() })}
                  disabled={currentPage === 1 || loading}
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-3 min-w-[70px] text-center">
                   <span className="text-sm font-bold text-foreground">{currentPage}</span>
                   <span className="text-sm text-muted-foreground mx-1">/</span>
                   <span className="text-sm text-muted-foreground">{totalPages}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => updateFilters({ page: Math.min(totalPages, currentPage + 1).toString() })}
                  disabled={currentPage === totalPages || loading}
                  title="Próxima"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => updateFilters({ page: totalPages.toString() })}
                  disabled={currentPage === totalPages || loading}
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </nav>
            )}
          </div>
        </div>

        {/* Linha 3: Ocultar usadas */}
        <div className="flex items-center space-x-2 bg-white dark:bg-card h-10 px-4 rounded-xl border border-border/40 w-fit mt-1 shadow-sm transition-all hover:border-primary/30">
          <Checkbox 
            id="hide-used-questions" 
            checked={filterHideUsed} 
            onCheckedChange={(checked) => updateFilters({ hideUsed: checked ? "true" : "false", page: "1" })} 
          />
          <label
            htmlFor="hide-used-questions"
            className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-muted-foreground select-none"
          >
            Ocultar questões já utilizadas em simulados
          </label>
        </div>
      </div>

      {/* Grid Content */}
      <div className="relative min-h-[400px]">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[280px] rounded-2xl border border-border/40 bg-muted/20" />
            ))}
          </div>
        )}

        {!loading && questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-border/40 rounded-3xl bg-muted/5">
            <div className="p-4 bg-muted/20 rounded-full mb-4">
              <FilterX className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-foreground font-bold text-lg">Nenhuma questão encontrada</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[300px] text-center">
              Tente ajustar os filtros ou termo de busca para encontrar o que procura.
            </p>
            {(filterSearch || filterArea !== "all" || filterSubject !== "all") && (
               <Button 
                 variant="link" 
                 className="mt-4 text-primary font-bold"
                 onClick={() => router.push(pathname)}
               >
                 Limpar todos os filtros
               </Button>
            )}
          </div>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-300 ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                questionNumber={(currentPage - 1) * 21 + i + 1}
                onDelete={handleDelete}
              />
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
  );
}
