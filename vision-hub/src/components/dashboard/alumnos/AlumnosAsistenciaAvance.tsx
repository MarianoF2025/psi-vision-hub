'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users } from 'lucide-react';
import { fetchAsistenciaVsAvance, type AsistenciaAvanceData } from '@/lib/supabase-alumnos';
import InfoTooltip from './InfoTooltip';

const BUCKET_COLORS: Record<string, string> = {
  'Sin asistencia': '#94a3b8',
  '1-25%': '#f59e0b',
  '25-50%': '#22c55e',
  '50-75%': '#059669',
  '75-100%': '#047857',
};

const formatNumber = (v: number) => new Intl.NumberFormat('es-AR').format(v);

interface Props {
  cursosCodigos?: string[] | null;
  desde?: string | null;
  hasta?: string | null;
  cohortesSeleccionadas?: string[] | null;
}

export default function AlumnosAsistenciaAvance({ cursosCodigos, desde, hasta, cohortesSeleccionadas }: Props) {
  const [data, setData] = useState<AsistenciaAvanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchAsistenciaVsAvance(cursosCodigos, desde, hasta, cohortesSeleccionadas).then((d) => {
      setData(d);
      setIsLoading(false);
    });
  }, [cursosCodigos, desde, hasta, cohortesSeleccionadas]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-48 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (!data || !data.resumen || data.resumen.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          Asistencia vs Avance
        </h3>
        <div className="h-28 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <p className="text-xs text-gray-400">Sin datos de cruce para el filtro actual</p>
        </div>
      </div>
    );
  }

  const chartData = data.resumen.map((b) => ({
    bucket: b.bucket,
    avance: b.avance_promedio || 0,
    alumnos: b.alumnos,
    fill: BUCKET_COLORS[b.bucket] || '#94a3b8',
  }));

  const { totales } = data;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          Asistencia vs Avance
          <InfoTooltip text="Cruza asistencia a clases en vivo (Zoom) con avance en la plataforma (Educativa). Cada barra muestra el avance promedio de alumnos según su rango de asistencia. Responde: ¿los que van a clase avanzan más? Solo cohortes con clases Zoom desde jun 2025. Fuente: Zoom + Educativa." />
        </h3>
      </div>
      <p className="text-[10px] text-gray-400 mb-4">¿Los que van a clase avanzan más? · Cohortes jun 2025+</p>

      <div className="space-y-2.5">
        {chartData.map((row) => (
          <div key={row.bucket} className="flex items-center gap-2.5">
            <span className="text-[10px] text-gray-500 w-[80px] text-right flex-shrink-0 truncate">
              {row.bucket}
            </span>
            <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md flex items-center pl-2.5 transition-all duration-500"
                style={{ width: `${Math.max(row.avance, 5)}%`, backgroundColor: row.fill }}
              >
                <span className="text-[11px] font-semibold text-white drop-shadow-sm">
                  {row.avance}%
                </span>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 w-[65px] text-right flex-shrink-0">
              {formatNumber(row.alumnos)} al.
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-gray-400">Avance CON asistencia</p>
          <p className="text-base font-bold text-emerald-600">
            {totales.avance_promedio_con_asist ?? '—'}%
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-gray-400">Avance SIN asistencia</p>
          <p className="text-base font-bold text-gray-500">
            {totales.avance_promedio_sin_asist ?? '—'}%
          </p>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {formatNumber(totales.total_alumnos)} alumnos · {formatNumber(totales.con_asistencia)} con asistencia registrada
        </span>
      </div>
    </div>
  );
}
