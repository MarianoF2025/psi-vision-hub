'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { fetchRiesgoResumen, type RiesgoResumen } from '@/lib/supabase-alumnos';

const PSI_RED = '#e63946';
const SLATE_400 = '#94a3b8';

const NIVEL_CONFIG: Record<string, { color: string; label: string }> = {
  CRITICO: { color: '#e63946', label: 'Cr\u00edtico' },
  ALTO: { color: '#ea580c', label: 'Alto' },
  MEDIO: { color: '#d97706', label: 'Medio' },
  BAJO: { color: '#94a3b8', label: 'Bajo' },
};

const formatNumber = (v: number) => new Intl.NumberFormat('es-AR').format(v);

interface Props {
  cursosCodigos?: string[] | null;
  cohortesSeleccionadas?: string[] | null;
}

export default function AlumnosRiesgo({ cursosCodigos, cohortesSeleccionadas }: Props) {
  const [data, setData] = useState<RiesgoResumen | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllCursos, setShowAllCursos] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetchRiesgoResumen(cursosCodigos, cohortesSeleccionadas).then((d) => {
      setData(d);
      setIsLoading(false);
    });
  }, [cursosCodigos, cohortesSeleccionadas]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-48 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (!data || data.total_en_riesgo === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-slate-400" />
          Riesgo de Abandono
        </h3>
        <div className="h-28 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <p className="text-xs text-slate-400">Sin alumnos en riesgo para el filtro actual</p>
        </div>
      </div>
    );
  }

  const pieData = (data.por_nivel || []).map((n) => ({
    name: NIVEL_CONFIG[n.riesgo_nivel]?.label || n.riesgo_nivel,
    value: n.alumnos,
    color: NIVEL_CONFIG[n.riesgo_nivel]?.color || SLATE_400,
  }));

  const cursosVisibles = showAllCursos ? data.por_curso : (data.por_curso || []).slice(0, 7);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Riesgo de Abandono
        </h3>
        <span className="text-[10px] text-slate-400">
          Cohortes 2025+ en curso - {formatNumber(data.total_en_riesgo)} alumnos en riesgo
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="flex flex-col items-center">
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.85} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="-mt-[130px] mb-[50px] text-center pointer-events-none">
            <p className="text-2xl font-bold text-slate-900">{formatNumber(data.total_en_riesgo)}</p>
            <p className="text-[10px] text-slate-400">en riesgo</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-1">
            {pieData.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                <span className="text-[10px] text-slate-500">{p.name} {formatNumber(p.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-700 mb-2">Top cursos en riesgo</p>
          <div className="overflow-y-auto max-h-56">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100">
                  <th className="text-left py-1.5 text-[10px] text-slate-400 font-medium">Curso</th>
                  <th className="text-right py-1.5 text-[10px] text-slate-400 font-medium">Cr</th>
                  <th className="text-right py-1.5 text-[10px] text-slate-400 font-medium">Total</th>
                  <th className="text-right py-1.5 text-[10px] text-slate-400 font-medium">Brecha</th>
                </tr>
              </thead>
              <tbody>
                {cursosVisibles.map((c) => (
                  <tr key={c.curso_codigo} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-1.5 font-medium text-slate-700">{c.curso_codigo}</td>
                    <td className="py-1.5 text-right font-semibold" style={{ color: PSI_RED }}>{c.criticos}</td>
                    <td className="py-1.5 text-right text-slate-500">{c.total_en_riesgo}</td>
                    <td className="py-1.5 text-right text-slate-500">{c.brecha_promedio}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(data.por_curso || []).length > 7 && (
            <button onClick={() => setShowAllCursos(!showAllCursos)}
              className="mt-2 text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto">
              {showAllCursos ? <><ChevronUp className="w-3 h-3" /> Mostrar menos</> : <><ChevronDown className="w-3 h-3" /> Ver todos ({data.por_curso.length})</>}
            </button>
          )}
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-700 mb-2">Alumnos mas criticos</p>
          <div className="overflow-y-auto max-h-56">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100">
                  <th className="text-left py-1.5 text-[10px] text-slate-400 font-medium">Alumno</th>
                  <th className="text-left py-1.5 text-[10px] text-slate-400 font-medium">Curso</th>
                  <th className="text-right py-1.5 text-[10px] text-slate-400 font-medium">Avance</th>
                  <th className="text-right py-1.5 text-[10px] text-slate-400 font-medium">Dias</th>
                </tr>
              </thead>
              <tbody>
                {(data.top_criticos || []).map((a, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-1.5 text-slate-700 max-w-[100px] truncate" title={a.nombre + ' ' + a.apellido}>
                      {a.nombre} {a.apellido?.charAt(0)}.
                    </td>
                    <td className="py-1.5 text-slate-500">{a.curso_codigo}</td>
                    <td className="py-1.5 text-right">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: '#fef2f2', color: PSI_RED }}>
                        {a.avance_pct}%
                      </span>
                    </td>
                    <td className="py-1.5 text-right text-slate-500">{a.dias_inscripto}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
