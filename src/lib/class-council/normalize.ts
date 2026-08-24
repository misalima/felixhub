export function normalizeTechnicalText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function normalizeSubjectName(value: unknown): string {
  return normalizeTechnicalText(value).toLocaleLowerCase("pt-BR");
}

export function parseTerm(value: unknown): number | null {
  const normalized = normalizeTechnicalText(value).replace(/[º°]/g, "O");
  const match = normalized.match(/\b([1-4])\s*O?\s*BIM/);
  return match ? Number(match[1]) : null;
}

export function parseAttendance(value: unknown): number | null {
  if (typeof value === "number") {
    const normalized = value > 0 && value <= 1 ? value * 100 : value;
    return normalized >= 0 && normalized <= 100 ? normalized : null;
  }
  const text = String(value ?? "").trim().replace("%", "").replace(",", ".");
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

export function deriveClassDisplayName(officialCode: string): string | null {
  const match = normalizeTechnicalText(officialCode).match(/^EM(MAT|VES)([1-3])([A-Z])$/);
  if (!match) return null;
  return `${match[2]}${match[1] === "MAT" ? "M" : "T"}${match[3]}`;
}

export function parseGradeLevel(...values: unknown[]): 1 | 2 | 3 | null {
  for (const value of values) {
    const normalized = normalizeTechnicalText(value);
    const explicit = normalized.match(/\b([1-3])\s*(?:A|O)?\s*SERIE\b/);
    if (explicit) return Number(explicit[1]) as 1 | 2 | 3;
    const officialCode = normalized.match(/^EM(?:MAT|VES)([1-3])[A-Z]$/);
    if (officialCode) return Number(officialCode[1]) as 1 | 2 | 3;
    const shortName = normalized.match(/^([1-3])(?:M|T)[A-Z]$/);
    if (shortName) return Number(shortName[1]) as 1 | 2 | 3;
  }
  return null;
}

export function normalizedPersonName(value: unknown): string {
  return normalizeTechnicalText(value).replace(/[^A-Z0-9 ]/g, "");
}

export function isPcdStatus(value: unknown): boolean {
  const normalized = normalizeTechnicalText(value);
  if (!normalized || ["-", "--", "N", "NAO", "NAO INFORMADO", "SEM DEFICIENCIA"].includes(normalized)) return false;
  return !normalized.startsWith("NAO ");
}
