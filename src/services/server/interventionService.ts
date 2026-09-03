import { collectSupabasePages } from "@/lib/class-council/pagination";
import { resolveCouncilCriteria } from "@/lib/class-council/constants";
import { interventionClassGroupKey } from "@/lib/interventions/grouping";
import { CouncilDomainError, optionalText, parseUuid } from "@/lib/class-council/validation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { InterventionReportData, InterventionReportItem, InterventionSourceType, InterventionTargetType } from "@/types/intervention";
import type { BehaviorCategory, InterventionStatus } from "@/types/class-council";
import type { Json } from "@/types/database.types";

type RelatedCouncil = { id: string; school_year: number; term: number; meeting_date: string; current_import_id: string | null; criteria: Json | null };
type RelatedClass = { id: string; display_name: string; official_code: string };
type RelatedStudent = { id: string; canonical_name: string; enrollment_number: string };
type ContextEnrollment = { id: string; pedagogical_observation: string | null };
type ContextBehavior = { enrollment_id: string; category: string; description: string | null };
type ContextResult = { enrollment_id: string; import_id: string; term: number; grade: number | null };
export type ListInterventionsOptions = {
  year?: number | "latest" | "all";
  status?: "open" | "all" | InterventionStatus;
  classKeys?: string[];
  targetType?: "all" | InterventionTargetType;
  responsible?: "all" | "none" | string;
  overdueOnly?: boolean;
  search?: string;
  cursor?: number;
  limit?: number;
  all?: boolean;
  metadataOnly?: boolean;
  studentIds?: string[];
};

export type CreateIndependentInterventionInput = {
  sourceType: "student_profile" | "intervention_center";
  studentId: unknown;
  description: unknown;
  reason?: unknown;
  responsibleName?: unknown;
  dueDate?: unknown;
};

const CONTEXT_BATCH_SIZE = 100;

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function batches<T>(values: T[], size = CONTEXT_BATCH_SIZE) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
}

async function loadCouncilContexts(enrollmentIds: string[], importIds: string[]) {
  if (!enrollmentIds.length) return { enrollments: [] as ContextEnrollment[], behaviors: [] as ContextBehavior[], results: [] as ContextResult[] };

  const responses = await Promise.all(batches(enrollmentIds).map(async (enrollmentBatch) => {
    const [enrollmentResponse, behaviorResponse, results] = await Promise.all([
      supabaseAdmin.from("class_council_enrollments").select("id, pedagogical_observation").in("id", enrollmentBatch),
      supabaseAdmin.from("class_council_behaviors").select("enrollment_id, category, description").in("enrollment_id", enrollmentBatch),
      importIds.length
        ? collectSupabasePages(async (from, to) => {
          const { data, error } = await supabaseAdmin
            .from("class_council_results")
            .select("enrollment_id, import_id, term, grade")
            .in("enrollment_id", enrollmentBatch)
            .in("import_id", importIds)
            .order("id")
            .range(from, to);
          if (error) throw new Error(error.message);
          return data ?? [];
        })
        : Promise.resolve([]),
    ]);
    if (enrollmentResponse.error) throw new Error(enrollmentResponse.error.message);
    if (behaviorResponse.error) throw new Error(behaviorResponse.error.message);
    return {
      enrollments: enrollmentResponse.data ?? [],
      behaviors: behaviorResponse.data ?? [],
      results,
    };
  }));

  return {
    enrollments: responses.flatMap((response) => response.enrollments) as ContextEnrollment[],
    behaviors: responses.flatMap((response) => response.behaviors) as ContextBehavior[],
    results: responses.flatMap((response) => response.results) as ContextResult[],
  };
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function isOpenStatus(status: string) {
  return status === "pending" || status === "in_progress";
}

export async function listInterventions(options: ListInterventionsOptions = { all: true }): Promise<InterventionReportData> {
  const rows = await collectSupabasePages(async (from, to) => {
    const { data, error } = await supabaseAdmin
      .from("class_council_interventions")
      .select("id, source_type, target_type, description, reason, responsible_name, due_date, status, outcome, cancellation_reason, created_at, updated_at, status_changed_at, started_at, completed_at, cancelled_at, origin_enrollment_id, target_school_year, target_class_official_code, target_class_name, origin_council:class_councils!class_council_interventions_origin_council_id_fkey(id, school_year, term, meeting_date, current_import_id, criteria), origin_class:class_council_classes!class_council_interventions_origin_class_id_fkey(id, display_name, official_code), student:students!class_council_interventions_target_student_id_fkey(id, canonical_name, enrollment_number)")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

  const validRows = rows.map((row) => {
    const council = relation(row.origin_council as RelatedCouncil | RelatedCouncil[] | null);
    const councilClass = relation(row.origin_class as RelatedClass | RelatedClass[] | null);
    const student = relation(row.student as RelatedStudent | RelatedStudent[] | null);
    const schoolYear = row.target_school_year ?? council?.school_year ?? Number(row.created_at.slice(0, 4));
    const className = row.target_class_name ?? councilClass?.display_name ?? "Sem turma vinculada";
    const classCode = row.target_class_official_code ?? councilClass?.official_code ?? "";
    const classKey = classCode || className !== "Sem turma vinculada"
      ? interventionClassGroupKey({ schoolYear, classCode, className })
      : `${schoolYear}:sem-turma`;
    return { row, council, councilClass, student, schoolYear, className, classCode, classKey };
  });
  const years = [...new Set(validRows.map(({ schoolYear }) => schoolYear))].sort((a, b) => b - a);
  const effectiveYear = options.year === "latest" ? years[0] ?? null : typeof options.year === "number" ? options.year : null;
  const yearRows = validRows.filter(({ schoolYear }) => effectiveYear === null || schoolYear === effectiveYear);
  const scopedRows = yearRows.filter(({ classKey }) => !options.classKeys?.length || options.classKeys.includes(classKey));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Maceio", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const summary = {
    pending: scopedRows.filter(({ row }) => row.status === "pending").length,
    inProgress: scopedRows.filter(({ row }) => row.status === "in_progress").length,
    overdue: scopedRows.filter(({ row }) => isOpenStatus(row.status) && Boolean(row.due_date && row.due_date < today)).length,
    withoutResponsible: scopedRows.filter(({ row }) => isOpenStatus(row.status) && !row.responsible_name).length,
    withoutDueDate: scopedRows.filter(({ row }) => isOpenStatus(row.status) && !row.due_date).length,
  };
  const classes = [...new Map(validRows.map(({ schoolYear, className, classCode, classKey }) => [classKey, { key: classKey, year: schoolYear, name: className, code: classCode }])).values()]
    .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name, "pt-BR"));
  const responsibles = [...new Map(validRows.flatMap(({ schoolYear, row }) => row.responsible_name?.trim() ? [[`${schoolYear}:${row.responsible_name.trim()}`, { year: schoolYear, name: row.responsible_name.trim() }]] : [])).values()]
    .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name, "pt-BR"));

  const normalizedSearch = normalizeSearch(options.search ?? "");
  const filteredRows = scopedRows.filter(({ row, className, student }) => {
    if (options.status === "open" && !isOpenStatus(row.status)) return false;
    if (options.status && options.status !== "all" && options.status !== "open" && row.status !== options.status) return false;
    if (options.targetType && options.targetType !== "all" && row.target_type !== options.targetType) return false;
    if (options.responsible === "none" && row.responsible_name) return false;
    if (options.responsible && options.responsible !== "all" && options.responsible !== "none" && row.responsible_name !== options.responsible) return false;
    if (options.overdueOnly && (!isOpenStatus(row.status) || !row.due_date || row.due_date >= today)) return false;
    if (options.studentIds?.length && (!student || !options.studentIds.includes(student.id))) return false;
    if (normalizedSearch && !normalizeSearch(`${student?.canonical_name ?? "intervenção coletiva"} ${student?.enrollment_number ?? ""} ${row.description} ${row.reason ?? ""} ${className} ${row.responsible_name ?? ""}`).includes(normalizedSearch)) return false;
    return true;
  });
  const cursor = Math.max(0, options.cursor ?? 0);
  const limit = Math.min(200, Math.max(1, options.limit ?? 40));
  const selectedRows = options.metadataOnly ? [] : options.all ? filteredRows : filteredRows.slice(cursor, cursor + limit);

  const enrollmentIds = [...new Set(selectedRows.map(({ row }) => row.origin_enrollment_id).filter((id): id is string => Boolean(id)))];
  const councils = new Map<string, RelatedCouncil>();
  for (const item of selectedRows) if (item.council) councils.set(item.council.id, item.council);
  const importIds = [...new Set([...councils.values()].map((council) => council.current_import_id).filter((id): id is string => Boolean(id)))];
  const context = await loadCouncilContexts(enrollmentIds, importIds);
  const enrollmentById = new Map(context.enrollments.map((enrollment) => [enrollment.id, enrollment]));
  const behaviorsByEnrollment = new Map<string, ContextBehavior[]>();
  for (const behavior of context.behaviors) {
    const values = behaviorsByEnrollment.get(behavior.enrollment_id) ?? [];
    values.push(behavior);
    behaviorsByEnrollment.set(behavior.enrollment_id, values);
  }
  const resultsByEnrollment = new Map<string, ContextResult[]>();
  for (const result of context.results) {
    const values = resultsByEnrollment.get(result.enrollment_id) ?? [];
    values.push(result);
    resultsByEnrollment.set(result.enrollment_id, values);
  }

  const items = selectedRows.map(({ row, council, councilClass, student, schoolYear, className, classCode }) => {
    const enrollmentId = row.origin_enrollment_id;
    const enrollment = enrollmentId ? enrollmentById.get(enrollmentId) : null;
    const criteria = resolveCouncilCriteria(council?.criteria);
    const lowGradeCount = enrollmentId && council?.current_import_id
      ? (resultsByEnrollment.get(enrollmentId) ?? []).filter((result) => result.import_id === council.current_import_id && result.term === council.term && result.grade !== null && Number(result.grade) < criteria.lowGradeThreshold).length
      : 0;
    return {
      id: row.id,
      targetType: row.target_type as InterventionTargetType,
      sourceType: row.source_type as InterventionSourceType,
      description: row.description,
      reason: row.reason,
      responsibleName: row.responsible_name,
      dueDate: row.due_date,
      status: row.status as InterventionStatus,
      outcome: row.outcome,
      cancellationReason: row.cancellation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      statusChangedAt: row.status_changed_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      cancelledAt: row.cancelled_at,
      origin: council && councilClass ? {
        councilId: council.id,
        schoolYear: council.school_year,
        term: council.term,
        meetingDate: council.meeting_date,
        classId: councilClass.id,
        className: councilClass.display_name,
        classCode: councilClass.official_code,
      } : {
        councilId: "",
        schoolYear,
        term: 0,
        meetingDate: row.created_at.slice(0, 10),
        classId: "",
        className,
        classCode,
      },
      targetClass: classCode || className !== "Sem turma vinculada" ? { schoolYear, className, classCode } : null,
      student: student ? { id: student.id, name: student.canonical_name, enrollmentNumber: student.enrollment_number } : null,
      councilContext: enrollmentId ? {
        lowGradeCount,
        behaviors: (behaviorsByEnrollment.get(enrollmentId) ?? []).map((behavior) => ({
          category: behavior.category as BehaviorCategory,
          description: behavior.description,
        })),
        pedagogicalObservation: enrollment?.pedagogical_observation ?? null,
      } : null,
    } satisfies InterventionReportItem;
  });

  return {
    generatedAt: new Date().toISOString(),
    items,
    total: filteredRows.length,
    nextCursor: !options.all && cursor + items.length < filteredRows.length ? cursor + items.length : null,
    meta: { years, effectiveYear, classes, responsibles, summary },
  };
}

export async function updateInterventionById(interventionId: string, input: { status?: InterventionStatus; outcome?: unknown; cancellationReason?: unknown; responsibleName?: unknown; dueDate?: unknown }, actorId: string) {
  const allowed: InterventionStatus[] = ["pending", "in_progress", "completed", "cancelled"];
  if (input.status && !allowed.includes(input.status)) throw new CouncilDomainError("Situação da intervenção inválida.");
  const updates = {
    ...(input.status ? { status: input.status } : {}),
    ...("outcome" in input ? { outcome: optionalText(input.outcome) } : {}),
    ...("cancellationReason" in input ? { cancellation_reason: optionalText(input.cancellationReason) } : {}),
    ...("responsibleName" in input ? { responsible_name: optionalText(input.responsibleName, 200) } : {}),
    ...("dueDate" in input ? { due_date: optionalText(input.dueDate, 10) } : {}),
    updated_by: actorId,
  };
  const { data, error } = await supabaseAdmin.from("class_council_interventions").update(updates).eq("id", interventionId).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new CouncilDomainError("Intervenção não encontrada.", 404, "not_found");
  return data;
}

async function currentClassForStudent(studentId: string) {
  const { data: council, error: councilError } = await supabaseAdmin.from("class_councils").select("id, school_year, current_import_id").not("current_import_id", "is", null).is("archived_at", null).order("school_year", { ascending: false }).order("term", { ascending: false }).limit(1).maybeSingle();
  if (councilError) throw new Error(councilError.message);
  if (!council?.current_import_id) return null;
  const { data: enrollment, error: enrollmentError } = await supabaseAdmin.from("class_council_enrollments").select("id, class:class_council_classes!inner(id, council_id, display_name, official_code)").eq("student_id", studentId).eq("class_council_classes.council_id", council.id).maybeSingle();
  if (enrollmentError) throw new Error(enrollmentError.message);
  if (!enrollment) return null;
  const { count, error: snapshotError } = await supabaseAdmin.from("class_council_student_snapshots").select("id", { count: "exact", head: true }).eq("import_id", council.current_import_id).eq("enrollment_id", enrollment.id);
  if (snapshotError) throw new Error(snapshotError.message);
  if (!count) return null;
  const currentClass = relation(enrollment.class as RelatedClass | RelatedClass[] | null);
  return currentClass ? { schoolYear: council.school_year, name: currentClass.display_name, code: currentClass.official_code } : null;
}

export async function createIndependentIntervention(input: CreateIndependentInterventionInput, actorId: string) {
  if (input.sourceType !== "student_profile" && input.sourceType !== "intervention_center") throw new CouncilDomainError("Origem da intervenção inválida.");
  const studentId = parseUuid(String(input.studentId ?? ""), "Estudante");
  const description = optionalText(input.description, 2000);
  const reason = optionalText(input.reason, 2000);
  if (!description) throw new CouncilDomainError("Descreva a intervenção.");
  if (!reason) throw new CouncilDomainError("Informe o motivo ou contexto da intervenção.");
  const { count: studentCount, error: studentError } = await supabaseAdmin.from("students").select("id", { count: "exact", head: true }).eq("id", studentId);
  if (studentError) throw new Error(studentError.message);
  if (!studentCount) throw new CouncilDomainError("Estudante não encontrado.", 404, "not_found");
  const currentClass = await currentClassForStudent(studentId);
  const { data, error } = await supabaseAdmin.from("class_council_interventions").insert({
    source_type: input.sourceType,
    target_type: "student",
    target_student_id: studentId,
    target_school_year: currentClass?.schoolYear ?? new Date().getFullYear(),
    target_class_official_code: currentClass?.code ?? null,
    target_class_name: currentClass?.name ?? null,
    description,
    reason,
    responsible_name: optionalText(input.responsibleName, 200),
    due_date: optionalText(input.dueDate, 10),
    created_by: actorId,
    updated_by: actorId,
  }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}
