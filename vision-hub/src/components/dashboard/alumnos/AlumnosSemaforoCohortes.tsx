'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { CohorteResumen } from '@/types/alumnos';
import InfoTooltip from '@/components/dashboard/alumnos/InfoTooltip';

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const DIAG_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; text: string }> = {
  problema_curso: { label: 'Problema', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', text: 'text-red-700' },
  atencion:       { label: 'Atención', color: '#b45309', bg: '#fffbeb', border: '#fed7aa', text: 'text-amber-700' },
  saludable:      { label: 'Saludable', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', text: 'text-emerald-700' },
};

function nombreCorto(nombre: string): string {
  return nombre
    .replace(/^Curso\s+/i, '')
    .replace(/^Especialización en\s+/i, 'Esp. ')
    .replace(/^Instructor en\s+/i, 'Inst. ')
    .replace(/\s*-\s*(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+\d{4}$/i, '');
}

function formatPct(val: number | null): string {
  if (val === null || val === undefined) return '—';
  return `${Math.round(val)}%`;
}

interface Props {
  cohortes: CohorteResumen[];
  isLoading: boolean;
}

export default function AlumnosSemaforoCohortes({ cohortes, isLoading }: Props) {
  const router = useRouter();
  const [showSaludables, setShowSaludables] = useState(false);

  const activas = useMemo(() => cohortes.filter(c => c.alumnos_activos > 0), [cohortes]);

  const grouped = useMemo(() => {
    const g: Record<string, CohorteResumen[]> = { problema_curso: [], atencion: [], saludable: [] };
    activas.forEach(c => {
      if (g[c.diagnostico]) g[c.diagnostico].push(c);
    });
    return g;
  }, [activas]);

  const diagSummary = useMemo(() => {
    return (['problema_curso', 'atencion', 'saludable'] as const).map(diag => {
      const list = grouped[diag] || [];
      const totalAl = list.reduce((s, c) => s + c.alumnos_activos, 0);
      const avProm = totalAl > 0
        ? Math.round(list.reduce((s, c) => s + c.avance_promedio * c.alumnos_activos, 0) / totalAl)
        : 0;
      const morProm = list.length > 0
        ? Math.round(list.reduce((s, c) => s + (c.pct_morosos ?? 0), 0) / list.length)
        : 0;
      return { diag, cfg: DIAG_CONFIG[diag], count: list.length, alumnos: totalAl, avanceProm: avProm, morososProm: morProm };
    });
  }, [grouped]);

  const accionables = useMemo(() => {
    return [...(grouped.problema_curso || []), ...(grouped.atencion || [])].sort(
      (a, b) => (b.pct_riesgo_alto ?? 0) - (a.pct_riesgo_alto ?? 0)
    );
  }, [grouped]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0,1,2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-48 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#e63946]" />
          Estado de Cohortes
        </h3>
        <InfoTooltip text="Clasifica cada cohorte activa en 3 niveles según sus alumnos. Problema: más del 30% en riesgo alto o más del 70% morosos. Atención: más del 10% en riesgo alto o más del 50% morosos. Saludable: el resto. Riesgo alto = score ≥60 (suma de Cuotas + Campus + Zoom + Historial). Click en una cohorte para ver el detalle de cada alumno." />
      </div>

      {/* 3 summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {diagSummary.map(d => (
          <div key={d.diag} className="rounded-xl p-3.5 relative overflow-hidden"
            style={{ background: d.cfg.bg, border: `1px solid ${d.cfg.border}` }}>
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: d.cfg.color }} />
            <div className="flex justify-between">
              <div>
                <p className="text-[11px] font-semibold" style={{ color: d.cfg.color }}>
                  {d.cfg.label}
                </p>
                <p className="text-[28px] font-bold text-gray-900 leading-tight mt-1">
                  {d.count}
                </p>
                <p className="text-[10px] text-gray-500">
                  cohorte{d.count !== 1 ? 's' : ''} · {d.alumnos} alumnos
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">Avance ⌀</p>
                <p className="text-base font-bold text-gray-800">{d.avanceProm}%</p>
                {d.morososProm > 0 && (
                  <>
                    <p className="text-[10px] text-gray-400 mt-1">Morosos ⌀</p>
                    <p className={`text-sm font-bold ${d.morososProm > 60 ? 'text-red-600' : 'text-amber-600'}`}>
                      {d.morososProm}%
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla accionable: Problema + Atención */}
      {accionables.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Requieren acción ({accionables.length} cohortes)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-3 py-2 text-left font-medium text-gray-500 w-8"></th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Cohorte</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Activos</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Avance</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">% Riesgo</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">% Morosos</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Clases</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {accionables.map(c => {
                  const cfg = DIAG_CONFIG[c.diagnostico];
                  return (
                    <tr key={c.educativa_grupo_id}
                      onClick={() => router.push(`/alumnos/${c.educativa_grupo_id}`)}
                      className="border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div>
                          <span className="font-medium text-gray-900">{nombreCorto(c.nombre)}</span>
                          <span className="ml-1.5 text-gray-400">{MESES[c.cohorte_mes]} {c.cohorte_anio}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{c.curso_codigo}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-gray-700">{c.alumnos_activos}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{Math.round(c.avance_promedio)}%</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`font-medium ${
                          (c.pct_riesgo_alto ?? 0) > 20 ? 'text-red-600' :
                          (c.pct_riesgo_alto ?? 0) > 10 ? 'text-amber-600' : 'text-gray-600'
                        }`}>
                          {formatPct(c.pct_riesgo_alto)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`font-medium ${
                          (c.pct_morosos ?? 0) > 70 ? 'text-red-600' :
                          (c.pct_morosos ?? 0) > 50 ? 'text-amber-600' : 'text-gray-600'
                        }`}>
                          {formatPct(c.pct_morosos)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{c.zoom_clases}</td>
                      <td className="px-3 py-2.5">
                        <ExternalLink className="w-3 h-3 text-gray-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Saludables colapsable */}
      {(grouped.saludable?.length ?? 0) > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowSaludables(!showSaludables)}
            className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Saludables ({grouped.saludable.length} cohortes, {grouped.saludable.reduce((s, c) => s + c.alumnos_activos, 0)} alumnos)
            {showSaludables ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showSaludables && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs">
                <tbody>
                  {grouped.saludable.map(c => (
                    <tr key={c.educativa_grupo_id}
                      onClick={() => router.push(`/alumnos/${c.educativa_grupo_id}`)}
                      className="border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer transition-colors">
                      <td className="px-3 py-2 w-8">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-700">{nombreCorto(c.nombre)}</span>
                        <span className="text-[10px] text-gray-400 ml-1.5">{c.curso_codigo} · {MESES[c.cohorte_mes]} {c.cohorte_anio}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{c.alumnos_activos} al.</td>
                      <td className="px-3 py-2 text-right text-gray-500">{Math.round(c.avance_promedio)}%</td>
                      <td className="px-3 py-2 text-right">
                        {(c.pct_morosos ?? 0) > 0
                          ? <span className={(c.pct_morosos ?? 0) > 50 ? 'text-amber-600' : 'text-gray-400'}>{formatPct(c.pct_morosos)} mor.</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-3 py-2 w-8"><ExternalLink className="w-3 h-3 text-gray-300" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
