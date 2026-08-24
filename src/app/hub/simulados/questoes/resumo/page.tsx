"use client";

import { useState, useMemo, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  BarChart3, 
  GraduationCap,
  Loader2,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useQuestions } from "@/hooks/useQuestions";
import { KNOWLEDGE_AREAS, LEVELS, DISCIPLINES_BY_AREA, formatAreaBadge, type KnowledgeArea, type Question } from "@/types/simulados";
import { DisciplineQuestionsModal } from "@/components/simulados/DisciplineQuestionsModal";

export default function ResumoQuestoesPage() {
  const router = useRouter();

  useLayoutEffect(() => {
    // Fallback: se o middleware falhar, o client-side também bloqueia
    const isLoggedIn = document.cookie.includes("teacher_logged_in=true");
    const hasSupabase = document.cookie.includes("sb_access_token");
    if (!isLoggedIn && !hasSupabase) {
      router.replace("/hub/simulados/professor");
    }
  }, [router]);

  const [filterArea, setFilterArea] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [showEJA, setShowEJA] = useState(false);
  const [hideUsed, setHideUsed] = useState(false);
  
  // State for question preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  
  // Custom fetch to get all questions without filters
  const { data: response, isLoading } = useQuestions({ pageSize: 0 });
  const allQuestions = useMemo(() => response?.data || [], [response]);

  const questions = useMemo(() => {
    if (!hideUsed) return allQuestions;
    return allQuestions.filter(q => !q.exam_questions || q.exam_questions.length === 0);
  }, [allQuestions, hideUsed]);

  const stats = useMemo(() => {
    // Current questions filtered by Level for the context of Area counts
    const filteredByLevel = filterLevel === "all"
      ? questions
      : questions.filter(q => q.level === filterLevel);

    // Further filtered by area for the specific level cards view
    const filteredByArea = filterArea === "all" 
      ? filteredByLevel 
      : filteredByLevel.filter(q => q.knowledge_area === filterArea);

    const byArea: Record<string, number> = {};
    const byLevel: Record<string, Record<string, number>> = {};
    const totalByLevel: Record<string, number> = {};

    // Initialize areas (using questions filtered by selected level)
    KNOWLEDGE_AREAS.forEach(area => {
      byArea[area] = filteredByLevel.filter(q => q.knowledge_area === area).length;
    });

    // Identify which disciplines should be shown based on the filter
    const disciplinesToInitialize = filterArea === "all"
      ? Array.from(new Set(Object.values(DISCIPLINES_BY_AREA).flat()))
      : DISCIPLINES_BY_AREA[filterArea as KnowledgeArea] || [];

    // Initialize levels and disciplines with 0
    LEVELS.forEach(level => {
      byLevel[level] = {};
      totalByLevel[level] = 0;
      
      disciplinesToInitialize.forEach(disc => {
        byLevel[level][disc] = 0;
      });
    });

    // Calculate level stats based on filtered data
    filteredByArea.forEach(q => {
      if (q.level) {
        totalByLevel[q.level] = (totalByLevel[q.level] || 0) + 1;
        if (q.subject) {
          // If the discipline was not in the initialized list (e.g. custom discipline from DB), initialize it
          if (byLevel[q.level][q.subject] === undefined) {
             byLevel[q.level][q.subject] = 0;
          }
          byLevel[q.level][q.subject] += 1;
        }
      }
    });

    return {
      filteredCount: filteredByArea.length,
      byArea,
      byLevel,
      totalByLevel,
      totalCount: allQuestions.length
    };
  }, [questions, allQuestions, filterArea, filterLevel]);

  const getDisciplinePriority = (subject: string) => {
    // Core subjects
    if (subject === 'Língua Portuguesa') return 1;
    if (subject === 'Matemática') return 2;
    if (subject === 'Biologia') return 3;
    if (subject === 'Física') return 4;
    if (subject === 'Química') return 5;
    if (subject === 'História') return 6;
    if (subject === 'Geografia') return 7;
    if (subject === 'Filosofia') return 8;
    if (subject === 'Sociologia') return 9;
    if (subject === 'Língua Inglesa') return 10;
    if (subject === 'Arte') return 11;
    if (subject === 'Educação Física') return 12;
    
    // Alternative/Special subjects
    if (subject === 'Projeto de Vida') return 50;
    if (subject.startsWith('Práticas de')) return 51;
    if (subject.startsWith('Temas de Aprofundamento')) return 52;
    if (subject.startsWith('PIT')) return 53;
    if (subject.startsWith('TAC')) return 54;
    
    return 30; // Others in the middle
  };

  const levelsToShow = useMemo(() => {
    const levels = LEVELS.filter(l => l !== 'EJA' || showEJA);
    if (filterLevel !== "all") {
      return levels.filter(l => l === filterLevel);
    }
    return levels;
  }, [showEJA, filterLevel]);

  const handleOpenPreview = (subject: string, level: string) => {
    const filtered = questions.filter(q => q.subject === subject && q.level === level);
    setPreviewQuestions(filtered);
    setSelectedDiscipline(subject);
    setSelectedLevel(level);
    setPreviewOpen(true);
  };

  const getAreaColor = (area: string) => {
    if (area.includes('Linguagens')) return 'bg-white/85 border-rose-200/70 text-rose-700 dark:bg-card dark:border-rose-900/50 dark:text-rose-400';
    if (area.includes('Humanas')) return 'bg-white/85 border-amber-200/70 text-amber-700 dark:bg-card dark:border-amber-900/50 dark:text-amber-400';
    if (area.includes('Natureza')) return 'bg-white/85 border-sky-200/70 text-sky-700 dark:bg-card dark:border-sky-900/50 dark:text-sky-400';
    if (area.includes('Matemática')) return 'bg-white/85 border-emerald-200/70 text-emerald-700 dark:bg-card dark:border-emerald-900/50 dark:text-emerald-400';
    return 'bg-white/85 border-slate-200/70 text-slate-700 dark:bg-card dark:border-slate-800 dark:text-slate-400';
  };

  const getLevelColor = (level: string) => {
    if (level.includes('1ª')) return 'bg-blue-50/40 border-blue-100/50 dark:bg-blue-950/20 dark:border-blue-900/30';
    if (level.includes('2ª')) return 'bg-emerald-50/40 border-emerald-100/50 dark:bg-emerald-950/20 dark:border-emerald-900/30';
    if (level.includes('3ª')) return 'bg-amber-50/40 border-amber-100/50 dark:bg-amber-950/20 dark:border-amber-900/30';
    return 'bg-purple-50/40 border-purple-100/50 dark:bg-purple-950/20 dark:border-purple-900/30';
  };

  const getLevelIconColor = (level: string) => {
    if (level.includes('1ª')) return 'text-blue-600 dark:text-blue-400';
    if (level.includes('2ª')) return 'text-emerald-600 dark:text-emerald-400';
    if (level.includes('3ª')) return 'text-amber-600 dark:text-amber-400';
    return 'text-purple-600 dark:text-purple-400';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-sm">Carregando dados do banco...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="-ml-2 h-8 text-muted-foreground hover:text-foreground"
              onClick={() => router.back()}
            >
              <div className="flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </div>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Resumo do Banco
              </h1>
              <p className="text-muted-foreground text-lg">
                Visão detalhada da distribuição por área, série e disciplina.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-end">
          <Button 
            variant={showEJA ? "default" : "outline"}
            size="sm"
            onClick={() => setShowEJA(!showEJA)}
            className="h-11 px-6 rounded-xl font-semibold shadow-sm transition-all"
          >
            {showEJA ? "Ocultar EJA" : "Incluir EJA"}
          </Button>

          <div className="flex items-center space-x-2 bg-card border rounded-xl h-11 px-4 shadow-sm transition-all hover:border-primary/30">
            <Checkbox 
              id="hide-used-questions" 
              checked={hideUsed} 
              onCheckedChange={(checked) => setHideUsed(!!checked)} 
            />
            <label
              htmlFor="hide-used-questions"
              className="text-xs font-semibold leading-none cursor-pointer text-muted-foreground select-none"
            >
              Mostrar apenas questões novas
            </label>
          </div>

          <div className="flex items-center gap-2 bg-card border rounded-xl p-1.5 px-3 shadow-sm h-11">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filtrar:</span>
              
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-[140px] h-8 border-none bg-transparent focus:ring-0 shadow-none font-semibold">
                  <SelectValue placeholder="Série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Séries</SelectItem>
                  {LEVELS.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="w-px h-4 bg-border mx-1" />

              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-[180px] h-8 border-none bg-transparent focus:ring-0 shadow-none font-semibold">
                  <SelectValue placeholder="Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Áreas</SelectItem>
                  {KNOWLEDGE_AREAS.map(area => (
                    <SelectItem key={area} value={area}>{formatAreaBadge(area)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Totais por Área - Horizontal Scroll on Mobile */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {KNOWLEDGE_AREAS.map(area => (
          <Card key={area} className={`relative group overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300 ${getAreaColor(area)}`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-current opacity-10" />
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-80 current-color">
                {formatAreaBadge(area)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-3xl font-black">{stats.byArea[area]}</div>
              <div className="text-[10px] opacity-70 mt-1 font-medium italic">questões cadastradas</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {levelsToShow.map((level, idx) => (
          <Card key={level} className={`flex flex-col border shadow-xl ring-1 ring-border/20 transition-all duration-500 overflow-hidden ${getLevelColor(level)}`}>
            <div className="h-1.5 w-full bg-primary/10" style={{ opacity: 0.3 + (idx * 0.2) }} />
            <CardHeader className=" bg-muted/10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-background rounded-lg shadow-sm">
                    <GraduationCap className={`w-5 h-5 ${getLevelIconColor(level)}`} />
                  </div>
                  <CardTitle className="text-xl font-bold">{level}</CardTitle>
                </div>
                <Badge variant="outline" className="font-bold bg-background/50 border-muted">
                  {stats.totalByLevel[level]} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="divide-y divide-border/10">
                {Object.entries(stats.byLevel[level])
                    .sort((a, b) => {
                      const priorityA = getDisciplinePriority(a[0]);
                      const priorityB = getDisciplinePriority(b[0]);
                      if (priorityA !== priorityB) return priorityA - priorityB;
                      return a[0].localeCompare(b[0]); // Alphabetical within same priority
                    })
                    .map(([subject, count], rowIdx) => (
                      <div 
                        key={subject} 
                        onClick={() => handleOpenPreview(subject, level)}
                        className={`flex justify-between items-center px-5 py-2 hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer transition-colors group ${rowIdx % 2 === 0 ? 'bg-background/20 dark:bg-white/5' : ''}`}
                      >
                        <span className="text-[13px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                          {subject}
                        </span>
                        <div className="flex items-center gap-2">
                          {count > 0 && (
                            <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              Ver questões
                            </span>
                          )}
                          <span className={`flex items-center justify-center text-sm font-black h-7 min-w-[1.75rem] px-2.5 rounded-full ${count > 0 ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground' : 'bg-muted/60 text-muted-foreground/40'} transition-all shadow-sm`}>
                            {count}
                          </span>
                        </div>
                      </div>
                    ))
                }
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Summary Footer */}
      <div className="flex flex-col items-center gap-4 pt-4 pb-8">
        <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
          <span>Total Geral no Banco: <strong className="text-foreground">{stats.totalCount}</strong></span>
          <div className="w-1 h-1 rounded-full bg-border" />
          <span>Exibindo: <strong className="text-primary">{stats.filteredCount}</strong></span>
        </div>
      </div>

      <DisciplineQuestionsModal 
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        questions={previewQuestions}
        discipline={selectedDiscipline}
        level={selectedLevel}
      />
    </div>
  );
}
