import type React from "react";
import { FlaskConical, Users2, Heart } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCHOOL_PROJECTS } from "@/constants/main/school";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: "true" }>> = {
  FlaskConical,
  Users2,
  Heart,
};

export function Projetos() {
  return (
    <section
      id="projetos"
      aria-labelledby="projetos-heading"
      className="py-20 lg:py-28 bg-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="bg-blue-100 text-[#1a3a6b] hover:bg-blue-100 text-sm font-semibold uppercase tracking-wider px-3 py-1 mb-4">
            Iniciativas
          </Badge>
          <h2
            id="projetos-heading"
            className="text-3xl sm:text-4xl font-extrabold text-[#1a3a6b] mb-4"
          >
            Nossos <span className="text-blue-500">projetos</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Ações que promovem protagonismo, ciência, inclusão e a valorização
            da cultura local.
          </p>
        </div>

        {/* Projects grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SCHOOL_PROJECTS.map((project) => {
            const Icon = ICON_MAP[project.icon];
            return (
              <Card
                key={project.id}
                className="group border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Top accent bar */}
                <div
                  className="h-1.5 bg-gradient-to-r from-[#1a3a6b] to-blue-500"
                  aria-hidden="true"
                />

                <CardHeader className="pt-6">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors"
                      aria-hidden="true"
                    >
                      {Icon && (
                        <Icon className="w-6 h-6 text-[#1a3a6b]" aria-hidden="true" />
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-blue-50 text-[#1a3a6b] text-sm font-semibold"
                    >
                      {project.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-[#1a3a6b] text-xl font-bold">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-blue-500 font-medium text-sm">
                    {project.subtitle}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {project.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
