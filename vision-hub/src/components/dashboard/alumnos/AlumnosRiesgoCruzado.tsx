'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import InfoTooltip from '@/components/dashboard/alumnos/InfoTooltip';
import type { RiesgoCruzadoGlobal } from '@/types/alumnos';

const PSI_RED = '#e63946';
const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const NIVEL_CONFIG = [
  { key: 'criticos', label: 'Crítico', color: PSI_RED },
  { key: 'altos', label: 'Alto', color: '#ea580c' },
  { key: 'medios', label: 'Medio', color: '#d97706' },
  { key: 'bajos', label: 'Bajo', color: '#94a3b8' },
];

const EJES_CONFIG = [
  { key: 'cuotas', label: 'Cuotas', color: PSI_RED, critKey: 'cuotas_critico' as const, medKey: 'cuotas_medio' as const },
  { key: 'campus', label: 'Campus', color: '#d97706', critKey: 'campus_critico' as const, medKey: 'campus_medio' as const },
  { key: 'zoom', label: 'Zoom', color: '#2563eb', critKey: 'zoom_critico' as const, medKey: 'zoom_medio' as const },
  { key: 'historial', label: 'Historial', color: '#6b7280', critKey: 'historial_critico' as const, medKey: null },
];

function riesgoColor(score: number): string {
  if (score >= 80) return 'text-red-700';
  if (score >= 60) return 'text-orange-700';
  if (score >= 40) return 'text-amber-700';
  return 'text-emerald-700';
}

function riesgoBg(score: number): string {
  if (score >= 80) return 'bg-red-50';
  if (score >= 60) return 'bg-orange-50';
  if (score >= 40) return 'bg-amber-50';
  return 'bg-emerald-50';
}

interface Props {
  data: RiesgoCruzadoGlobal | null;
  isLoading: boolean;
}

export default function AlumnosRiesgoCruzado({ data, isLoading }: Props) {
  const router = useRouter();
  const [showDesglose, setShowDesglose] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-40 bg-gray-100 rounded-lg" />
          <div className="h-40 bg-gray-100 rounded-lg" />
          <div className="h-40 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data || data.distribucion.en_riesgo === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-[#e63946]" />
          Riesgo Cruzado
          <InfoTooltip text="Analiza TODOS los alumnos activos de todas las cohortes usando el modelo de 4 ejes: Cuotas (máx 30), Campus (máx 30), Zoom (máx 25), Historial (máx 15). Score ≥60 = en riesgo. Responde a filtros de curso y fecha." />
        </h3>
        <div className="h-28 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <p className="text-xs text-gray-400">Sin alumnos en riesgo detectados en el período</p>
        </div>
      </div>
    );
  }

  const dist = data.distribucion;
  const ejes = data.ejes;

  const pieData = NIVEL_CONFIG.map(n => ({
    name: n.label,
    value: (dist as any)[n.key] as number,
    color: n.color,
  })).filter(d => d.value > 0);

  const maxEje = Math.max(
    ejes.cuotas_critico, ejes.campus_critico, ejes.zoom_critico, ejes.historial_critico, 1
  );

  return (
    <div className="bg-white rounded-xl border-l-[3px] border-l-[#e63946] border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#e63946]" />
            Riesgo Cruzado
          </h3>
          <InfoTooltip text="Analiza TODOS los alumnos activos de todas las cohortes con el modelo de 4 ejes: Cuotas (máx 30pts) por estado de pago, Campus (máx 30pts) por actividad en plataforma, Zoom (máx 25pts) por asistencia a clases, Historial (máx 15pts) por bajas previas. Riesgo alto/crítico = score ≥60. Responde a filtros de curso y fecha." />
        </div>
        <span className="text-[10px] font-semibold text-[#e63946] bg-red-50 px-2.5 py-1 rounded-full">
          {dist.en_riesgo} alumnos en riesgo
        </span>
      </div>

      <div className="grid grid-cols-[160px_1fr_1fr] gap-5">
        {/* Donut + ejes */}
        <div className="flex flex-col items-center">
          <div className="w-[140px] h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%"
                  innerRadius={38} outerRadius={56} dataKey="value"
                  startAngle={90} endAngle={-270} paddingAngle={2} stroke="none">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
            {NIVEL_CONFIG.map(n => {
              const val = (dist as any)[n.key] as number;
              return val > 0 ? (
                <div key={n.key} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{ background: n.color }} />
                  <span className="text-[9px] text-gray-500">{n.label} <strong>{val}</strong></span>
                </div>
              ) : null;
            })}
          </div>

          {/* Ejes */}
          <div className="w-full mt-4 space-y-2">
            {EJES_CONFIG.map(e => {
              const crit = (ejes as any)[e.critKey] as number;
              return (
                <div key={e.key} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-medium text-gray-600">{e.label}</span>
                    <span className="text-[10px] font-semibold" style={{ color: e.color }}>{crit}</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${(crit / maxEje) * 100}%`,
                      backgroundColor: e.color,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top cursos */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Top cursos por % riesgo</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-1.5 text-left font-medium text-gray-500">Curso</th>
                <th className="py-1.5 text-right font-medium text-gray-500">En riesgo</th>
                <th className="py-1.5 text-right font-medium text-gray-500">Total</th>
                <th className="py-1.5 text-right font-medium text-gray-500">%</th>
              </tr>
            </thead>
            <tbody>
              {data.top_cursos.map(c => (
                <tr key={c.curso_codigo} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-700">{c.curso_codigo}</td>
                  <td className="py-2 text-right font-bold text-[#e63946]">{c.en_riesgo}</td>
                  <td className="py-2 text-right text-gray-500">{c.total}</td>
                  <td className="py-2 text-right">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      c.pct_riesgo > 25 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}>{c.pct_riesgo}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top alumnos */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Top alumnos por score</p>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {data.top_alumnos.map((a, i) => (
              <div key={`${a.dni}-${a.curso_codigo}`}
                onClick={() => router.push(`/alumnos/${a.educativa_codigo}`)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${riesgoBg(a.riesgo_score)} ${riesgoColor(a.riesgo_score)} border-current/20 shrink-0`}>
                  {a.riesgo_score}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-gray-800 truncate group-hover:text-[#e63946]">
                    {a.nombre}
                  </p>
                  <p className="text-[9px] text-gray-400 truncate">
                    {a.curso_codigo} · {MESES[a.cohorte_mes]} {a.cohorte_anio}
                  </p>
                </div>
                {/* Mini desglose */}
                <div className="hidden sm:flex gap-1 shrink-0">
                  {[
                    { pts: a.pts_cuotas, max: 30, color: PSI_RED },
                    { pts: a.pts_campus, max: 30, color: '#d97706' },
                    { pts: a.pts_zoom, max: 25, color: '#2563eb' },
                  ].map((e, j) => (
                    <div key={j} className="w-5 h-1.5 bg-gray-100 rounded-full overflow-hidden" title={`${e.pts}/${e.max}`}>
                      <div className="h-full rounded-full" style={{
                        width: `${(e.pts / e.max) * 100}%`,
                        backgroundColor: e.color,
                      }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
