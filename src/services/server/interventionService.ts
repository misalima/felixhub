import { collectSupabasePages } from "@/lib/class-council/pagination";
import { CouncilDomainError } from "@/lib/class-council/validation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateIntervention } from "@/services/server/classCouncilService";
import type { InterventionReportData, InterventionReportItem, InterventionTargetType } from "@/types/intervention";
import type { InterventionStatus } from "@/types/class-council";

type RelatedCouncil = { id: string; school_year: number; term: number; meeting_date: string };
type RelatedClass = { id: string; display_name: string; official_code: string };
type RelatedStudent = { id: string; canonical_name: string; enrollment_number: string };

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function listInterventions(): Promise<InterventionReportData> {
  const rows = await collectSupabasePages(async (from, to) => {
    const { data, error } = await supabaseAdmin
      .from("class_council_interventions")
      .select("id, target_type, description, responsible_name, due_date, status, outcome, cancellation_reason, created_at, updated_at, origin_council:class_councils!class_council_interventions_origin_council_id_fkey(id, school_year, term, meeting_date), origin_class:class_council_classes!class_council_interventions_origin_class_id_fkey(id, display_name, official_code), student:students!class_council_interventions_target_student_id_fkey(id, canonical_name, enrollment_number)")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

  const items = rows.flatMap((row) => {
    const council = relation(row.origin_council as RelatedCouncil | RelatedCouncil[] | null);
    const councilClass = relation(row.origin_class as RelatedClass | RelatedClass[] | null);
    const student = relation(row.student as RelatedStudent | RelatedStudent[] | null);
    if (!council || !councilClass) return [];
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
