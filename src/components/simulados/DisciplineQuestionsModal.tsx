"use client";

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, X } from "lucide-react";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import "katex/dist/katex.min.css";
import { Question } from "@/types/simulados";
import { Button } from "@/components/ui/button";

interface DisciplineQuestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: Question[];
  discipline: string;
  level: string;
}

const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d", "option_e"] as const;
const OPTION_LABELS = ["A", "B", "C", "D", "E"] as const;

export function DisciplineQuestionsModal({ 
  open, 
  onOpenChange, 
  questions, 
  discipline, 
  level 
}: DisciplineQuestionsModalProps) {
  const sorted = [...questions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none sm:border bg-background shadow-2xl" showCloseButton={false}>
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30 dark:bg-slate-900/80 sticky top-0 z-20 backdrop-blur-md flex-row items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-primary font-bold">
              <BookOpen className="w-5 h-5" />
              <DialogTitle className="text-xl">{discipline}</DialogTitle>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <GraduationCap className="w-4 h-4" />
              <span className="text-sm font-medium">{level}</span>
              <Badge variant="secondary" className="ml-1 text-sm font-bold dark:bg-slate-800 dark:text-slate-300">
                {questions.length} {questions.length === 1 ? "questão" : "questões"}
              </Badge>
            </div>
          </div>

          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/50 dark:hover:bg-slate-800 transition-colors">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="p-6">
          {sorted.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground bg-muted/5 rounded-2xl border-2 border-dashed dark:border-slate-800">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-base font-medium">Nenhuma questão encontrada para esta categoria.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {sorted.map((q, i) => (
                <div key={q.id} className="relative pl-10 pr-4 animate-in fade-in slide-in-from-left-2 duration-300">
                  {/* Number indicator */}
                  <div className="absolute left-0 top-0 flex flex-col items-center h-full">
                    <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-sm font-black flex items-center justify-center shrink-0 border border-primary/20 dark:border-primary/40 z-10 transition-colors">
                      {i + 1}
                    </div>
                    {i !== sorted.length - 1 && (
                      <div className="w-px flex-1 bg-border/40 dark:bg-slate-800 my-2" />
                    )}
                  </div>

                  <div className="space-y-4 pb-8 border-b border-border/10 dark:border-slate-800 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {q.difficulty && (
                        <Badge variant="outline" className="text-sm font-bold uppercase tracking-wider h-5 dark:border-slate-700 dark:text-slate-400">
                          {q.difficulty}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                        Criada em {new Date(q.created_at).toLocaleDateString("pt-BR")}
                        {q.teacher_name && ` · ${q.teacher_name}`}
                      </span>
                    </div>

                    {/* Enunciado */}
                    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed">
                      <MarkdownRenderer>
                        {q.statement}
                      </MarkdownRenderer>
                    </div>

                    {/* Alternativas */}
                    <div className="grid grid-cols-1 gap-2">
                      {OPTION_KEYS.map((key, idx) => {
                        const isCorrect = q.answer === OPTION_LABELS[idx];
                        return (
                          <div
                            key={key}
                            className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                              isCorrect
                                ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500/10 shadow-sm"
                                : "bg-card border border-border/40 dark:border-slate-800 text-muted-foreground dark:text-slate-400 dark:hover:bg-slate-900/50"
                            }`}
                          >
                            <span
                              className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-sm font-black mt-0.5 ${
                                isCorrect
                                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                  : "bg-muted dark:bg-slate-800 text-muted-foreground/60 dark:text-slate-500 transition-colors"
                              }`}
                            >
                              {OPTION_LABELS[idx]}
                            </span>
                            <div className="flex-1 pt-0.5 leading-relaxed">
                              <MarkdownRenderer>
                                {String(q[key] || "")}
                              </MarkdownRenderer>
                            </div>
                            {isCorrect && (
                              <Badge variant="ghost" className="text-sm font-bold text-emerald-600 dark:text-emerald-400 p-0 h-auto">
                                ✓ GABARITO
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
