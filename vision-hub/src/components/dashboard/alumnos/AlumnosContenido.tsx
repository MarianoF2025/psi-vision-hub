'use client';

import { useState, useEffect } from 'react';
import { Monitor, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/lib/supabase-alumnos';
import InfoTooltip from '@/components/dashboard/alumnos/InfoTooltip';

const PSI_RED = '#e63946';
const NAVY = '#334155';

interface ClaseCohorte {
  zoom_uuid: string;
  fecha: string;
  topic: string;
  curso_codigo: string;
  asistentes_total: number;
  duration_minutes: number;
  asistentes_cohorte: number;
  total_cohorte: number;
}

interface AsistenciaCohorteData {
  total_alumnos_cohorte: number;
  clases: ClaseCohorte[];
}

function cohortesParam(c?: string[] | null): number[] | null {
  if (!c || c.length === 0) return null;
  const nums = c.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
  return nums.length > 0 ? nums : null;
}

interface Props {
  desde?: string | null;
  hasta?: string | null;
  cursosCodigos?: string[] | null;
  cohortesSeleccionadas?: string[] | null;
}

export default function AlumnosContenido({ desde, hasta, cursosCodigos, cohortesSeleccionadas }: Props) {
  const [data, setData] = useState<AsistenciaCohorteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);

  const tieneCohorte = cohortesSeleccionadas && cohortesSeleccionadas.length > 0;

  useEffect(() => {
    setIsLoading(true);
    const cc = cursosCodigos && cursosCodigos.length > 0 ? cursosCodigos : null;
    const gi = cohortesParam(cohortesSeleccionadas);

    supabase.rpc('get_zoom_asistencia_cohorte', {
      p_cursos_codigos: cc,
      p_educativa_grupo_ids: gi,
      p_fecha_desde: desde || null,
      p_fecha_hasta: hasta || null,
      p_limite: 30,
    }).then(({ data: d, error }) => {
      if (error) console.error('Error zoom asistencia cohorte:', error);
      setData(d as AsistenciaCohorteData);
      setIsLoading(false);
    });
  }, [desde, hasta, cursosCodigos, cohortesSeleccionadas]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-48 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  const clases = data?.clases || [];
  const totalCohorte = data?.total_alumnos_cohorte || 0;
  const totalClases = clases.length;
  const asistCohorteTotal = clases.reduce((s, c) => s + c.asistentes_cohorte, 0);
  const asistPromedio = totalClases > 0 ? Math.round(asistCohorteTotal / totalClases) : 0;
  const tasaPromedio = tieneCohorte && totalCohorte > 0 && totalClases > 0
    ? Math.round((asistCohorteTotal / totalClases / totalCohorte) * 100)
    : 0;
  const hsEnVivo = Math.round(clases.reduce((s, c) => s + c.duration_minutes, 0) / 60);

  const chartData = [...clases].reverse().map(c => ({
    name: new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
    total_cohorte: c.total_cohorte,
    asistieron: c.asistentes_cohorte,
    asistentes_total: c.asistentes_total,
    topic: c.topic,
    curso: c.curso_codigo,
    pct: c.total_cohorte > 0 ? Math.round((c.asistentes_cohorte / c.total_cohorte) * 100) : 0,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-slate-400" />
            Clases en Vivo
            <InfoTooltip text="Datos de Zoom. Sin filtro de cohorte: muestra total de asistentes por clase. Con cohorte seleccionada: cruza asistentes con alumnos de la cohorte para calcular tasa de asistencia real. Toggle gráfico/tabla con 'Ver detalle'." />
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {tieneCohorte
              ? `${totalCohorte} alumnos en cohorte · Asistencia por clase`
              : `${totalClases} clases dictadas en el periodo`
            }
          </p>
        </div>
        <button onClick={() => setShowDetail(!showDetail)}
          className="text-[10px] text-slate-400 hover:text-slate-600">
          {showDetail ? 'Ver grafico' : 'Ver detalle'}
        </button>
      </div>

      {!showDetail ? (
        <div className="h-52 mb-3">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={tieneCohorte ? 2 : 0}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-[11px]">
                        <p className="font-semibold text-slate-700 mb-1">{d.topic}</p>
                        <p className="text-slate-500">{d.name} {d.curso && `(${d.curso})`}</p>
                        <div className="mt-1.5 space-y-0.5">
                          {tieneCohorte ? (
                            <>
                              <p><span className="inline-block w-2 h-2 rounded-sm mr-1.5" style={{ backgroundColor: NAVY }} />Cohorte: {d.total_cohorte}</p>
                              <p><span className="inline-block w-2 h-2 rounded-sm mr-1.5" style={{ backgroundColor: PSI_RED }} />Asistieron: {d.asistieron} ({d.pct}%)</p>
                            </>
                          ) : (
                            <p><span className="inline-block w-2 h-2 rounded-sm mr-1.5" style={{ backgroundColor: NAVY }} />Asistentes: {d.asistentes_total}</p>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10 }}
                  formatter={(value: string) => {
                    if (value === 'total_cohorte') return 'Total cohorte';
                    if (value === 'asistieron') return 'Asistieron';
                    if (value === 'asistentes_total') return 'Asistentes';
                    return value;
                  }}
                />
                {tieneCohorte ? (
                  <>
                    <Bar dataKey="total_cohorte" fill={NAVY} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="asistieron" fill={PSI_RED} radius={[3, 3, 0, 0]} />
                  </>
                ) : (
                  <Bar dataKey="asistentes_total" fill={NAVY} radius={[3, 3, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="text-xs text-slate-400">Sin clases en el periodo</p>
            </div>
          )}
        </div>
      ) : (
        <div className="h-52 overflow-y-auto mb-3">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-100">
                <th className="text-left py-1.5 text-[10px] text-slate-400">Fecha</th>
                <th className="text-left py-1.5 text-[10px] text-slate-400">Clase</th>
                <th className="text-left py-1.5 text-[10px] text-slate-400">Curso</th>
                {tieneCohorte && <th className="text-right py-1.5 text-[10px] text-slate-400">Cohorte</th>}
                <th className="text-right py-1.5 text-[10px] text-slate-400">Asist.</th>
                {tieneCohorte && <th className="text-right py-1.5 text-[10px] text-slate-400">%</th>}
                <th className="text-right py-1.5 text-[10px] text-slate-400">Min</th>
              </tr>
            </thead>
            <tbody>
              {clases.map(c => (
                <tr key={c.zoom_uuid} className="border-b border-slate-50">
                  <td className="py-1.5 text-slate-500">
                    {new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="py-1.5 text-slate-700 max-w-[200px] truncate">{c.topic}</td>
                  <td className="py-1.5 text-slate-500">{c.curso_codigo}</td>
                  {tieneCohorte && <td className="py-1.5 text-right text-slate-400">{c.total_cohorte}</td>}
                  <td className="py-1.5 text-right font-semibold" style={{ color: tieneCohorte ? PSI_RED : NAVY }}>
                    {tieneCohorte ? c.asistentes_cohorte : c.asistentes_total}
                  </td>
                  {tieneCohorte && (
                    <td className="py-1.5 text-right text-slate-500">
                      {c.total_cohorte > 0 ? Math.round((c.asistentes_cohorte / c.total_cohorte) * 100) : 0}%
                    </td>
                  )}
                  <td className="py-1.5 text-right text-slate-400">{c.duration_minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={`grid ${tieneCohorte ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-slate-400">Clases dictadas</p>
          <p className="text-sm font-bold text-slate-900">{totalClases}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-slate-400">Asist. promedio</p>
          <p className="text-sm font-bold text-slate-900">{asistPromedio}</p>
        </div>
        {tieneCohorte && (
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-slate-400">Tasa asistencia</p>
            <p className="text-sm font-bold" style={{ color: PSI_RED }}>{tasaPromedio}%</p>
          </div>
        )}
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-slate-400">Hs en vivo</p>
          <p className="text-sm font-bold text-slate-900">{hsEnVivo}</p>
        </div>
      </div>
    </div>
  );
}
