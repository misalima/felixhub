import type React from "react";
import {
  DoorOpen,
  BookOpen,
  Accessibility,
  Users,
  Laptop,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SCHOOL_FACILITIES } from "@/constants/main/school";

// Map icon string names to Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: "true" }>> = {
  DoorOpen,
  BookOpen,
  Accessibility,
  Users,
  Laptop,
};

export function Estrutura() {
  return (
    <section
      id="estrutura"
      aria-labelledby="estrutura-heading"
      className="py-20 lg:py-28 bg-slate-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="bg-blue-100 text-[#1a3a6b] hover:bg-blue-100 text-sm font-semibold uppercase tracking-wider px-3 py-1 mb-4">
            Infraestrutura
          </Badge>
          <h2
            id="estrutura-heading"
            className="text-3xl sm:text-4xl font-extrabold text-[#1a3a6b] mb-4"
          >
            Nossa <span className="text-blue-500">estrutura</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Espaços pensados para o aprendizado, o convívio e o desenvolvimento
            integral dos estudantes.
          </p>
        </div>

        {/* Facility grid: 3 na primeira linha, 2 centralizados na segunda */}
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Linha 1 – 3 itens */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {SCHOOL_FACILITIES.slice(0, 3).map((facility) => {
              const Icon = ICON_MAP[facility.icon];
              return (
                <div
                  key={facility.id}
                  className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors flex-shrink-0"
                    aria-hidden="true"
                  >
                    {Icon && (
                      <Icon className="w-5 h-5 text-[#1a3a6b]" aria-hidden="true" />
                    )}
                  </div>
                  <span className="text-gray-700 font-medium text-sm leading-snug">
                    {facility.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Linha 2 – 2 itens centralizados */}
          <div className="flex flex-col sm:flex-row justify-center gap-5">
            {SCHOOL_FACILITIES.slice(3).map((facility) => {
              const Icon = ICON_MAP[facility.icon];
              return (
                <div
                  key={facility.id}
                  className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 group sm:w-[calc(33.333%-10px)]"
                >
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors flex-shrink-0"
                    aria-hidden="true"
                  >
                    {Icon && (
                      <Icon className="w-5 h-5 text-[#1a3a6b]" aria-hidden="true" />
                    )}
                  </div>
                  <span className="text-gray-700 font-medium text-sm leading-snug">
                    {facility.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
