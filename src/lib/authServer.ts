import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateTeacherSession } from "@/lib/authTeacherEdge";

export async function verifyApiAuth(req: NextRequest): Promise<boolean> {
  const teacherToken = req.cookies.get('teacher_session')?.value;
  if (await validateTeacherSession(teacherToken)) return true;
  
  const sbToken = req.cookies.get('sb_access_token')?.value;
  if (!sbToken) return false;
  
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(sbToken);
  if (error || !user) return false;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();
  return !profileError && profile?.is_active === true;
}
