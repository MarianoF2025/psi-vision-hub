import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Conversacion, InboxType } from '@/types/crm';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13 && cleaned.startsWith('549')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }
  return phone;
}

export function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function timeAgo(date?: string | null): string {
  if (!date) return '';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return past.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

export function formatMessageTime(date: string): string {
  return new Date(date).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getWindowTimeLeft(
  ventana24h?: string | null, 
  ventana72h?: string | null
): { texto: string; color: string; tipo: '24H' | '72H' } | null {
  // Priorizar ventana 72h (META ADS)
  const endDate = ventana72h || ventana24h;
  if (!endDate) return null;
  
  const tipo = ventana72h ? '72H' : '24H';
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return { texto: 'Expirada', color: 'text-slate-400', tipo };
  
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  let color = 'text-emerald-500';
  if (hours < 24) color = 'text-amber-500';
  if (hours < 12) color = 'text-rose-500';
  
  return { texto: `${hours}h ${minutes}m`, color, tipo };
}

export function getWebhookEnvio(
  conversacion: Conversacion, 
  webhooks: Record<InboxType, string>
): string {
  if (conversacion.desconectado_wsp4 && conversacion.inbox_fijo) {
    return webhooks[conversacion.inbox_fijo];
  }
  return webhooks[conversacion.linea_origen || 'wsp4'];
}

export function truncate(str: string, length: number): string {
  if (!str || str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getAvatarColor(id: string): string {
  const colors = [
    'from-indigo-400 to-purple-400',
    'from-emerald-400 to-teal-400',
    'from-amber-400 to-orange-400',
    'from-rose-400 to-pink-400',
    'from-cyan-400 to-blue-400',
  ];
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}
