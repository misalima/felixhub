import { useAuth } from '../providers/AuthProvider';

export function useUser() {
  const { user, loading, logout, updateProfile } = useAuth();
  return { user, loading, logout, updateProfile, role: user?.role };
}
