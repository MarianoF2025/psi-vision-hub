const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://grupos.psivisionhub.com/api'
  : 'http://localhost:3009/api';

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const gruposApi = {
  // Health
  health: () => api('/health'),
  // Grupos
  getGrupos: () => api('/grupos'),
  getGrupo: (id: string) => api(`/grupos/${id}`),
  sync: () => api('/grupos/sync', { method: 'POST' }),
  crearGrupo: (subject: string, description?: string) =>
    api('/grupos/crear', { method: 'POST', body: JSON.stringify({ subject, description }) }),
  updateGrupo: (id: string, data: { nombre?: string; descripcion?: string; categoria?: string }) =>
    api(`/grupos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGrupo: (id: string) =>
    api(`/grupos/${id}`, { method: 'DELETE' }),
  // Participantes
  getParticipantes: (grupoId: string) => api(`/grupos/${grupoId}/participantes`),
  addParticipantes: (grupoId: string, participants: string[]) =>
    api(`/grupos/${grupoId}/participantes/add`, { method: 'POST', body: JSON.stringify({ participants }) }),
  removeParticipantes: (grupoId: string, participants: string[]) =>
    api(`/grupos/${grupoId}/participantes/remove`, { method: 'POST', body: JSON.stringify({ participants }) }),
  // Envíos
  getEnvios: () => api('/envios'),
  programarEnvio: (data: {
    nombre: string; mensaje: string; mediaUrl?: string;
    gruposIds: string[]; distribuirEnHoras: number; inicioProgramado?: string;
  }) => api('/envios/programar', { method: 'POST', body: JSON.stringify(data) }),
  pausarEnvio: (id: string) => api(`/envios/${id}/pausar`, { method: 'POST' }),
  reanudarEnvio: (id: string) => api(`/envios/${id}/reanudar`, { method: 'POST' }),
  eliminarEnvio: (id: string) => api(`/envios/${id}`, { method: 'DELETE' }),
  getEnvioLog: (id: string) => api(`/envios/${id}/log`),
  // Secuencias
  getSecuencias: () => api('/secuencias'),
  // Invitaciones
  enviarInvitaciones: (data: {
    grupoId: string; inviteLink: string;
    destinatarios: { telefono: string; nombre: string }[];
    mensajeTemplate?: string;
  }) => api('/invitaciones/enviar', { method: 'POST', body: JSON.stringify(data) }),
  // Circuit
  resetCircuit: () => api('/circuit/reset', { method: 'POST' }),
  // Logs
  getAlertas: (limit?: number) => api(`/alertas?limit=${limit || 50}`),
  getLogs: (limit?: number) => api(`/logs?limit=${limit || 100}`),
  // Cron trigger manual
  triggerCron: () => api('/cron/trigger', { method: 'POST' }),
};
