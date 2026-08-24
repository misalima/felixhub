import { CouncilDomainError } from "@/lib/class-council/validation";
import { parseStudentSituation } from "@/lib/students/situationValidation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function updateStudentSituation(studentId: string, input: unknown, actorId: string) {
  const situation = parseStudentSituation(input);
  const { data: student, error: studentError } = await supabaseAdmin.from("students").select("id, current_situation").eq("id", studentId).maybeSingle();
  if (studentError) throw new Error(studentError.message);
  if (!student) throw new CouncilDomainError("Estudante não encontrado.", 404, "not_found");
  if (student.current_situation === situation) return { studentId, situation, changed: false };
  const { error } = await supabaseAdmin.rpc("set_student_current_situation", { p_student_id: studentId, p_situation: situation, p_actor_id: actorId });
  if (error) throw new Error(error.message);
  return { studentId, situation, changed: true };
}
