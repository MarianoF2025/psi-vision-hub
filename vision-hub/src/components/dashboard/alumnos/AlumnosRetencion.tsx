'use client';

import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchEducativaMetricas, type EducativaMetricas } from '@/lib/supabase-alumnos';
import type { MetricasAlumnos } from '@/types/alumnos';
import InfoTooltip from './InfoTooltip';

const PSI_RED = '#e63946';

const RANGOS = [
  { key: 'rango_0', label: '0%', color: PSI_RED },
  { key: 'rango_1_25', label: '1-25%', color: '#f87171' },
  { key: 'rango_26_50', label: '26-50%', color: '#f59e0b' },
  { key: 'rango_51_75', label: '51-75%', color: '#64748b' },
  { key: 'rango_76_99', label: '76-99%', color: '#334155' },
  { key: 'rango_100', label: '100%', color: '#059669' },
];

const formatNumber = (v: number) => new Intl.NumberFormat('es-AR').format(v);

interface Props {
  metricas: MetricasAlumnos | null;
  isLoading: boolean;
  cursosCodigos?: string[] | null;
  cohortesSeleccionadas?: string[] | null;
}

export default function AlumnosRetencion({ metricas, isLoading, cursosCodigos, cohortesSeleccionadas }: Props) {
  const [educativa, setEducativa] = useState<EducativaMetricas | null>(null);
  const [eduLoading, setEduLoading] = useState(true);

  useEffect(() => {
    setEduLoading(true);
    fetchEducativaMetricas(cursosCodigos, cohortesSeleccionadas).then((data) => {
      setEducativa(data);
      setEduLoading(false);
    });
  }, [cursosCodigos, cohortesSeleccionadas]);

  const loading = isLoading || eduLoading;
  const dist = educativa?.distribucion_avance;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-48 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (!educativa || !dist) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-gray-400" />
          Avance Académico
        </h3>
        <div className="h-28 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <p className="text-xs text-gray-400">Sin datos de Educativa para el filtro actual</p>
        </div>
      </div>
    );
  }

  const total = educativa.total_alumnos || 1;
  const chartData = [{
    name: 'Cohorte',
    ...Object.fromEntries(RANGOS.map(r => [r.key, (dist as any)[r.key] || 0]))
  }];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-500" />
          Avance Académico
          <InfoTooltip text="Distribución de alumnos según su % de avance en la plataforma Educativa. Cada rango muestra cuántos alumnos completaron ese porcentaje del contenido. Los que están en 0% nunca ingresaron al campus. Fuente: API Educativa (campus virtual)." />
        </h3>
        <span className="text-[10px] text-gray-400">
          {formatNumber(educativa.total_alumnos)} alumnos en plataforma
          {educativa.inscriptos_cohorte ? ` · ${formatNumber(educativa.inscriptos_cohorte)} inscriptos` : ''}
        </span>
      </div>

      <div className="h-12 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" barSize={28}>
            <XAxis type="number" hide domain={[0, total]} />
            <YAxis type="category" dataKey="name" hide />
            {RANGOS.map(r => (
              <Bar key={r.key} dataKey={r.key} stackId="a" fill={r.color} radius={0} />
            ))}
            <Tooltip
              formatter={(value: number, name: string) => {
                const rango = RANGOS.find(r => r.key === name);
                return [formatNumber(value) + ` (${Math.round(value / total * 100)}%)`, rango?.label || name];
              }}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {RANGOS.map(r => (
          <div key={r.key} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: r.color }} />
            <span className="text-[9px] text-gray-400">{r.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-400">% Completitud</p>
          <p className="text-sm font-bold text-gray-900">{Math.round((educativa.completaron / total) * 100)}%</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-400">Avance promedio</p>
          <p className="text-sm font-bold text-gray-900">{educativa.avance_promedio}%</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-400">Completaron</p>
          <p className="text-sm font-bold text-emerald-600">{formatNumber(educativa.completaron)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-400">Sin avance</p>
          <p className="text-sm font-bold" style={{ color: PSI_RED }}>{formatNumber(educativa.sin_avance)}</p>
        </div>
      </div>
    </div>
  );
}
