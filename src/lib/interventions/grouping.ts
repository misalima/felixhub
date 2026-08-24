type InterventionClassOrigin = {
  schoolYear: number;
  classCode: string;
  className: string;
};

function normalizeClassReference(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[ªº]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * Identifies the same school class across different councils/imports, whose
 * internal class IDs are intentionally different.
 */
export function interventionClassGroupKey(origin: InterventionClassOrigin) {
  const stableClassReference = normalizeClassReference(origin.classCode || origin.className);
  return `${origin.schoolYear}:${stableClassReference}`;
}
