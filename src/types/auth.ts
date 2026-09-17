export type AuthUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  fullName: string | null;
  avatarUrl: string | null;
};
