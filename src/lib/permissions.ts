import { useState, useEffect } from 'react';

export interface UserPermission {
  id: string;
  email: string;
  nombre: string;
  es_admin: boolean;
  inboxes: string[];
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
  if (permissions.es_admin) return true;
  // Verificar que inboxes exista y sea un array antes de usar includes
  if (!permissions.inboxes || !Array.isArray(permissions.inboxes)) return false;
  return permissions.inboxes.includes(inboxId);
}

export function isAdmin(permissions: UserPermission | null): boolean {
  return permissions?.es_admin === true;
}

export function canViewStats(permissions: UserPermission | null): boolean {
  if (!permissions) return false;
  return permissions.es_admin === true;
}

export function canExport(permissions: UserPermission | null): boolean {
  if (!permissions) return false;
  return permissions.es_admin === true;
}

export function canEditContacts(permissions: UserPermission | null): boolean {
  if (!permissions) return false;
  return permissions.es_admin === true;
}
