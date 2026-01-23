'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutos
const RECONEXION_THRESHOLD = 60 * 1000; // 1 minuto - evitar duplicados

export function useSessionTracker() {
  const { user } = useAuth();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const ultimaConexionRef = useRef<number>(0);
  const isActiveRef = useRef(true);

  const getUserData = useCallback(() => {
    if (!user?.id || !user?.email) return null;
    return {
      usuario_id: user.id,
      usuario_email: user.email,
      usuario_nombre: user.user_metadata?.nombre || user.user_metadata?.full_name || user.email?.split('@')[0],
      fecha: new Date().toISOString().split('T')[0],
    };
  }, [user?.id, user?.email, user?.user_metadata]);

  const registrarConexion = useCallback(async (esHeartbeat = false) => {
    const userData = getUserData();
    if (!userData) return;

    const ahora = Date.now();
    if (!esHeartbeat && ahora - ultimaConexionRef.current < RECONEXION_THRESHOLD) {
      console.log('[SessionTracker] Conexión reciente, saltando...');
      return;
    }

    try {
      await supabase.from('agentes_sesiones').insert({
        ...userData,
        tipo: 'conexion',
        metadata: esHeartbeat ? { heartbeat: true } : { 
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null 
        }
      });
      
      ultimaConexionRef.current = ahora;
      console.log(`[SessionTracker] ${esHeartbeat ? 'Heartbeat' : 'Conexión'} registrado`);
    } catch (error) {
      console.error('[SessionTracker] Error registrando conexión:', error);
    }
  }, [getUserData]);

  const iniciarHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(() => {
      if (isActiveRef.current) {
        registrarConexion(true);
      }
    }, HEARTBEAT_INTERVAL);

    console.log('[SessionTracker] Heartbeat iniciado');
  }, [registrarConexion]);

  const detenerHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
      console.log('[SessionTracker] Heartbeat detenido');
    }
  }, []);

  useEffect(() => {
    if (!user?.id || !user?.email) return;

    // Registrar conexión inicial
    registrarConexion(false);
    iniciarHeartbeat();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[SessionTracker] Pestaña visible - reactivando');
        isActiveRef.current = true;
        registrarConexion(true);
        iniciarHeartbeat();
      } else {
        console.log('[SessionTracker] Pestaña oculta - pausando');
        isActiveRef.current = false;
        detenerHeartbeat();
      }
    };

    const handleBeforeUnload = () => {
      const userData = getUserData();
      if (!userData) return;

      const payload = JSON.stringify({
        ...userData,
        tipo: 'desconexion',
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/session-tracker', blob);
      }
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        const userData = getUserData();
        if (!userData) return;

        const payload = JSON.stringify({
          ...userData,
          tipo: 'desconexion',
        });

        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon('/api/session-tracker', blob);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      detenerHeartbeat();
      // NO registrar desconexión aquí - solo en beforeunload/pagehide
    };
  }, [user?.id, user?.email, registrarConexion, iniciarHeartbeat, detenerHeartbeat, getUserData]);
}
