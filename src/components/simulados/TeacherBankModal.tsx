"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuestions } from "@/hooks/useQuestions";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface TeacherBankModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d", "option_e"] as const;
const OPTION_LABELS = ["A", "B", "C", "D", "E"] as const;

export function TeacherBankModal({ open, onOpenChange }: TeacherBankModalProps) {
  const [hideUsed, setHideUsed] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data: response, isLoading } = useQuestions({ 
    hideUsed, 
    page, 
    pageSize 
  });

  const questions = response?.data || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    if (open) setPage(1);
  }, [open, hideUsed]);

  const sorted = [...questions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Banco de Questões
            {!isLoading && (
              <Badge variant="secondary" className="ml-1 text-sm font-normal">
                {total} {total === 1 ? "questão" : "questões"}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center space-x-2 py-2 px-1">
          <Checkbox 
            id="hide-used-bank" 
            checked={hideUsed} 
            onCheckedChange={(checked) => setHideUsed(!!checked)} 
          />
          <label
            htmlFor="hide-used-bank"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Ocultar questões já utilizadas em simulados
          </label>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma questão no banco ainda.</p>
          </div>
        ) : (
          <ol className="space-y-4 mt-1">
            {sorted.map((q, i) => (
              <li key={q.id} className="rounded-lg border bg-muted/20 overflow-hidden">
                {/* Cabeçalho da questão */}
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b flex-wrap">
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                    {(page - 1) * pageSize + i + 1}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{q.subject}</span>
                  {q.difficulty && (
                    <Badge variant="outline" className="text-sm py-0">{q.difficulty}</Badge>
                  )}
                  {q.level && (
                    <Badge variant="secondary" className="text-sm py-0">{q.level}</Badge>
                  )}
                  <span className="ml-auto text-sm text-muted-foreground">
                    {new Date(q.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                    {q.teacher_name && ` · ${q.teacher_name}`}
                  </span>
                </div>

                {/* Enunciado */}
                <div className="px-4 pt-3 pb-2 prose prose-sm dark:prose-invert max-w-none text-sm">
                  <MarkdownRenderer>
                    {q.statement}
                  </MarkdownRenderer>
                </div>

                {/* Alternativas com gabarito destacado */}
                <div className="px-4 pb-3 space-y-1.5">
                  {OPTION_KEYS.map((key, idx) => {
                    const isCorrect = q.answer === OPTION_LABELS[idx];
                    return (
                      <div
                        key={key}
                        className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm ${
                          isCorrect
                            ? "bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800"
                            : "bg-background"
                        }`}
                      >
                        <span
                          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 ${
                            isCorrect
                              ? "bg-green-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {OPTION_LABELS[idx]}
                        </span>
                        <span className={`flex-1 prose prose-sm dark:prose-invert max-w-none ${isCorrect ? "font-medium text-green-800 dark:text-green-200" : ""}`}>
                          <MarkdownRenderer>
                            {String(q[key])}
                          </MarkdownRenderer>
                        </span>
                        {isCorrect && (
                          <span className="text-sm text-green-600 dark:text-green-400 font-semibold shrink-0 mt-0.5">
                            ✓ Gabarito
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4 border-t mt-4">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm font-medium px-2">
              Página {page} de {totalPages}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
