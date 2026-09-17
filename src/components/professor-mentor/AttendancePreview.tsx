"use client";

import { Button } from "@/components/ui/button";
import { Printer, PencilLine } from "lucide-react";
import { AttendanceSheet } from "@/components/professor-mentor/AttendanceSheet";
import type { FormState } from "@/types/professor-mentor";

interface AttendancePreviewProps {
  form: FormState;
  onEdit: () => void;
  onPrint: () => void;
}

export function AttendancePreview({ form, onEdit, onPrint }: AttendancePreviewProps) {
  return (
    <div className="space-y-6">
      <div className="no-print sticky top-0 z-20 -mx-4 rounded-md border-b border-slate-200 bg-white/95 px-4 py-6 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Pré-visualização das folhas</h2>
            <p className="text-xs mt-2 text-slate-600">
              Cada professor gera uma folha individual pronta para impressão em A4.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="gap-2 hover:text-slate-700 hover:bg-slate-200 bg-foreground border border-slate-400 text-slate-700" onClick={onEdit} type="button">
              <PencilLine className="h-4 w-4" />
              Editar Dados
            </Button>
            <Button variant="default" className="gap-2 hover:text-slate-700 bg-slate-200 hover:bg-slate-300 border border-slate-400 text-slate-700" onClick={onPrint} type="button">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {form.months.length > 0 ? (
          form.months.map((month, monthIndex) => (
            form.teachers.map((teacher, teacherIndex) => {
              const totalSheets = form.months.length * form.teachers.length;
              const sheetNumber = monthIndex * form.teachers.length + teacherIndex + 1;
              
              return (
                <div key={`${month}-${teacher.id}`} className="mentor-attendance-preview-page">
                  <div className="mb-2 no-print flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Folha {sheetNumber} de {totalSheets}
                    </span>
                    <span>{teacher.teacherName || "Professor(a) sem nome"}</span>
                  </div>
                  <AttendanceSheet form={form} teacher={teacher} month={month} />
                </div>
              );
            })
          ))
        ) : (
          <div className="no-print rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Selecione pelo menos um mês e adicione professores para gerar as folhas.
          </div>
        )}
      </div>
    </div>
  );
}