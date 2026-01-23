'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function useSessionTracker() {
  const { user } = useAuth();
  const registrado = useRef(false);
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.id || !user?.email) return;

    const registrarConexion = async () => {
      if (registrado.current) return;
      
      try {
        await supabase.from('agentes_sesiones').insert({
          usuario_id: user.id,
          usuario_email: user.email,
          usuario_nombre: user.user_metadata?.nombre || user.user_metadata?.full_name || user.email?.split('@')[0],
          tipo: 'conexion',
          fecha: new Date().toISOString().split('T')[0],
          metadata: {
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          }
        });
        registrado.current = true;
        console.log('[SessionTracker] Conexión registrada');
      } catch (error) {
        console.error('[SessionTracker] Error registrando conexión:', error);
      }
    };

    const registrarDesconexion = async () => {
      if (!registrado.current) return;

      try {
        await supabase.from('agentes_sesiones').insert({
          usuario_id: user.id,
          usuario_email: user.email,
          usuario_nombre: user.user_metadata?.nombre || user.user_metadata?.full_name || user.email?.split('@')[0],
          tipo: 'desconexion',
          fecha: new Date().toISOString().split('T')[0],
        });
        console.log('[SessionTracker] Desconexión registrada');
      } catch (error) {
        console.error('[SessionTracker] Error registrando desconexión:', error);
      }
    };

    // Heartbeat cada 5 minutos para mantener el estado "conectado"
    const actualizarHeartbeat = async () => {
      if (!registrado.current) return;
      
      try {
        // Insertar un registro de "conexion" como heartbeat
        // La vista agentes_estado_actual usa los últimos 30 min para determinar si está conectado
        await supabase.from('agentes_sesiones').insert({
          usuario_id: user.id,
          usuario_email: user.email,
          usuario_nombre: user.user_metadata?.nombre || user.user_metadata?.full_name || user.email?.split('@')[0],
          tipo: 'conexion',
          fecha: new Date().toISOString().split('T')[0],
          metadata: { heartbeat: true }
        });
      } catch (error) {
        console.error('[SessionTracker] Error en heartbeat:', error);
      }
    };

    // Registrar conexión al montar
    registrarConexion();

    // Heartbeat cada 5 minutos
    intervaloRef.current = setInterval(actualizarHeartbeat, 5 * 60 * 1000);

    // Registrar desconexión al cerrar pestaña/navegador
    const handleBeforeUnload = () => {
      // Usar sendBeacon para garantizar que se envíe antes de cerrar
      const payload = JSON.stringify({
        usuario_id: user.id,
        usuario_email: user.email,
        usuario_nombre: user.user_metadata?.nombre || user.user_metadata?.full_name || user.email?.split('@')[0],
        tipo: 'desconexion',
        fecha: new Date().toISOString().split('T')[0],
      });

      // sendBeacon es más confiable para enviar datos al cerrar
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/session-tracker', blob);
      }
    };

    // Registrar desconexión cuando la pestaña pierde visibilidad por mucho tiempo
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Podríamos registrar una "pausa" aquí si queremos más granularidad
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
      }

      // Registrar desconexión al desmontar (logout, cambio de página fuera del CRM)
      registrarDesconexion();
    };
  }, [user?.id, user?.email, user?.user_metadata]);
}
