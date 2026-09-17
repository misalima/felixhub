import type { NextRequest } from "next/server";

import type { AuthUser } from "@/types/auth";
export type StaffProfile = { id: string; role: string; is_active: boolean; full_name?: string | null };

export class StaffAuthError extends Error {
  constructor(message: string, public readonly status: 401 | 403) {
    super(message);
  }
}

export type AuthDependencies = {
  getUser: (token: string) => Promise<{ user: AuthUser | null; error: unknown }>;
  getProfile: (userId: string) => Promise<{ profile: StaffProfile | null; error: unknown }>;
};

const defaultDependencies: AuthDependencies = {
  async getUser(token) {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    return { user: data.user as unknown as AuthUser, error };
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

export async function requireStaff(req: NextRequest, dependencies: AuthDependencies = defaultDependencies) {
  const token = req.cookies.get("sb_access_token")?.value;
  if (!token) throw new StaffAuthError("Sessão necessária.", 401);

  const { user, error: userError } = await dependencies.getUser(token);
  if (userError || !user) throw new StaffAuthError("Sessão inválida ou expirada.", 401);

  const { profile, error: profileError } = await dependencies.getProfile(user.id);
  if (profileError || !profile || !profile.is_active || !["admin", "gestor", "coordenador"].includes(profile.role)) {
    throw new StaffAuthError("Acesso não autorizado. Seu perfil não tem permissão para acessar este recurso.", 403);
  }

  return { user, profile };
}
