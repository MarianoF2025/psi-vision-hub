'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCRMStore } from '@/stores/crm-store';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUsuario } = useCRMStore();

  useEffect(() => {
    // Cargar usuario actual
    const cargarUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Buscar perfil en tabla profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setUsuario(profile || {
          id: user.id,
          email: user.email,
          nombre: user.user_metadata?.nombre || user.email?.split('@')[0],
        });
      }
    };

    cargarUsuario();

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUsuario(null);
        router.push('/login');
      } else if (session?.user) {
        cargarUsuario();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, setUsuario]);

  return <>{children}</>;
}
