import { useCallback } from 'react';

/**
 * Parsea el string de período y devuelve fechas desde/hasta.
 * 
 * Formatos soportados:
 * - 'hoy' → fecha de hoy
 * - 'semana' → últimos 7 días
 * - 'mes' → últimos 30 días
 * - '2026' → año calendario completo
 * - '2026-03' → mes específico de un año
 * 
 * Si hay fechas manuales (fechaDesde/fechaHasta), tienen prioridad.
 */
export function parsePeriodo(
  periodo: string,
  fechaDesde?: string,
  fechaHasta?: string
): { desde: string | null; hasta: string | null } {
  // Fechas manuales tienen prioridad
  if (fechaDesde || fechaHasta) {
    return { desde: fechaDesde || null, hasta: fechaHasta || null };
  }

  const hoy = new Date();

  // Formato año-mes: "2026-03"
  if (/^\d{4}-\d{2}$/.test(periodo)) {
    const [anio, mes] = periodo.split('-').map(Number);
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const hasta = `${anio}-${String(mes).padStart(2, '0')}-${ultimoDia}`;
    return { desde, hasta };
  }

  // Formato año: "2026"
  if (/^\d{4}$/.test(periodo)) {
    const anio = parseInt(periodo);
    return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
  }

  // Períodos rápidos
  switch (periodo) {
    case 'hoy': {
      const d = hoy.toISOString().split('T')[0];
      return { desde: d, hasta: d };
    }
    case 'semana': {
      const inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - 7);
      return { desde: inicio.toISOString().split('T')[0], hasta: null };
    }
    case 'mes': {
      const inicio = new Date(hoy);
      inicio.setMonth(hoy.getMonth() - 1);
      return { desde: inicio.toISOString().split('T')[0], hasta: null };
    }
    default:
      return { desde: null, hasta: null };
  }
}

/**
 * Determina la agrupación para tendencias según el período.
 */
export function getAgrupacion(periodo: string): string {
  if (periodo === 'hoy' || periodo === 'semana') return 'dia';
  if (periodo === 'mes') return 'dia';
  if (/^\d{4}-\d{2}$/.test(periodo)) return 'dia';
  return 'mes';
}

/**
 * Año por defecto para inicializar el estado.
 */
export const PERIODO_DEFAULT = String(new Date().getFullYear());
