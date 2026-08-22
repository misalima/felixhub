import type { NextRequest } from "next/server";

type AuthUser = { id: string; email?: string | null };
type CouncilProfile = { id: string; role: string; is_active: boolean; full_name?: string | null };

export class CouncilAuthError extends Error {
  constructor(message: string, public readonly status: 401 | 403) {
    super(message);
  }
}

type AuthDependencies = {
  getUser: (token: string) => Promise<{ user: AuthUser | null; error: unknown }>;
  getProfile: (userId: string) => Promise<{ profile: CouncilProfile | null; error: unknown }>;
};

const defaultDependencies: AuthDependencies = {
  async getUser(token) {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    return { user: data.user, error };
  },
  async getProfile(userId) {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, role, is_active, full_name")
      .eq("id", userId)
      .maybeSingle();
    return { profile: data, error };
  },
};

export async function requireCouncilStaff(req: NextRequest, dependencies: AuthDependencies = defaultDependencies) {
  // teacher_session is intentionally ignored. This module only accepts a real Supabase session.
  const token = req.cookies.get("sb_access_token")?.value;
  if (!token) throw new CouncilAuthError("Sessão necessária.", 401);

  const { user, error: userError } = await dependencies.getUser(token);
  if (userError || !user) throw new CouncilAuthError("Sessão inválida ou expirada.", 401);

  const { profile, error: profileError } = await dependencies.getProfile(user.id);
  if (profileError || !profile || !profile.is_active || !["admin", "gestor", "coordenador"].includes(profile.role)) {
    throw new CouncilAuthError("Seu perfil não tem acesso ao Conselho de Classe.", 403);
  }

  return { user, profile };
}
