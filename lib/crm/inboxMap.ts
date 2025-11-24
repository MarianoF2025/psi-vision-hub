import { InboxType } from '@/lib/types/crm';

export const inboxToAreaMap: Record<InboxType, string> = {
  'PSI Principal': 'administracion',
  'Ventas': 'ventas1',
  'Alumnos': 'alumnos',
  'Administración': 'administracion',
  'Comunidad': 'comunidad',
};

const areaToInboxMap: Record<string, InboxType> = {
  administracion: 'PSI Principal',
  ventas1: 'Ventas',
  alumnos: 'Alumnos',
  comunidad: 'Comunidad',
};

export const getAreaFromInbox = (inbox: InboxType) =>
  inboxToAreaMap[inbox] || inbox.toLowerCase();

export const getInboxFromArea = (area?: string): InboxType =>
  areaToInboxMap[area?.toLowerCase() || ''] || 'PSI Principal';

