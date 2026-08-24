import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  MANAGED_USER_ROLES,
  type CreateManagedUserInput,
  type ManagedUser,
  type ManagedUserRole,
  type UpdateManagedUserInput,
} from "@/types/admin-users";
import type { Json } from "@/types/database.types";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export class UserAdminDomainError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409 = 400,
    public readonly code = "invalid_request",
  ) {
    super(message);
  }
}

function isManagedRole(value: unknown): value is ManagedUserRole {
  return typeof value === "string" && MANAGED_USER_ROLES.includes(value as ManagedUserRole);
}

function toManagedUser(profile: ProfileRow): ManagedUser {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    role: profile.role as ManagedUserRole,
    isActive: profile.is_active,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export function parseCreateManagedUserInput(value: unknown): CreateManagedUserInput {
  if (!value || typeof value !== "object") {
    throw new UserAdminDomainError("Dados do usuário inválidos.");
  }

  const input = value as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new UserAdminDomainError("Informe um e-mail válido.");
  }
  if (fullName.length < 3 || fullName.length > 100) {
    throw new UserAdminDomainError("O nome deve ter entre 3 e 100 caracteres.");
  }
  if (!isManagedRole(input.role)) {
    throw new UserAdminDomainError("Papel de acesso inválido.");
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new UserAdminDomainError("A senha temporária deve ter 8 caracteres, uma letra e um número.");
  }

  return { email, fullName, role: input.role, password };
}

export function parseUpdateManagedUserInput(value: unknown): UpdateManagedUserInput {
  if (!value || typeof value !== "object") {
    throw new UserAdminDomainError("Alterações inválidas.");
  }

  const input = value as Record<string, unknown>;
  const updates: UpdateManagedUserInput = {};

  if (input.role !== undefined) {
    if (!isManagedRole(input.role)) throw new UserAdminDomainError("Papel de acesso inválido.");
    updates.role = input.role;
  }
  if (input.isActive !== undefined) {
    if (typeof input.isActive !== "boolean") throw new UserAdminDomainError("Status inválido.");
    updates.isActive = input.isActive;
  }
  if (updates.role === undefined && updates.isActive === undefined) {
    throw new UserAdminDomainError("Nenhuma alteração foi informada.");
  }

  return updates;
}

export function assertManagedUserUpdateAllowed({
  userId,
  actorId,
  currentRole,
  currentIsActive,
  updates,
  activeAdminCount,
}: {
  userId: string;
  actorId: string;
  currentRole: string;
  currentIsActive: boolean;
  updates: UpdateManagedUserInput;
  activeAdminCount?: number;
}) {
  if (userId === actorId && updates.isActive === false) {
    throw new UserAdminDomainError("Você não pode desativar a própria conta.", 409, "self_deactivation");
  }
  if (userId === actorId && updates.role && updates.role !== "admin") {
    throw new UserAdminDomainError(
      "Você não pode remover o próprio papel de administrador.",
      409,
      "self_demotion",
    );
  }

  const nextRole = updates.role ?? currentRole;
  const nextIsActive = updates.isActive ?? currentIsActive;
  const removesActiveAdmin =
    currentRole === "admin" && currentIsActive && (nextRole !== "admin" || !nextIsActive);

  if (removesActiveAdmin && activeAdminCount !== undefined && activeAdminCount <= 1) {
    throw new UserAdminDomainError(
      "O FelixHub precisa manter pelo menos um administrador ativo.",
      409,
      "last_admin",
    );
  }

  return { nextRole, nextIsActive, removesActiveAdmin };
}

async function writeAudit({
  actorId,
  targetUserId,
  action,
  oldValues = {},
  newValues = {},
}: {
  actorId: string;
  targetUserId: string;
  action: "user_created" | "role_changed" | "user_activated" | "user_deactivated";
  oldValues?: Record<string, Json | undefined>;
  newValues?: Record<string, Json | undefined>;
}) {
  const { error } = await supabaseAdmin.from("user_admin_audit_log").insert({
    actor_id: actorId,
    target_user_id: targetUserId,
    action,
    old_values: oldValues,
    new_values: newValues,
  });
  if (error) throw new Error(error.message);
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, is_active, created_at, updated_at")
    .order("full_name", { ascending: true, nullsFirst: false })
    .order("email", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as ProfileRow[]).map(toManagedUser);
}

export async function createManagedUser(value: unknown, actorId: string): Promise<ManagedUser> {
  const input = parseCreateManagedUserInput(value);
  const authResult = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (authResult.error || !authResult.data.user) {
    const duplicate = authResult.error?.message.toLowerCase().includes("already");
    throw new UserAdminDomainError(
      duplicate ? "Já existe uma conta com este e-mail." : "Não foi possível criar a conta.",
      duplicate ? 409 : 400,
      duplicate ? "email_exists" : "auth_create_failed",
    );
  }

  const userId = authResult.data.user.id;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: userId,
      email: input.email,
      full_name: input.fullName,
      role: input.role,
      is_active: true,
    })
    .select("id, email, full_name, avatar_url, role, is_active, created_at, updated_at")
    .single();

  if (error || !data) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new UserAdminDomainError("A conta não pôde ser vinculada ao perfil.", 400, "profile_create_failed");
  }

  try {
    await writeAudit({
      actorId,
      targetUserId: userId,
      action: "user_created",
      newValues: { email: input.email, full_name: input.fullName, role: input.role, is_active: true },
    });
  } catch {
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new UserAdminDomainError("Não foi possível registrar a criação da conta.", 400, "audit_failed");
  }

  return toManagedUser(data as ProfileRow);
}

export async function updateManagedUser(
  userId: string,
  value: unknown,
  actorId: string,
): Promise<ManagedUser> {
  const updates = parseUpdateManagedUserInput(value);
  const { data: current, error: currentError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, is_active, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (currentError) throw new Error(currentError.message);
  if (!current) throw new UserAdminDomainError("Usuário não encontrado.", 404, "not_found");

  const nextState = assertManagedUserUpdateAllowed({
    userId,
    actorId,
    currentRole: current.role,
    currentIsActive: current.is_active,
    updates,
  });

  if (nextState.removesActiveAdmin) {
    const { count, error } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    assertManagedUserUpdateAllowed({
      userId,
      actorId,
      currentRole: current.role,
      currentIsActive: current.is_active,
      updates,
      activeAdminCount: count ?? 0,
    });
  }

  if (updates.isActive !== undefined && updates.isActive !== current.is_active) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: updates.isActive ? "none" : "876000h",
    });
    if (error) throw new UserAdminDomainError("Não foi possível alterar o acesso da conta.");
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ role: nextState.nextRole, is_active: nextState.nextIsActive })
    .eq("id", userId)
    .select("id, email, full_name, avatar_url, role, is_active, created_at, updated_at")
    .single();

  if (error || !data) {
    if (updates.isActive !== undefined && updates.isActive !== current.is_active) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: current.is_active ? "none" : "876000h",
      });
    }
    throw new UserAdminDomainError("Não foi possível atualizar o usuário.");
  }

  try {
    if (updates.role !== undefined && updates.role !== current.role) {
      await writeAudit({
        actorId,
        targetUserId: userId,
        action: "role_changed",
        oldValues: { role: current.role },
        newValues: { role: updates.role },
      });
    }
    if (updates.isActive !== undefined && updates.isActive !== current.is_active) {
      await writeAudit({
        actorId,
        targetUserId: userId,
        action: updates.isActive ? "user_activated" : "user_deactivated",
        oldValues: { is_active: current.is_active },
        newValues: { is_active: updates.isActive },
      });
    }
  } catch {
    await supabaseAdmin
      .from("profiles")
      .update({ role: current.role, is_active: current.is_active })
      .eq("id", userId);
    if (updates.isActive !== undefined && updates.isActive !== current.is_active) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: current.is_active ? "none" : "876000h",
      });
    }
    throw new UserAdminDomainError("Não foi possível registrar a alteração.", 400, "audit_failed");
  }

  return toManagedUser(data as ProfileRow);
}
