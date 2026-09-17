"use client";

import Image from "next/image";
import { getMonthLabel, type FormState, type MentorTeacher } from "@/types/professor-mentor";

interface AttendanceSheetProps {
  form: FormState;
  teacher: MentorTeacher;
  month?: string;
}

const EMPTY_ROWS = Array.from({ length: 20 }, (_, index) => index);

export function AttendanceSheet({ form, teacher, month }: AttendanceSheetProps) {
  const monthValue = month || form.months[0] || '';
  const monthLabel = getMonthLabel(monthValue);
  const monthYearLabel = monthLabel && form.year ? `${monthLabel}/${form.year}` : monthLabel || form.year;

  return (
    <section className="mentor-attendance-sheet">
      {/* Header with logo and school info */}
      <div className="flex items-start justify-between gap-3 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          {form.schoolLogo && (
            <Image
              src={form.schoolLogo}
              alt={`Logo da escola ${form.schoolName}`}
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-md object-contain"
              unoptimized
            />
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-900">
              {form.schoolName || "Escola"}
            </p>
            {form.schoolAddress && (
              <p className="mt-0.5 text-[8px] text-slate-500">
                {form.schoolAddress}
              </p>
            )}
          </div>
        </div>

        <Image
          src="/logo-mentor.png"
          alt="Logo Programa Professor Mentor"
          width={120}
          height={57}
          className="h-auto w-28 shrink-0 object-contain"
          unoptimized
        />
      </div>

      <div className="mt-1 border-t border-slate-900" />

      <div className="mt-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-[10px] text-slate-900">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <p className="mt-0.5 font-bold uppercase tracking-[0.14em] text-slate-700">Mês/Ano</p>
            <p className="mt-0.5 font-medium text-[14px] italic">{monthYearLabel || ""}</p>
          </div>
          <div>
            <p className="mt-0.5 font-bold uppercase tracking-[0.14em] text-slate-700">Turma</p>
            <p className="mt-0.5 font-medium text-[14px] italic">{teacher.mentoringClass || ""}</p>
          </div>
          <div>
            <p className="mt-0.5 font-bold uppercase tracking-[0.14em] text-slate-700">Professor(a)</p>
            <p className="mt-0.5 font-medium text-[14px] italic">{teacher.teacherName || ""}</p>
          </div>
          <div>
            <p className="mt-0.5 font-bold uppercase tracking-[0.14em] text-slate-700">Estudante Monitor(a)</p>
            <p className="mt-0.5 font-medium text-[14px] italic">{teacher.studentName || ""}</p>
          </div>
        </div>

        <div className="mt-1.5 rounded border border-amber-300 bg-amber-100 px-2 py-1 text-[9px] leading-4 text-amber-900">
          <p className="font-semibold">Carga horária obrigatória:</p>
          <p>Mínimo 8 horas semanais na unidade escolar, sendo 2 horas para recomposição da aprendizagem.</p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-900">Registro de Frequência</p>

      <div className="mt-2 overflow-hidden rounded-lg border border-slate-400">
        <table className="mentor-attendance-table w-full border-collapse text-[9px] text-slate-900">
          <thead className="bg-slate-200 uppercase tracking-[0.14em] text-slate-800">
            <tr>
              <th className="w-[10%] border border-slate-400 px-1.5 py-1 text-left font-bold">Data</th>
              <th className="w-[8%] border border-slate-400 px-1.5 py-1 text-left font-bold text-[8px]">Horário Entrada</th>
              <th className="w-[8%] border border-slate-400 px-1.5 py-1 text-left font-bold text-[8px]">Horário Saída</th>
              <th className="w-[47%] border border-slate-400 px-1.5 py-1 text-left font-bold">Atividade Desenvolvida</th>
              <th className="w-[25%] border border-slate-400 px-1.5 py-1 text-left font-bold">Assinatura</th>
            </tr>
          </thead>
          <tbody>
            {EMPTY_ROWS.map((rowIndex) => (
              <tr key={rowIndex} className="mentor-attendance-row">
                <td className="border border-slate-400 px-1.5 py-2 align-top">&nbsp;</td>
                <td className="border border-slate-400 px-1.5 py-2 align-top">&nbsp;</td>
                <td className="border border-slate-400 px-1.5 py-2 align-top">&nbsp;</td>
                <td className="border border-slate-400 px-1.5 py-2 align-top">&nbsp;</td>
                <td className="border border-slate-400 px-1.5 py-2 align-top">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-1 grid grid-cols-3 gap-3 text-[10px] text-slate-900">
        <SignatureBlock label="Professor(a) Mentor(a)" name={teacher.teacherName} />
        <SignatureBlock label="Estudante Monitor(a)" name={teacher.studentName} />
        <SignatureBlock label="Coordenador(a) Mentor(a)" name={form.coordinatorName} />
      </div>
    </section>
  );
}

function SignatureBlock({ label, name }: { label: string; name: string }) {
  const displayName = label.includes("Coordenador") && !name ? "Coordenador(a) Mentor da Unidade" : name;

  return (
    <div className="flex flex-col gap-0 text-center pt-14">
      <div className="border-t-1 border-slate-900 pt-0.5">&nbsp;</div>
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-900">{label}</p>
      <p className="text-[9px] text-slate-900">{displayName || ""}</p>
    </div>
  );
}