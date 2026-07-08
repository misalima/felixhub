"use client";
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Track if we already initialized auth (prevents re-running getSession on navigations)
  const initialized = useRef(false);

  useEffect(() => {
    // Public paths that do not require any Supabase network/auth operations
    const PUBLIC_PATHS = [
      '/hub/professor-mentor/gerar-folha-de-frequencia',
      '/hub/professor-mentor/recomposicao'
    ];

    const isPublic = PUBLIC_PATHS.some(path => pathname === path || pathname?.startsWith(`${path}/`));

    if (isPublic) {
      setLoading(false);
      return;
    }

    // Only run the full session check once per app lifetime.
    // onAuthStateChange handles all subsequent changes.
    if (initialized.current) return;
    initialized.current = true;

    // onAuthStateChange fires INITIAL_SESSION immediately on mount with
    // the stored session (if any), so there is no need for a separate
    // getSession() call — which avoids the double-request race condition.
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          document.cookie = `sb_access_token=${session.access_token}; path=/; max-age=${session.expires_in}; samesite=lax`;
          
          // Tenta restaurar do cache local para evitar consulta lenta ao banco
          const cachedUserStr = localStorage.getItem('felixhub_user');
          if (cachedUserStr) {
            try {
              const cached = JSON.parse(cachedUserStr);
              if (cached && cached.id === session.user.id) {
                setUser(cached);
                setLoading(false);
                return;
              }
            } catch (e) {
              console.warn("Falha ao analisar usuário cacheado:", e);
            }
          }

          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

          const newUser = {
            id: session.user.id,
            email: session.user.email || '',
            role: data?.role || 'coordenador'
          };
          
          setUser(newUser);
          localStorage.setItem('felixhub_user', JSON.stringify(newUser));
        } else {
          document.cookie = `sb_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          localStorage.removeItem('felixhub_user');
          setUser(null);
        }
      } catch (err) {
        console.error("Erro ao carregar/escutar sessão do Supabase:", err);
        setUser(null);
      } finally {
        // Always clear loading after the first auth state event
        setLoading(false);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [pathname]);

  const login = async (email: string, password: string) => {
    try {
      const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (session?.user) {
        document.cookie = `sb_access_token=${session.access_token}; path=/; max-age=${session.expires_in}; samesite=lax`;
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        const newUser = {
          id: session.user.id,
          email: session.user.email || '',
          role: data?.role || 'coordenador'
        };

        setUser(newUser);
        localStorage.setItem('felixhub_user', JSON.stringify(newUser));
      }
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login';
      return { error: msg };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('felixhub_user');
      setUser(null);
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
