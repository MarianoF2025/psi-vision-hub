'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutos

export function useSessionTracker() {
  const { user } = useAuth();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const sesionIdRef = useRef<string | null>(null);
  const isActiveRef = useRef(true);

  const getUserData = useCallback(() => {
    if (!user?.id || !user?.email) return null;
    return {
      p_usuario_id: user.id,
      p_usuario_email: user.email,
      p_usuario_nombre: user.user_metadata?.nombre || user.user_metadata?.full_name || user.email?.split('@')[0],
      p_fecha: new Date().toISOString().split('T')[0],
    };
  }, [user?.id, user?.email, user?.user_metadata]);

  const verificarSesion = useCallback(async () => {
    const userData = getUserData();
    if (!userData) return;

    try {
      const { data, error } = await supabase.rpc('verificar_o_crear_sesion', userData);

      if (error) {
        console.error('[SessionTracker] Error RPC:', error);
        return;
      }

      if (data?.sesion_id) {
        sesionIdRef.current = data.sesion_id;
      }

      console.log(`[SessionTracker] ${data?.accion === 'nueva_sesion' ? '🟢 Nueva sesión' : '💓 Heartbeat'} - ID: ${data?.sesion_id}`);
    } catch (error) {
      console.error('[SessionTracker] Error:', error);
    }
  }, [getUserData]);

  const iniciarHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    heartbeatRef.current = setInterval(() => {
      if (isActiveRef.current) {
        verificarSesion();
      }
    }, HEARTBEAT_INTERVAL);
  }, [verificarSesion]);

  const detenerHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!user?.id || !user?.email) return;

    verificarSesion();
    iniciarHeartbeat();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isActiveRef.current = true;
        verificarSesion();
        iniciarHeartbeat();
      } else {
        isActiveRef.current = false;
        detenerHeartbeat();
      }
    };

    const handleBeforeUnload = () => {
      const userData = getUserData();
      if (!userData) return;

      const payload = JSON.stringify({
        usuario_id: userData.p_usuario_id,
        usuario_email: userData.p_usuario_email,
        usuario_nombre: userData.p_usuario_nombre,
        tipo: 'desconexion',
        fecha: userData.p_fecha,
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/session-tracker', blob);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      detenerHeartbeat();
    };
  }, [user?.id, user?.email, verificarSesion, iniciarHeartbeat, detenerHeartbeat, getUserData]);
}
