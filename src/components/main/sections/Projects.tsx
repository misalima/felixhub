import type React from "react";
import { FlaskConical, Users2, Heart } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SCHOOL_PROJECTS } from "@/constants/main/school";

const ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; "aria-hidden"?: "true" }>
> = {
  FlaskConical,
  Users2,
  Heart,
};
export function Projects() {
  return (
    <section
      id="projects"
      aria-labelledby="projects-heading"
      className="py-20 lg:py-28 bg-[#0a1b33] relative overflow-hidden text-white"
    >
      {/* Subtle ambient lighting */}
      <div
        className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs sm:text-sm font-semibold uppercase tracking-wider px-3.5 py-1.5 rounded-full mb-4 backdrop-blur-sm">
            <span
              className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"
              aria-hidden="true"
            />
            Iniciativas
          </div>
          <h2
            id="projects-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4"
          >
            Nossos <span className="text-yellow-400">projetos</span>
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Ações que promovem protagonismo, ciência, inclusão e a valorização
            da cultura local.
          </p>
        </div>

        {/* Projects grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {SCHOOL_PROJECTS.map((project) => {
            const Icon = ICON_MAP[project.icon];

            return (
              <Card
                key={project.id}
                className="group relative bg-slate-900/90 border border-slate-700/80 hover:border-blue-400/60 hover:shadow-xl hover:shadow-blue-950/60 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between p-0 pt-0 pb-6 rounded-2xl"
              >
                <div>
                  {/* Top accent bar */}
                  <div
                    className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-yellow-400"
                    aria-hidden="true"
                  />

                  <CardHeader className="pt-6 pb-2 px-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div
                        className="flex items-center justify-center w-12 h-12 rounded-xl border border-blue-400/25 bg-blue-500/10 text-blue-300 group-hover:bg-blue-500/20 group-hover:border-blue-400/40 group-hover:text-yellow-300 transition-all duration-300 shadow-inner"
                        aria-hidden="true"
                      >
                        {Icon && (
                          <Icon className="w-6 h-6" aria-hidden="true" />
                        )}
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-400/30 bg-blue-950/80 text-blue-200">
                        {project.badge}
                      </span>
                    </div>

                    <CardTitle className="text-white text-xl font-bold tracking-tight mb-1">
                      {project.title}
                    </CardTitle>
                    <p className="font-semibold text-sm text-yellow-400/95 tracking-wide">
                      {project.subtitle}
                    </p>
                  </CardHeader>

                  <CardContent className="px-6 pt-2 pb-0">
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {project.description}
                    </p>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
