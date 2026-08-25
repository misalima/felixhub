import { collectSupabasePages } from "@/lib/class-council/pagination";
import { resolveCouncilCriteria } from "@/lib/class-council/constants";
import { CouncilDomainError } from "@/lib/class-council/validation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateIntervention } from "@/services/server/classCouncilService";
import type { InterventionReportData, InterventionReportItem, InterventionTargetType } from "@/types/intervention";
import type { BehaviorCategory, InterventionStatus } from "@/types/class-council";
import type { Json } from "@/types/database.types";

type RelatedCouncil = { id: string; school_year: number; term: number; meeting_date: string; current_import_id: string | null; criteria: Json | null };
type RelatedClass = { id: string; display_name: string; official_code: string };
type RelatedStudent = { id: string; canonical_name: string; enrollment_number: string };
type ContextEnrollment = { id: string; pedagogical_observation: string | null };
type ContextBehavior = { enrollment_id: string; category: string; description: string | null };
type ContextResult = { enrollment_id: string; import_id: string; term: number; grade: number | null };

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

export async function listInterventions(): Promise<InterventionReportData> {
  const rows = await collectSupabasePages(async (from, to) => {
    const { data, error } = await supabaseAdmin
      .from("class_council_interventions")
      .select("id, target_type, description, responsible_name, due_date, status, outcome, cancellation_reason, created_at, updated_at, origin_enrollment_id, origin_council:class_councils!class_council_interventions_origin_council_id_fkey(id, school_year, term, meeting_date, current_import_id, criteria), origin_class:class_council_classes!class_council_interventions_origin_class_id_fkey(id, display_name, official_code), student:students!class_council_interventions_target_student_id_fkey(id, canonical_name, enrollment_number)")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

  const enrollmentIds = [...new Set(rows.map((row) => row.origin_enrollment_id).filter((id): id is string => Boolean(id)))];
  const councils = new Map<string, RelatedCouncil>();
  for (const row of rows) {
    const council = relation(row.origin_council as RelatedCouncil | RelatedCouncil[] | null);
    if (council) councils.set(council.id, council);
  }
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

  const items = rows.flatMap((row) => {
    const council = relation(row.origin_council as RelatedCouncil | RelatedCouncil[] | null);
    const councilClass = relation(row.origin_class as RelatedClass | RelatedClass[] | null);
    const student = relation(row.student as RelatedStudent | RelatedStudent[] | null);
    if (!council || !councilClass) return [];
    const enrollmentId = row.origin_enrollment_id;
    const enrollment = enrollmentId ? enrollmentById.get(enrollmentId) : null;
    const criteria = resolveCouncilCriteria(council.criteria);
    const lowGradeCount = enrollmentId && council.current_import_id
      ? (resultsByEnrollment.get(enrollmentId) ?? []).filter((result) => result.import_id === council.current_import_id && result.term === council.term && result.grade !== null && Number(result.grade) < criteria.lowGradeThreshold).length
      : 0;
    return [{
      id: row.id,
      targetType: row.target_type as InterventionTargetType,
      description: row.description,
      responsibleName: row.responsible_name,
      dueDate: row.due_date,
      status: row.status as InterventionStatus,
      outcome: row.outcome,
      cancellationReason: row.cancellation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      statusChangedAt: row.updated_at,
      startedAt: row.status === "in_progress" || row.status === "completed" ? row.updated_at : null,
      completedAt: row.status === "completed" ? row.updated_at : null,
      cancelledAt: row.status === "cancelled" ? row.updated_at : null,
      origin: {
        councilId: council.id,
        schoolYear: council.school_year,
        term: council.term,
        meetingDate: council.meeting_date,
        classId: councilClass.id,
        className: councilClass.display_name,
        classCode: councilClass.official_code,
      },
      student: student ? { id: student.id, name: student.canonical_name, enrollmentNumber: student.enrollment_number } : null,
      councilContext: enrollmentId ? {
        lowGradeCount,
        behaviors: (behaviorsByEnrollment.get(enrollmentId) ?? []).map((behavior) => ({
          category: behavior.category as BehaviorCategory,
          description: behavior.description,
        })),
        pedagogicalObservation: enrollment?.pedagogical_observation ?? null,
      } : null,
    } satisfies InterventionReportItem];
  });

  return { generatedAt: new Date().toISOString(), items };
}

export async function updateInterventionById(interventionId: string, input: { status?: InterventionStatus; outcome?: unknown; cancellationReason?: unknown; responsibleName?: unknown; dueDate?: unknown }, actorId: string) {
  const { data, error } = await supabaseAdmin.from("class_council_interventions").select("origin_council_id").eq("id", interventionId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new CouncilDomainError("Intervenção não encontrada.", 404, "not_found");
  return updateIntervention(data.origin_council_id, interventionId, input, actorId);
}
