import { useState, useEffect } from 'react';

export interface UserPermission {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'area-unica' | 'multi-area' | 'viewer';
  areas: string[];
  modulos_extra: string[];
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserPermissions(userEmail: string | undefined) {
  const [permissions, setPermissions] = useState<UserPermission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userEmail) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/permissions?email=${encodeURIComponent(userEmail)}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Error al obtener permisos');
        }
        
        setPermissions(data.permissions);
      } catch (err) {
        console.error('Error fetching permissions:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [userEmail]);

  return { permissions, loading, error };
}

export function canAccessInbox(permissions: UserPermission | null, inboxId: string): boolean {
  if (!permissions) return false;
  if (permissions.rol === 'admin') return true;
  // Verificar que areas exista y sea un array antes de usar includes
  if (!permissions.areas || !Array.isArray(permissions.areas)) return false;
  return permissions.areas.includes(inboxId);
}

export function isAdmin(permissions: UserPermission | null): boolean {
  return permissions?.rol === 'admin';
}

export function canViewStats(permissions: UserPermission | null): boolean {
  if (!permissions) return false;
  return permissions.rol === 'admin';
}

export function canExport(permissions: UserPermission | null): boolean {
  if (!permissions) return false;
  return permissions.rol === 'admin';
}

export function canEditContacts(permissions: UserPermission | null): boolean {
  if (!permissions) return false;
  return permissions.rol === 'admin' || permissions.rol === 'multi-area';
}
