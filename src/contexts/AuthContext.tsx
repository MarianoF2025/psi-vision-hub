'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase';
import { useCRMStore } from '@/stores/crm-store';

// Emails con acceso a Vision Hub
const VISION_HUB_EMAILS = ['marfer1@gmail.com', 'ninadulcich@gmail.com'];

interface Profile {
  id: string;
  email: string;
  nombre?: string;
  apellido?: string;
  rol?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  tieneAccesoVisionHub: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { setUsuario } = useCRMStore();
  const supabase = getSupabaseBrowser();

  const tieneAccesoVisionHub = user?.email ? VISION_HUB_EMAILS.includes(user.email) : false;

  const loadProfile = useCallback(async (authUser: User) => {
    const nombreFromMetadata = authUser.user_metadata?.nombre;
    const rolFromMetadata = authUser.user_metadata?.rol;
    const profileData = {
      id: authUser.id,
      email: authUser.email || '',
      nombre: nombreFromMetadata || authUser.email?.split('@')[0] || 'Usuario',
      rol: rolFromMetadata || 'agente',
    };
    setProfile(profileData);
    setUsuario(profileData);
  }, [setUsuario]);

  const refreshProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await loadProfile(currentUser);
    }
  }, [supabase, loadProfile]);

  useEffect(() => {
    let mounted = true;
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await loadProfile(session.user);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) setLoading(false);
      }
    };
    getInitialSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log('Auth event:', event);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user);
        } else {
          setProfile(null);
          setUsuario(null);
        }
        setLoading(false);
      }
    );
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile, setUsuario]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message === 'Invalid login credentials') {
          return { error: 'Email o contraseña incorrectos' };
        }
        return { error: error.message };
      }
      
      // Redirigir según email
      if (VISION_HUB_EMAILS.includes(email.toLowerCase())) {
        window.location.href = '/inicio';
      } else {
        window.location.href = '/crm';
      }
      return { error: null };
    } catch (err) {
      return { error: 'Error de conexión. Intenta de nuevo.' };
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setUsuario(null);
    window.location.href = '/';
  }, [supabase, setUsuario]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: 'Error de conexión. Intenta de nuevo.' };
    }
  }, [supabase]);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: 'Error de conexión. Intenta de nuevo.' };
    }
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signOut, resetPassword, updatePassword, refreshProfile, tieneAccesoVisionHub }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
