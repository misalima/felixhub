type GradeResult = {
  grade: number | null;
  gradeMarker?: string | null;
};

function normalizedMarker(marker: string | null | undefined) {
  return marker?.trim().toLocaleLowerCase("pt-BR") ?? "";
}

export function isMissingGradeResult(result: GradeResult) {
  const marker = normalizedMarker(result.gradeMarker);
  return result.grade === null && (!marker || marker === "*");
}

export function isSpecialGradeResult(result: GradeResult) {
  const marker = normalizedMarker(result.gradeMarker);
  return result.grade === null && Boolean(marker && marker !== "*");
}

export function isNotAssessedGradeMarker(marker: string | null | undefined) {
  return normalizedMarker(marker) === "s/n";
}
