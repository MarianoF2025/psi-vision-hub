'use client';

import { Repeat2, ArrowRight } from 'lucide-react';
import InfoTooltip from '@/components/dashboard/alumnos/InfoTooltip';

const PSI_RED = '#e63946';

interface Props {
  data: any;
  isLoading: boolean;
}

export default function AlumnosCrossSell({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0,1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-40 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Repeat2 className="w-4 h-4 text-[#e63946]" />
            Cross-Sell
          </h3>
          <InfoTooltip text="Analiza patrones de venta cruzada: qué cursos toman los alumnos después de terminar otro. Identifica flujos comunes (A → B), ventana óptima de contacto y egresados sin siguiente curso (oportunidades de venta directa)." />
        </div>
        <div className="h-28 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <p className="text-xs text-gray-400">Sin datos de cross-sell disponibles</p>
        </div>
      </div>
    );
  }

  // Normalize field names from RPC
  const resumen = data.resumen || {};
  const ventana = data.ventana_oportunidad || {};
  const flujos = (data.flujos_top || []).map((f: any) => ({
    origen: f.curso_origen || f.first_curso || '',
    destino: f.curso_destino || f.second_curso || '',
    alumnos: f.alumnos || 0,
    dias: f.dias_promedio || 0,
  }));
  const egresados = (data.egresados_sin_siguiente || []).map((e: any) => ({
    codigo: e.curso_codigo || '',
    nombre: e.curso_nombre || '',
    cant: e.egresados ?? e.cant ?? 0,
    dias: e.dias_desde_inscripcion || 0,
  }));

  const totalEgresados = egresados.reduce((s: number, e: any) => s + e.cant, 0);
  const promedioDias = ventana.dias_promedio ?? ventana.promedio_dias ?? 0;
  const medianaDias = ventana.mediana_dias ?? 0;
  const maxFlujo = flujos.length > 0 ? flujos[0].alumnos : 1;
  const maxEgr = egresados.length > 0 ? egresados[0].cant : 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Repeat2 className="w-4 h-4 text-[#e63946]" />
          Cross-Sell
        </h3>
        <InfoTooltip text="Analiza patrones de venta cruzada: qué cursos toman los alumnos después de terminar otro. Identifica flujos comunes (A → B), ventana óptima de contacto y egresados sin siguiente curso (oportunidades de venta directa)." />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
          <p className="text-[10px] text-gray-500">Alumnos multi-curso</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{(resumen.total_multicurso || 0).toLocaleString('es-AR')}</p>
          <p className="text-[10px] text-gray-400">{resumen.pct_multicurso || 0}% del total</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
          <p className="text-[10px] text-gray-500">Ventana promedio</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{promedioDias} días</p>
          <p className="text-[10px] text-gray-400">mediana: {medianaDias} días</p>
        </div>
        <div className="bg-red-50/50 rounded-xl border border-red-100 p-3">
          <p className="text-[10px] text-gray-500">Egresados sin siguiente</p>
          <p className="text-xl font-bold text-[#e63946] mt-1">{totalEgresados.toLocaleString('es-AR')}</p>
          <p className="text-[10px] text-gray-400">oportunidad venta directa</p>
        </div>
      </div>

      {/* Distribución multi-curso */}
      {(data.distribucion || []).length > 0 && (() => {
        const dist = (data.distribucion || []).slice(0, 6);
        const maxVal = Math.max(...dist.map((x: any) => x.alumnos), 1);
        const total = dist.reduce((s: number, d: any) => s + d.alumnos, 0);
        const COLORS = ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];
        return (
          <div className="mb-4">
            <p className="text-[10px] font-medium text-gray-500 mb-2">Distribución por cantidad de cursos</p>
            <div className="space-y-1">
              {dist.map((d: any, i: number) => {
                const cursos = d.cant_cursos || d.cursos;
                const pct = total > 0 ? Math.round((d.alumnos / total) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-500 w-14 text-right shrink-0">{cursos} cursos</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${(d.alumnos / maxVal) * 100}%`,
                        backgroundColor: COLORS[i] || '#cbd5e1',
                      }} />
                    </div>
                    <span className="text-gray-700 font-medium w-12 text-right shrink-0">{d.alumnos.toLocaleString('es-AR')}</span>
                    <span className="text-gray-400 w-8 text-right shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Flujos + Egresados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-900 mb-3">Flujos más comunes</p>
          <div className="space-y-2">
            {flujos.slice(0, 8).map((f: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="font-medium text-gray-700 w-[72px] text-right truncate shrink-0" title={f.origen}>{f.origen}</span>
                <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="font-medium text-gray-700 w-[72px] truncate shrink-0" title={f.destino}>{f.destino}</span>
                <div className="flex-1 mx-1">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, (f.alumnos / maxFlujo) * 100)}%`,
                      backgroundColor: PSI_RED,
                    }} />
                  </div>
                </div>
                <span className="text-gray-500 font-medium w-8 text-right shrink-0">{f.alumnos}</span>
                <span className="text-[9px] text-gray-400 w-12 text-right shrink-0">{f.dias}d</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-900 mb-3">Egresados sin siguiente curso</p>
          <div className="space-y-2">
            {egresados.slice(0, 8).map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="font-medium text-gray-700 w-[90px] truncate shrink-0" title={e.nombre || e.codigo}>{e.codigo}</span>
                <div className="flex-1 mx-1">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-slate-600" style={{
                      width: `${Math.min(100, (e.cant / maxEgr) * 100)}%`,
                    }} />
                  </div>
                </div>
                <span className="text-gray-500 font-bold w-12 text-right shrink-0">{e.cant.toLocaleString('es-AR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
