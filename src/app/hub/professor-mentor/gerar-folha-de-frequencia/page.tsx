"use client";

import { useEffect, useMemo, useState } from "react";
import { AttendanceForm } from "@/components/professor-mentor/attendance-form";
import { AttendancePreview } from "@/components/professor-mentor/attendance-preview";
import { createDefaultFormState, normalizeFormState, type FormState } from "@/types/professor-mentor";
import { School } from "lucide-react";

const STORAGE_KEY = "mentor-attendance-generator";

type ViewMode = "edit" | "preview";

function loadFormState(): FormState {
  if (typeof window === "undefined") {
    return createDefaultFormState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultFormState();
    }

    const parsed = JSON.parse(raw) as Partial<FormState>;
    return normalizeFormState(parsed);
  } catch {
    return createDefaultFormState();
  }
}

function validateForm(form: FormState) {
  if (!form.schoolName.trim()) {
    return "Informe o nome da escola.";
  }

  if (form.months.length === 0) {
    return "Selecione pelo menos um mês.";
  }

  if (!/^\d{4}$/.test(form.year.trim())) {
    return "Informe um ano com 4 dígitos.";
  }

  const hasTeacherIssue = form.teachers.some((teacher) =>
    !teacher.teacherName.trim() || !teacher.studentName.trim() || !teacher.mentoringClass.trim()
  );

  if (hasTeacherIssue) {
    return "Preencha todos os campos de cada professor antes de gerar as folhas.";
  }

  return null;
}

export default function MentorAttendanceGeneratorPage() {
  const [mode, setMode] = useState<ViewMode>("edit");
  const [form, setForm] = useState<FormState>(createDefaultFormState);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setForm(loadFormState());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch (_error) {
      void _error;
    }
  }, [form, isHydrated]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue === null) {
        return;
      }

      try {
        setForm(normalizeFormState(JSON.parse(event.newValue) as Partial<FormState>));
      } catch {
        setForm(createDefaultFormState());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const summary = useMemo(() => {
    const filledTeachers = form.teachers.filter(
      (teacher) => teacher.teacherName.trim() && teacher.studentName.trim() && teacher.mentoringClass.trim()
    ).length;

    return {
      total: form.teachers.length,
      filled: filledTeachers,
    };
  }, [form.teachers]);

  const handleGenerate = () => {
    const nextError = validateForm(form);
    setValidationError(nextError);

    if (!nextError) {
      setMode("preview");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-12">
        <div className="no-print mb-10">
          <div className="flex items-start justify-between gap-6 md:items-center">
            <div className="flex-1">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold uppercase tracking-wider text-emerald-700">
                <School className="h-4 w-4" />
                Programa Professor Mentor
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-950 md:text-2xl">
                Folha de Frequência
              </h1>
              <p className="mt-2 text-sm text-slate-600 md:text-base">
                Preencha os dados da escola e de cada professor para gerar as folhas de frequência individuais em A4.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 md:min-w-fit md:p-5">
              <div className="flex items-center justify-between gap-6 border-b border-slate-100 pb-3">
                <span className="text-slate-600">Modo</span>
                <span className="font-semibold text-slate-900">{mode === "edit" ? "Edição" : "Preview"}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-600">Professores</span>
                <span className="font-semibold text-slate-900">
                  {summary.filled}/{summary.total}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          {mode === "edit" ? (
            <AttendanceForm
            value={form}
            onChange={(nextForm) => {
              setValidationError(null);
              setForm(nextForm);
            }}
            onGenerate={handleGenerate}
            validationError={validationError}
          />
          ) : (
            <AttendancePreview
              form={form}
              onEdit={() => setMode("edit")}
              onPrint={handlePrint}
            />
          )}
        </div>
      </div>

      <style jsx global>{`
        .mentor-attendance-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08);
          padding: 12mm;
          break-after: page;
          page-break-after: always;
        }

        .mentor-attendance-preview-page:last-child .mentor-attendance-sheet {
          break-after: auto;
          page-break-after: auto;
        }

        .mentor-attendance-table tbody tr {
          height: 7.2mm;
        }

        @media print {
          @page {
            margin: 0;
            margin-left: 10mm;
          }

          html,
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }

          .no-print {
            display: none !important;
          }

          .mentor-attendance-sheet {
            width: auto;
            min-height: auto;
            margin: 0;
            padding: 5mm;
            box-shadow: none;
            break-after: page;
            page-break-after: always;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .mentor-attendance-preview-page:last-child .mentor-attendance-sheet {
            break-after: auto;
            page-break-after: auto;
          }

          .mentor-attendance-preview-page {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .mentor-attendance-table thead {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </main>
  );
}