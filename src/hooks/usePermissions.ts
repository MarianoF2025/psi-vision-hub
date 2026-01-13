'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UserPermissions {
  es_admin: boolean;
  inboxes: string[];
  nombre: string;
}

interface UsePermissionsReturn {
  permisos: UserPermissions | null;
  cargando: boolean;
  esAdmin: boolean;
  inboxesPermitidos: string[];
  puedeVerInbox: (inbox: string) => boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();
  const [permisos, setPermisos] = useState<UserPermissions | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarPermisos() {
      if (!user?.email) {
        setCargando(false);
        return;
      }

      try {
        const res = await fetch(`/api/permissions?email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        
        if (data.permissions) {
          setPermisos({
            es_admin: data.permissions.es_admin,
            inboxes: data.permissions.inboxes || [],
            nombre: data.permissions.nombre || ''
          });
        } else {
          setPermisos(null);
        }
      } catch (error) {
        console.error('Error cargando permisos:', error);
        setPermisos(null);
      } finally {
        setCargando(false);
      }
    }

    cargarPermisos();
  }, [user?.email]);

  const esAdmin = permisos?.es_admin ?? false;
  const inboxesPermitidos = permisos?.inboxes ?? [];

  const puedeVerInbox = (inbox: string): boolean => {
    if (esAdmin) return true;
    const inboxNormalizado = inbox === 'admin' ? 'administracion' : inbox;
    return inboxesPermitidos.includes(inboxNormalizado);
  };

  return {
    permisos,
    cargando,
    esAdmin,
    inboxesPermitidos,
    puedeVerInbox
  };
}
