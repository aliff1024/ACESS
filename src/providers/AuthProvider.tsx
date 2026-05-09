'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthUser, Role } from '@/lib/auth-types';

interface PreviewState {
  active: boolean;
  role: Role | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  preview: PreviewState;
  enterPreview: (role: Role) => void;
  exitPreview: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function buildUser(session: { user?: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } } | null): AuthUser | null {
  if (!session?.user) return null;
  const meta = session.user.user_metadata || {};
  return {
    id: session.user.id,
    email: session.user.email || '',
    fullName: (meta.full_name as string) || session.user.email?.split('@')[0] || 'User',
    role: (meta.role as Role) || 'learner',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preview, setPreview] = useState<PreviewState>({ active: false, role: null });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setUser(buildUser(session));
          setIsLoading(false);
        });
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(buildUser(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setPreview({ active: false, role: null });
  }, []);

  const enterPreview = useCallback((role: Role) => {
    setPreview({ active: true, role });
  }, []);

  const exitPreview = useCallback(() => {
    setPreview({ active: false, role: null });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      signOut,
      preview,
      enterPreview,
      exitPreview,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function useRole(): Role | null {
  const { user, preview } = useAuth();
  if (preview.active) return preview.role;
  return user?.role ?? null;
}
