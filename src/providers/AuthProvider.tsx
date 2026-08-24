"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  fullName: string | null;
  avatarUrl: string | null;
}

type ProfileUpdate = {
  fullName?: string | null;
  avatarUrl?: string | null;
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_CACHE_KEY = "felixhub_user";

function normalizeCachedUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<AuthUser> & {
    full_name?: string | null;
    avatar_url?: string | null;
    is_active?: boolean;
  };

  if (!candidate.id || !candidate.email || !candidate.role) return null;

  return {
    id: candidate.id,
    email: candidate.email,
    role: candidate.role,
    isActive: candidate.isActive ?? candidate.is_active ?? true,
    fullName: candidate.fullName ?? candidate.full_name ?? null,
    avatarUrl: candidate.avatarUrl ?? candidate.avatar_url ?? null,
  };
}

function persistUser(user: AuthUser) {
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    const publicPaths = [
      "/hub/professor-mentor/gerar-folha-de-frequencia",
      "/hub/professor-mentor/recomposicao",
    ];

    const isPublic = publicPaths.some(
      (path) => pathname === path || pathname?.startsWith(`${path}/`),
    );

    if (isPublic) {
      setLoading(false);
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (!session?.user) {
          document.cookie = "sb_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          localStorage.removeItem(USER_CACHE_KEY);
          setUser(null);
          return;
        }

        document.cookie = `sb_access_token=${session.access_token}; path=/; max-age=${session.expires_in}; samesite=lax`;

        let cachedUser: AuthUser | null = null;
        const cachedUserString = localStorage.getItem(USER_CACHE_KEY);
        if (cachedUserString) {
          try {
            const cached = normalizeCachedUser(JSON.parse(cachedUserString));
            if (cached?.id === session.user.id) {
              cachedUser = cached;
              setUser(cached);
            }
          } catch {
            localStorage.removeItem(USER_CACHE_KEY);
          }
        }

        // Libera a interface imediatamente com a sessão/cache. Nome e avatar
        // são enriquecidos abaixo sem bloquear toda a aplicação numa rede lenta.
        const provisionalUser: AuthUser =
          cachedUser ?? {
            id: session.user.id,
            email: session.user.email || "",
            role: "coordenador",
            isActive: true,
            fullName: null,
            avatarUrl: null,
          };
        setUser(provisionalUser);
        setLoading(false);

        const { data, error } = await supabase
          .from("profiles")
          .select("role, is_active, full_name, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error && cachedUser) return;
        if (error) throw error;

        if (data && !data.is_active) {
          document.cookie = "sb_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          localStorage.removeItem(USER_CACHE_KEY);
          setUser(null);
          window.setTimeout(() => void supabase.auth.signOut(), 0);
          return;
        }

        const nextUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || cachedUser?.email || "",
          role: data?.role || cachedUser?.role || "coordenador",
          isActive: data?.is_active ?? cachedUser?.isActive ?? true,
          fullName: data?.full_name ?? cachedUser?.fullName ?? null,
          avatarUrl: data?.avatar_url ?? cachedUser?.avatarUrl ?? null,
        };

        setUser(nextUser);
        persistUser(nextUser);
      } catch (error) {
        console.error("Erro ao carregar/escutar sessão do Supabase:", error);
        setUser((currentUser) => currentUser ?? null);
      } finally {
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [pathname]);

  const login = async (email: string, password: string) => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (session?.user) {
        document.cookie = `sb_access_token=${session.access_token}; path=/; max-age=${session.expires_in}; samesite=lax`;

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_active, full_name, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (data && !data.is_active) {
          await supabase.auth.signOut();
          throw new Error("Esta conta está desativada.");
        }

        const nextUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || "",
          role: data?.role || "coordenador",
          isActive: data?.is_active ?? true,
          fullName: data?.full_name ?? null,
          avatarUrl: data?.avatar_url ?? null,
        };

        setUser(nextUser);
        persistUser(nextUser);
      }

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Erro ao fazer login" };
    }
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user) return { error: "Sessão não encontrada." };

    const payload: { full_name?: string | null; avatar_url?: string | null } = {};
    if (updates.fullName !== undefined) payload.full_name = updates.fullName;
    if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select("role, is_active, full_name, avatar_url")
      .single();

    if (error) return { error: error.message };

    const nextUser: AuthUser = {
      ...user,
      role: data.role,
      isActive: data.is_active,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
    };

    setUser(nextUser);
    persistUser(nextUser);
    return { error: null };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem(USER_CACHE_KEY);
      setUser(null);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
