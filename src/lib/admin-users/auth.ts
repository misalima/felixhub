import type { NextRequest } from "next/server";

import type { AuthUser } from "@/types/auth";
type AdminProfile = { id: string; role: string; is_active: boolean };

export class AdminAuthError extends Error {
  constructor(message: string, public readonly status: 401 | 403) {
    super(message);
  }
}

type AdminAuthDependencies = {
  getUser: (token: string) => Promise<{ user: { id: string } | null; error: unknown }>;
  getProfile: (userId: string) => Promise<{ profile: AdminProfile | null; error: unknown }>;
};

const defaultDependencies: AdminAuthDependencies = {
  async getUser(token) {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    return { user: data.user as unknown as AuthUser, error };
  },
  async getProfile(userId) {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", userId)
      .maybeSingle();
    return { profile: data, error };
  },
};

export async function requireAdmin(
  request: NextRequest,
  dependencies: AdminAuthDependencies = defaultDependencies,
) {
  const token = request.cookies.get("sb_access_token")?.value;
  if (!token) throw new AdminAuthError("Sessão necessária.", 401);

  const { user, error: userError } = await dependencies.getUser(token);
  if (userError || !user) throw new AdminAuthError("Sessão inválida ou expirada.", 401);

  const { profile, error: profileError } = await dependencies.getProfile(user.id);
  if (profileError || !profile || !profile.is_active || profile.role !== "admin") {
    throw new AdminAuthError("Apenas administradores podem gerenciar usuários.", 403);
  }

  return { user, profile };
}
