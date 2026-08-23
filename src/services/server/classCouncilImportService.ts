import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { IMPORT_BUCKET, RESULT_BATCH_SIZE, XLSX_MIME } from "@/lib/class-council/constants";
import { comparePerformanceReports } from "@/lib/class-council/comparePerformanceReports";
import { parsePerformanceReport } from "@/lib/class-council/parsePerformanceReport";
import { CouncilDomainError, validateXlsxUpload } from "@/lib/class-council/validation";
import { assertImportCanActivate } from "@/lib/class-council/stateRules";
import type { ImportComparison, ImportPreviewResponse, ParsedPerformanceReport } from "@/types/class-council";
import type { Json } from "@/types/database.types";

function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function buildPreview(importId: string, version: number, fileSha256: string, parsed: ParsedPerformanceReport, comparison: ImportComparison | null): ImportPreviewResponse {
  return {
    importId,
    version,
    fileSha256,
    summary: parsed.summary,
    issues: parsed.issues,
    comparison,
    classes: parsed.classes.map((item) => ({
      officialCode: item.officialCode,
      displayName: item.displayName,
      displayNameNeedsConfirmation: item.displayNameNeedsConfirmation,
      studentCount: item.students.length,
      subjectCount: item.subjects.length,
    })),
  };
}

async function getImportCouncil(councilId: string) {
  const { data, error } = await supabaseAdmin
    .from("class_councils")
    .select("id, school_year, term, offering, status, current_import_id")
    .eq("id", councilId)
    .is("archived_at", null)
    .maybeSingle();
  assertNoError(error);
  if (!data) throw new CouncilDomainError("Conselho não encontrado.", 404, "not_found");
  if (data.offering !== "regular") throw new CouncilDomainError("O MVP aceita apenas relatórios do Ensino Regular.", 409, "offering_not_supported");
  if (data.status === "completed") throw new CouncilDomainError("Reabra o conselho antes de importar uma nova versão do relatório.", 409, "council_reopen_required");
  if (!["draft", "preparation", "in_progress", "reopened"].includes(data.status)) throw new CouncilDomainError("Este conselho está somente para leitura.", 409, "council_read_only");
  return data;
}

async function nextImportVersion(councilId: string) {
  const { data, error } = await supabaseAdmin
    .from("class_council_imports")
    .select("version")
    .eq("council_id", councilId)
    .order("version", { ascending: false })
    .limit(1);
  assertNoError(error);
  return (data?.[0]?.version ?? 0) + 1;
}

async function compareWithCurrentImport(council: Awaited<ReturnType<typeof getImportCouncil>>, parsed: ParsedPerformanceReport): Promise<ImportComparison | null> {
  if (!council.current_import_id) return null;
  const { data: currentImport, error } = await supabaseAdmin
    .from("class_council_imports")
    .select("id, version")
    .eq("id", council.current_import_id)
    .eq("council_id", council.id)
    .eq("status", "confirmed")
    .maybeSingle();
  assertNoError(error);
  if (!currentImport) throw new CouncilDomainError("A versão ativa do relatório não foi encontrada.", 409, "current_import_not_found");
  const { buffer } = await downloadImportFile(council.id, currentImport.id);
  const previous = await parsePerformanceReport(buffer, { schoolYear: council.school_year, term: council.term, offering: "regular" });
  return comparePerformanceReports(previous, parsed, currentImport.id, currentImport.version);
}

function storedBaseImportId(summary: Json): string | null | undefined {
  if (!summary || Array.isArray(summary) || typeof summary !== "object") return undefined;
  const value = summary.baseImportId;
  return typeof value === "string" ? value : value === null ? null : undefined;
}

export async function createImportPreview(councilId: string, file: File, actorId: string): Promise<ImportPreviewResponse> {
  const council = await getImportCouncil(councilId);
  const buffer = Buffer.from(await file.arrayBuffer());
  validateXlsxUpload(file, buffer);
  const fileSha256 = sha256(buffer);
  const parsed = await parsePerformanceReport(buffer, { schoolYear: council.school_year, term: council.term, offering: "regular" });
  const comparison = await compareWithCurrentImport(council, parsed);
  let version = await nextImportVersion(councilId);
  let importId = randomUUID();
  let originalFilePath = `${councilId}/${importId}/${fileSha256}.xlsx`;
  let inserted = false;
  for (let attempt = 0; attempt < 3 && !inserted; attempt += 1) {
    const { error: insertError } = await supabaseAdmin.from("class_council_imports").insert({
      id: importId,
      council_id: councilId,
      version,
      status: "validating",
      original_file_name: file.name.slice(0, 255),
      original_file_path: originalFilePath,
      file_mime_type: XLSX_MIME,
      file_size_bytes: buffer.length,
      file_sha256: fileSha256,
      summary: { ...parsed.summary, baseImportId: council.current_import_id } as unknown as Json,
      issues: parsed.issues as unknown as Json,
      created_by: actorId,
    });
    if (!insertError) {
      inserted = true;
      break;
    }
    if (insertError.code !== "23505") assertNoError(insertError);
    version = await nextImportVersion(councilId);
    importId = randomUUID();
    originalFilePath = `${councilId}/${importId}/${fileSha256}.xlsx`;
  }
  if (!inserted) throw new CouncilDomainError("Não foi possível reservar uma nova versão da importação. Tente novamente.", 409, "import_version_conflict");

  try {
    const { error: uploadError } = await supabaseAdmin.storage.from(IMPORT_BUCKET).upload(originalFilePath, buffer, { contentType: XLSX_MIME, upsert: true });
    assertNoError(uploadError);
    const { error: updateError } = await supabaseAdmin.from("class_council_imports").update({
      status: "validated",
      source_generated_at: parsed.metadata.generatedAt,
      blocking_error_count: parsed.summary.blockingErrorCount,
      warning_count: parsed.summary.warningCount,
      summary: { ...parsed.summary, baseImportId: council.current_import_id } as unknown as Json,
      issues: parsed.issues as unknown as Json,
    }).eq("id", importId).eq("council_id", councilId);
    assertNoError(updateError);
  } catch (error) {
    await supabaseAdmin.from("class_council_imports").update({ status: "failed" }).eq("id", importId);
    throw error;
  }

  return buildPreview(importId, version, fileSha256, parsed, comparison);
}

export async function getPendingImportPreview(councilId: string): Promise<ImportPreviewResponse | null> {
  const council = await getImportCouncil(councilId);
  const { data: importRecord, error: importError } = await supabaseAdmin
    .from("class_council_imports")
    .select("id, version, original_file_path, file_sha256, summary")
    .eq("council_id", councilId)
    .in("status", ["validating", "validated", "importing", "failed"])
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  assertNoError(importError);
  if (!importRecord) return null;
  const baseImportId = storedBaseImportId(importRecord.summary);
  if (baseImportId !== undefined && baseImportId !== council.current_import_id) return null;

  const { data: privateFile, error: downloadError } = await supabaseAdmin.storage.from(IMPORT_BUCKET).download(importRecord.original_file_path);
  assertNoError(downloadError);
  if (!privateFile) return null;
  const buffer = Buffer.from(await privateFile.arrayBuffer());
  if (sha256(buffer) !== importRecord.file_sha256) {
    throw new CouncilDomainError("O arquivo armazenado não corresponde à prévia validada.", 409, "hash_mismatch");
  }
  const parsed = await parsePerformanceReport(buffer, { schoolYear: council.school_year, term: council.term, offering: "regular" });
  const comparison = await compareWithCurrentImport(council, parsed);
  return buildPreview(importRecord.id, importRecord.version, importRecord.file_sha256, parsed, comparison);
}

export async function confirmImport(councilId: string, importId: string, actorId: string, displayNames: Record<string, string> = {}) {
  const council = await getImportCouncil(councilId);
  const { data: importRecord, error: importError } = await supabaseAdmin
    .from("class_council_imports")
    .select("id, status, original_file_path, file_sha256, summary")
    .eq("id", importId)
    .eq("council_id", councilId)
    .maybeSingle();
  assertNoError(importError);
  if (!importRecord) throw new CouncilDomainError("Importação não encontrada.", 404, "not_found");
  if (importRecord.status === "confirmed") throw new CouncilDomainError("Esta importação já foi confirmada.", 409, "import_already_confirmed");
  if (importRecord.status === "importing") throw new CouncilDomainError("A confirmação desta importação já está em andamento.", 409, "import_in_progress");
  if (!["validated", "failed"].includes(importRecord.status)) throw new CouncilDomainError("A importação não está pronta para confirmação.", 409, "invalid_import_state");
  const baseImportId = storedBaseImportId(importRecord.summary);
  if (baseImportId !== undefined && baseImportId !== council.current_import_id) {
    throw new CouncilDomainError("A versão ativa mudou depois desta prévia. Gere uma nova prévia antes de confirmar.", 409, "stale_import_preview");
  }

  const { data: privateFile, error: downloadError } = await supabaseAdmin.storage.from(IMPORT_BUCKET).download(importRecord.original_file_path);
  assertNoError(downloadError);
  if (!privateFile) throw new CouncilDomainError("O arquivo privado da importação não foi encontrado.", 404, "file_not_found");
  const buffer = Buffer.from(await privateFile.arrayBuffer());
  if (sha256(buffer) !== importRecord.file_sha256) throw new CouncilDomainError("O arquivo armazenado não corresponde ao arquivo validado.", 409, "hash_mismatch");

  const parsed = await parsePerformanceReport(buffer, { schoolYear: council.school_year, term: council.term, offering: "regular" });
  if (parsed.summary.blockingErrorCount > 0) {
    await supabaseAdmin.from("class_council_imports").update({
      blocking_error_count: parsed.summary.blockingErrorCount,
      warning_count: parsed.summary.warningCount,
      summary: { ...parsed.summary, baseImportId: council.current_import_id } as unknown as Json,
      issues: parsed.issues as unknown as Json,
    }).eq("id", importId);
    throw new CouncilDomainError("A confirmação foi bloqueada porque o arquivo contém erros.", 409, "blocking_import_errors");
  }
  for (const item of parsed.classes.filter((parsedClass) => parsedClass.displayNameNeedsConfirmation)) {
    if (!displayNames[item.officialCode]?.trim()) throw new CouncilDomainError(`Confirme o nome curto da turma ${item.officialCode}.`, 409, "class_name_required");
  }

  const { data: claimedImport, error: claimError } = await supabaseAdmin
    .from("class_council_imports")
    .update({ status: "importing" })
    .eq("id", importId)
    .eq("council_id", councilId)
    .in("status", ["validated", "failed"])
    .select("id")
    .maybeSingle();
  assertNoError(claimError);
  if (!claimedImport) throw new CouncilDomainError("A confirmação desta importação já foi iniciada em outra requisição.", 409, "import_in_progress");
  try {
    // Na primeira importação, qualquer turma existente é resíduo de uma
    // tentativa interrompida. Em reimportações, as entidades são preservadas
    // para manter participantes, professores e registros pedagógicos.
    if (!council.current_import_id) {
      const { error: cleanupError } = await supabaseAdmin
        .from("class_council_classes")
        .delete()
        .eq("council_id", councilId);
      assertNoError(cleanupError);
    }
    await persistParsedReport(councilId, importId, actorId, parsed, displayNames);
    const [snapshotCount, resultCount] = await Promise.all([
      supabaseAdmin.from("class_council_student_snapshots").select("id", { count: "exact", head: true }).eq("import_id", importId),
      supabaseAdmin.from("class_council_results").select("id", { count: "exact", head: true }).eq("import_id", importId),
    ]);
    assertNoError(snapshotCount.error);
    assertNoError(resultCount.error);
    assertImportCanActivate({ blockingErrorCount: parsed.summary.blockingErrorCount, snapshotCount: snapshotCount.count ?? 0, resultCount: resultCount.count ?? 0, expectedSnapshotCount: parsed.summary.studentCount, expectedResultCount: parsed.summary.resultCount });
    const { data: confirmedImport, error: confirmError } = await supabaseAdmin.from("class_council_imports").update({ status: "confirmed", confirmed_by: actorId }).eq("id", importId).eq("status", "importing").select("id").maybeSingle();
    assertNoError(confirmError);
    if (!confirmedImport) throw new Error("A ativação da importação não foi confirmada.");
    try {
      await supabaseAdmin.from("class_council_audit_log").insert({ council_id: councilId, actor_id: actorId, event_type: "import_confirmed", entity_type: "import", entity_id: importId, metadata: parsed.summary as unknown as Json });
    } catch {
      // A importação confirmada não deve ser revertida por uma falha secundária de auditoria.
    }
    return { confirmed: true, summary: parsed.summary };
  } catch (error) {
    await supabaseAdmin.from("class_council_imports").update({ status: "failed" }).eq("id", importId).eq("status", "importing");
    throw error;
  }
}

async function persistParsedReport(councilId: string, importId: string, actorId: string, parsed: ParsedPerformanceReport, displayNames: Record<string, string>) {
  const studentRows = parsed.classes.flatMap((item) => item.students.map((student) => ({ enrollment_number: student.enrollmentNumber, canonical_name: student.name })));
  const uniqueStudents = [...new Map(studentRows.map((item) => [item.enrollment_number, item])).values()];
  const { data: students, error: studentError } = await supabaseAdmin.from("students").upsert(uniqueStudents, { onConflict: "enrollment_number" }).select("id, enrollment_number");
  assertNoError(studentError);
  const studentIds = new Map((students ?? []).map((item) => [item.enrollment_number, item.id]));

  const { data: existingClasses, error: existingClassError } = await supabaseAdmin
    .from("class_council_classes")
    .select("official_code, created_by")
    .eq("council_id", councilId);
  assertNoError(existingClassError);
  const existingClassCreators = new Map((existingClasses ?? []).map((item) => [item.official_code, item.created_by]));
  const classRows = parsed.classes.map((item) => ({
    council_id: councilId,
    official_code: item.officialCode,
    display_name: (displayNames[item.officialCode] ?? item.displayName).trim(),
    grade_label: item.gradeLabel,
    shift: item.shift,
    created_by: existingClassCreators.get(item.officialCode) ?? actorId,
    updated_by: actorId,
  }));
  const { data: classes, error: classError } = await supabaseAdmin.from("class_council_classes").upsert(classRows, { onConflict: "council_id,official_code" }).select("id, official_code");
  assertNoError(classError);
  const classIds = new Map((classes ?? []).map((item) => [item.official_code, item.id]));

  const councilClassIds = [...classIds.values()];
  const { data: existingSubjects, error: existingSubjectError } = await supabaseAdmin
    .from("class_council_subjects")
    .select("council_class_id, normalized_name, created_by")
    .in("council_class_id", councilClassIds);
  assertNoError(existingSubjectError);
  const existingSubjectCreators = new Map((existingSubjects ?? []).map((item) => [`${item.council_class_id}:${item.normalized_name}`, item.created_by]));
  const subjectRows = parsed.classes.flatMap((parsedClass) => parsedClass.subjects.map((subject) => ({
    council_class_id: classIds.get(parsedClass.officialCode)!,
    normalized_name: subject.key,
    display_name: subject.displayName,
    created_by: existingSubjectCreators.get(`${classIds.get(parsedClass.officialCode)!}:${subject.key}`) ?? actorId,
    updated_by: actorId,
  })));
  const { data: subjects, error: subjectError } = await supabaseAdmin.from("class_council_subjects").upsert(subjectRows, { onConflict: "council_class_id,normalized_name" }).select("id, council_class_id, normalized_name");
  assertNoError(subjectError);
  const subjectIds = new Map((subjects ?? []).map((item) => [`${item.council_class_id}:${item.normalized_name}`, item.id]));

  const { data: existingEnrollments, error: existingEnrollmentError } = await supabaseAdmin
    .from("class_council_enrollments")
    .select("council_class_id, student_id, created_by")
    .in("council_class_id", councilClassIds);
  assertNoError(existingEnrollmentError);
  const existingEnrollmentCreators = new Map((existingEnrollments ?? []).map((item) => [`${item.council_class_id}:${item.student_id}`, item.created_by]));
  const enrollmentRows = parsed.classes.flatMap((parsedClass) => parsedClass.students.map((student) => ({
    council_class_id: classIds.get(parsedClass.officialCode)!,
    student_id: studentIds.get(student.enrollmentNumber)!,
    created_by: existingEnrollmentCreators.get(`${classIds.get(parsedClass.officialCode)!}:${studentIds.get(student.enrollmentNumber)!}`) ?? actorId,
  })));
  const { data: enrollments, error: enrollmentError } = await supabaseAdmin.from("class_council_enrollments").upsert(enrollmentRows, { onConflict: "council_class_id,student_id" }).select("id, council_class_id, student_id");
  assertNoError(enrollmentError);
  const enrollmentIds = new Map((enrollments ?? []).map((item) => [`${item.council_class_id}:${item.student_id}`, item.id]));

  const snapshots = parsed.classes.flatMap((parsedClass) => {
    const councilClassId = classIds.get(parsedClass.officialCode)!;
    return parsedClass.students.map((student, reportPosition) => ({
      enrollment_id: enrollmentIds.get(`${councilClassId}:${studentIds.get(student.enrollmentNumber)!}`)!,
      import_id: importId,
      report_position: reportPosition,
      imported_name: student.name,
      race_color: student.raceColor,
      pcd_status: student.pcdStatus,
      enrollment_status: student.enrollmentStatus,
      attendance_rate: student.attendanceRate,
    }));
  });
  const { error: snapshotError } = await supabaseAdmin.from("class_council_student_snapshots").upsert(snapshots, { onConflict: "enrollment_id,import_id" });
  assertNoError(snapshotError);

  const results = parsed.classes.flatMap((parsedClass) => {
    const councilClassId = classIds.get(parsedClass.officialCode)!;
    return parsedClass.students.flatMap((student) => {
      const enrollmentId = enrollmentIds.get(`${councilClassId}:${studentIds.get(student.enrollmentNumber)!}`)!;
      return student.results.map((result) => ({
        import_id: importId,
        enrollment_id: enrollmentId,
        subject_id: subjectIds.get(`${councilClassId}:${result.subjectKey}`)!,
        term: result.term,
        grade: result.grade,
        grade_marker: result.gradeMarker,
        absences: result.absences,
      }));
    });
  });
  for (let index = 0; index < results.length; index += RESULT_BATCH_SIZE) {
    const { error } = await supabaseAdmin.from("class_council_results").upsert(results.slice(index, index + RESULT_BATCH_SIZE), { onConflict: "import_id,enrollment_id,subject_id,term" });
    assertNoError(error);
  }
}

export async function downloadImportFile(councilId: string, importId: string) {
  const { data: record, error } = await supabaseAdmin.from("class_council_imports").select("original_file_name, original_file_path, file_mime_type, class_councils!class_council_imports_council_id_fkey!inner(archived_at)").eq("id", importId).eq("council_id", councilId).is("class_councils.archived_at", null).maybeSingle();
  assertNoError(error);
  if (!record) throw new CouncilDomainError("Arquivo não encontrado.", 404, "not_found");
  const { data, error: downloadError } = await supabaseAdmin.storage.from(IMPORT_BUCKET).download(record.original_file_path);
  assertNoError(downloadError);
  if (!data) throw new CouncilDomainError("Arquivo não encontrado no armazenamento privado.", 404, "not_found");
  return { buffer: Buffer.from(await data.arrayBuffer()), fileName: record.original_file_name, mimeType: record.file_mime_type };
}
