"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MONTH_OPTIONS, createMentorTeacher, type FormState } from "@/types/professor-mentor";
import { ImagePlus, Plus, Trash2, X, Check, ChevronDown, FileText } from "lucide-react";
import { useId, useState, useRef, useEffect } from "react";
import Image from "next/image";

interface AttendanceFormProps {
  value: FormState;
  onChange: (value: FormState) => void;
  onGenerate: () => void;
  validationError: string | null;
}

const CHIP_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300' },
  { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-300' },
  { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300' },
  { bg: 'bg-pink-100', text: 'text-pink-900', border: 'border-pink-300' },
  { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-300' },
  { bg: 'bg-cyan-100', text: 'text-cyan-900', border: 'border-cyan-300' },
  { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },
  { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-300' },
  { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300' },
  { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300' },
  { bg: 'bg-teal-100', text: 'text-teal-900', border: 'border-teal-300' },
  { bg: 'bg-lime-100', text: 'text-lime-900', border: 'border-lime-300' },
];

function getMonthColor(monthValue: string): typeof CHIP_COLORS[0] {
  const monthIndex = parseInt(monthValue, 10) - 1;
  return CHIP_COLORS[monthIndex % CHIP_COLORS.length];
}

function getMonthLabel(monthValue: string): string {
  return MONTH_OPTIONS.find((m) => m.value === monthValue)?.label || monthValue;
}

function MonthMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (months: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMonth = (monthValue: string) => {
    if (selected.includes(monthValue)) {
      onChange(selected.filter((m) => m !== monthValue));
    } else {
      onChange([...selected, monthValue].sort());
    }
  };

  const removeMonth = (monthValue: string) => {
    onChange(selected.filter((m) => m !== monthValue));
  };

  return (
    <div className="space-y-3" ref={ref}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition hover:border-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
        >
          <span>{selected.length > 0 ? `${selected.length} mês(es) selecionado(s)` : "Selecione meses"}</span>
          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-slate-300 bg-white shadow-lg">
            <div className="max-h-64 overflow-y-auto">
              {MONTH_OPTIONS.map((month) => {
                const isSelected = selected.includes(month.value);
                return (
                  <button
                    key={month.value}
                    type="button"
                    onClick={() => toggleMonth(month.value)}
                    className={`w-full px-3 py-2.5 text-left text-sm transition ${
                      isSelected
                        ? "bg-blue-100 text-blue-900 font-medium"
                        : "text-slate-900 hover:bg-slate-50"
                    } flex items-center justify-between`}
                  >
                    <span>{month.label}</span>
                    {isSelected && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((monthValue) => {
            const colors = getMonthColor(monthValue);
            const label = getMonthLabel(monthValue);
            return (
              <div
                key={monthValue}
                className={`inline-flex items-center gap-1.5 rounded-full border ${colors.bg} ${colors.border} ${colors.text} px-2.5 py-1 text-sm font-medium`}
              >
                {label}
                <button
                  type="button"
                  onClick={() => removeMonth(monthValue)}
                  className="ml-0.5 rounded-full hover:opacity-70"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AttendanceForm({ value, onChange, onGenerate, validationError }: AttendanceFormProps) {
  const logoInputId = useId();

  const handleClearAll = () => {
    if (confirm("Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.")) {
      onChange({
        schoolName: "",
        schoolAddress: "",
        schoolLogo: "",
        months: [],
        year: new Date().getFullYear().toString(),
        coordinatorName: "",
        teachers: [createMentorTeacher()],
      });
    }
  };

  const updateField = <K extends keyof FormState>(field: K, nextValue: FormState[K]) => {
    onChange({ ...value, [field]: nextValue });
  };

  const updateTeacher = (teacherId: string, field: "teacherName" | "studentName" | "mentoringClass", nextValue: string) => {
    onChange({
      ...value,
      teachers: value.teachers.map((teacher) =>
        teacher.id === teacherId ? { ...teacher, [field]: nextValue } : teacher
      ),
    });
  };

  const addTeacher = () => {
    onChange({
      ...value,
      teachers: [...value.teachers, createMentorTeacher()],
    });
  };

  const removeTeacher = (teacherId: string) => {
    const nextTeachers = value.teachers.filter((teacher) => teacher.id !== teacherId);
    onChange({
      ...value,
      teachers: nextTeachers.length > 0 ? nextTeachers : [createMentorTeacher()],
    });
  };

  const handleLogoUpload = (file: File | null) => {
    if (!file) {
      updateField("schoolLogo", "");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("schoolLogo", typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  };

  const hasAnyFilledTeacher = value.teachers.some(
    (teacher) => teacher.teacherName.trim() && teacher.studentName.trim() && teacher.mentoringClass.trim()
  );

  return (
    <Card className="border border-slate-300 bg-white shadow-md">
      <CardHeader className="border-b border-slate-200 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-slate-900">Dados da Instituição</CardTitle>
            <CardDescription className="mt-1 text-sm text-slate-600">
              Informações da escola e coordenação
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleClearAll} className="gap-2 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
            Limpar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {validationError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {validationError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome da escola" required>
            <Input
              value={value.schoolName}
              onChange={(event) => updateField("schoolName", event.target.value)}
              placeholder="Ex.: Escola Municipal Horizonte"
              className="border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
            />
          </Field>

          <Field label="Endereço da escola" required={false}>
            <Input
              value={value.schoolAddress || ''}
              onChange={(event) => updateField("schoolAddress", event.target.value)}
              placeholder="Ex.: Rua Principal, 123 (Opcional)"
              className="border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
            />
          </Field>

          <Field label="Meses" required>
            <MonthMultiSelect
              selected={value.months}
              onChange={(months) => updateField("months", months)}
            />
          </Field>

          <Field label="Ano" required>
            <Input
              value={value.year}
              onChange={(event) => updateField("year", event.target.value.replace(/\D/g, ""))}
              placeholder="Ex.: 2026"
              inputMode="numeric"
              maxLength={4}
              className="border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
            />
          </Field>

          <Field label="Nome do Coordenador Mentor" required={false}>
            <Input
              value={value.coordinatorName}
              onChange={(event) => updateField("coordinatorName", event.target.value)}
              placeholder="Ex.: Maria Silva (opcional)"
              className="border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
            />
          </Field>

          <div className="md:col-span-2 xl:col-span-2">
            <Field label="Logo da escola" required={false}>
              <input
                id={logoInputId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleLogoUpload(event.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => document.getElementById(logoInputId)?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                  Enviar logo
                </Button>

                {value.schoolLogo ? (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <Image
                      src={value.schoolLogo}
                      alt="Preview da logo"
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-md object-contain"
                      unoptimized
                    />
                    <div className="text-sm text-slate-600">
                      <p className="font-medium text-slate-900">Logo carregada</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => updateField("schoolLogo", "")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">PNG, JPG ou SVG.</p>
                )}
              </div>
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Professores mentores</h3>
              <p className="text-sm text-slate-600">Adicione cada professor que receberá sua folha de frequência.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-300">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 w-1/3">Professor Mentor <span className="text-red-600">*</span></th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 w-1/3">Estudante Monitor <span className="text-red-600">*</span></th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 w-1/4">Turma <span className="text-red-600">*</span></th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {value.teachers.map((teacher, index) => {
                  const isLastTeacher = index === value.teachers.length - 1;
                  
                  return (
                    <tr key={teacher.id} className="border-b border-slate-300 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Input
                          value={teacher.teacherName}
                          onChange={(event) => updateTeacher(teacher.id, "teacherName", event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && isLastTeacher && teacher.mentoringClass.trim()) {
                              event.preventDefault();
                              addTeacher();
                            }
                          }}
                          placeholder="Ex.: João Pereira"
                          className="h-9 border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={teacher.studentName}
                          onChange={(event) => updateTeacher(teacher.id, "studentName", event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && isLastTeacher && teacher.mentoringClass.trim()) {
                              event.preventDefault();
                              addTeacher();
                            }
                          }}
                          placeholder="Ex.: Ana Souza"
                          className="h-9 border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={teacher.mentoringClass}
                          onChange={(event) => updateTeacher(teacher.id, "mentoringClass", event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && isLastTeacher && teacher.mentoringClass.trim()) {
                              event.preventDefault();
                              addTeacher();
                            }
                          }}
                          placeholder="Ex.: 8º Ano A"
                          className="h-9 border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeTeacher(teacher.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button type="button" className="gap-2 bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100" size="sm" onClick={addTeacher}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar Professor
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
          <Button 
            type="button" 
            onClick={onGenerate} 
            disabled={!hasAnyFilledTeacher}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 h-auto text-base disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            <FileText className="h-5 w-5" />
            Gerar Folhas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children, required = true }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-slate-900">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      {children}
    </div>
  );
}