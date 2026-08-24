import type { CouncilClassStatus } from "@/types/class-council";
import { normalizeTechnicalText } from "./normalize";

const SHORT_SUBJECT_NAMES: Record<string, string> = {
  "LINGUA PORTUGUESA E SUAS LITERATURAS": "LÍNGUA PORTUGUESA",
  "PRATICAS DE MAT E CNT NO TERRITORIO": "PRÁT. MAT E CNT",
  "PRATICAS DE LGG E CHS NO TERRITORIO": "PRÁT. LGG E CHS",
  "TEMAS DE APROFUNDAMENTO MAT E CNT": "APROF. MAT E CNT",
  "TEMAS DE APROFUNDAMENTO LGG E CHS": "APROF. LGG E CHS",
  "PRATICAS DE INTEGRACAO COM O TERRITORIO (PIT)": "PIT",
  "TEMAS DE APROFUNDAMENTO CURRICULAR (TAC)": "TAC",
};

const SUBJECT_ABBREVIATIONS: Record<string, string> = {
  ARTES: "ART",
  BIOLOGIA: "BIO",
  "EDUCACAO FISICA": "EDF",
  FILOSOFIA: "FIL",
  FISICA: "FÍS",
  GEOGRAFIA: "GEO",
  HISTORIA: "HIS",
  "LINGUA INGLESA": "ING",
  "LINGUA PORTUGUESA E SUAS LITERATURAS": "POR",
  MATEMATICA: "MAT",
  "PRATICAS DE INTEGRACAO COM O TERRITORIO (PIT)": "PIT",
  "PRATICAS DE LGG E CHS NO TERRITORIO": "PLCH",
  "PRATICAS DE MAT E CNT NO TERRITORIO": "PMCN",
  "PROJETO DE VIDA": "PV",
  QUIMICA: "QUI",
  SOCIOLOGIA: "SOC",
  "TEMAS DE APROFUNDAMENTO CURRICULAR (TAC)": "TAC",
  "TEMAS DE APROFUNDAMENTO LGG E CHS": "TALC",
  "TEMAS DE APROFUNDAMENTO MAT E CNT": "TAMC",
};

export const classStatusLabels: Record<CouncilClassStatus, string> = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  completed: "Concluída",
};

export function classStatusBadgeClass(status: string): string {
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  }
  if (status === "in_progress") {
    return "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";
  }
  return "";
}

export function classStatusLabel(status: string): string {
  return classStatusLabels[status as CouncilClassStatus] ?? status;
}

export function shortSubjectName(subjectName: string): string {
  return SHORT_SUBJECT_NAMES[normalizeTechnicalText(subjectName)] ?? subjectName;
}

export function subjectAbbreviation(subjectName: string): string {
  const normalized = normalizeTechnicalText(subjectName);
  return SUBJECT_ABBREVIATIONS[normalized] ?? shortSubjectName(subjectName);
}
