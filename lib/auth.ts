import { createClient } from './supabase/server';
import { User, UserRole } from './types';

// Re-exportar tipos para compatibilidad
export type { User, UserRole };

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Obtener el rol del usuario desde la tabla de perfiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      role: (profile?.role as UserRole) || 'alumno',
      name: profile?.name,
    };
  } catch (error) {
    // Si Supabase no está configurado, retornar null (modo sin autenticación)
    return null;
  }
}

export function hasAdminAccess(role: UserRole): boolean {
  return role === 'admin' || role === 'developer';
}

