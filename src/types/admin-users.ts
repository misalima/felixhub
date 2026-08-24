export const MANAGED_USER_ROLES = ["admin", "gestor", "coordenador"] as const;
export type ManagedUserRole = (typeof MANAGED_USER_ROLES)[number];

export type ManagedUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: ManagedUserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateManagedUserInput = {
  email: string;
  fullName: string;
  role: ManagedUserRole;
  password: string;
};

export type UpdateManagedUserInput = {
  role?: ManagedUserRole;
  isActive?: boolean;
};
