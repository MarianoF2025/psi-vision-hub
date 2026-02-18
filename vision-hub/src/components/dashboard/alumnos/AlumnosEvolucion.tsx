'use client';

import { useState, useMemo } from 'react';
import { BarChart3, Info } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { TendenciaAlumnos, TendenciaPorCurso } from '@/types/alumnos';

const PSI_RED = '#e63946';
const SLATE_700 = '#334155';
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const COLORES_CURSOS = [
  '#334155', '#e63946', '#2563eb', '#16a34a', '#d97706', '#9333ea',
];

const formatNumber = (v: number) => new Intl.NumberFormat('es-AR').format(v);

const formatPeriodo = (v: string) => {
  if (v?.includes('-')) {
    const p = v.split('-');
    if (p.length === 3) return `${p[2]}/${p[1]}`;
    return MESES[parseInt(p[1]) - 1] || v;
  }
  return v;
};

const formatPeriodoTooltip = (v: string) => {
  if (v && String(v).includes('-')) {
    const p = String(v).split('-');
    if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    return `${MESES[parseInt(p[1]) - 1]} ${p[0]}`;
  }
  return v;
};

import InfoTooltip from './InfoTooltip';

interface Props {
  tendencias: TendenciaAlumnos[];
  tendenciasPorCurso: TendenciaPorCurso[];
  cursosSeleccionados: string[];
  isLoading: boolean;
}

export default function AlumnosEvolucion({ tendencias, tendenciasPorCurso, cursosSeleccionados, isLoading }: Props) {
  const modoComparacion = cursosSeleccionados.length >= 2;

  // Pivotear datos para modo comparación
  const { dataPivot, cursosEnDatos } = useMemo(() => {
    if (!modoComparacion || tendenciasPorCurso.length === 0) {
      return { dataPivot: [], cursosEnDatos: [] };
    }

    const cursosSet = new Map<string, string>();
    const periodos = new Map<string, Record<string, number>>();

    tendenciasPorCurso.forEach((t) => {
      if (!cursosSet.has(t.curso_codigo)) cursosSet.set(t.curso_codigo, t.curso_nombre);
      if (!periodos.has(t.periodo)) periodos.set(t.periodo, {});
      periodos.get(t.periodo)![t.curso_codigo] = t.inscripciones;
    });

    const cursos = Array.from(cursosSet.entries()).map(([codigo, nombre]) => ({ codigo, nombre }));
    const pivot = Array.from(periodos.entries())
      .map(([periodo, valores]) => ({ periodo, ...valores }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));

    return { dataPivot: pivot, cursosEnDatos: cursos };
  }, [modoComparacion, tendenciasPorCurso]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4 animate-pulse" />
        <div className="h-52 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  // ─── Modo Comparación (2+ cursos) ───
  if (modoComparacion) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-gray-900">Comparación de Inscripciones</h3>
          <InfoTooltip text="Compara la cantidad de inscripciones nuevas por mes entre los cursos seleccionados. Cada barra representa inscripciones del período. Fuente: inscripciones_psi." />
        </div>
        <p className="text-[10px] text-gray-400 mb-3">{cursosEnDatos.length} cursos seleccionados</p>
        <div className="h-52">
          {dataPivot.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs">
              Sin datos para este período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataPivot} barGap={1} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10 }} tickFormatter={formatPeriodo} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  labelFormatter={formatPeriodoTooltip}
                  formatter={(value: number, name: string) => {
                    const curso = cursosEnDatos.find(c => c.codigo === name);
                    return [formatNumber(value), curso?.nombre || name];
                  }}
                />
                {cursosEnDatos.map((curso, i) => (
                  <Bar
                    key={curso.codigo}
                    dataKey={curso.codigo}
                    fill={COLORES_CURSOS[i % COLORES_CURSOS.length]}
                    radius={[3, 3, 0, 0]}
                    opacity={0.85}
                    name={curso.codigo}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
          {cursosEnDatos.map((curso, i) => (
            <div key={curso.codigo} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORES_CURSOS[i % COLORES_CURSOS.length] }} />
              <span className="text-[10px] text-gray-500">{curso.codigo}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Modo Normal (0 o 1 curso): inscripciones + bajas ───
  const titulo = cursosSeleccionados.length === 1
    ? `Evolución de Inscripciones — ${cursosSeleccionados[0]}`
    : 'Evolución de Inscripciones';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
        <InfoTooltip text="Muestra inscripciones nuevas y bajas por mes. Las barras oscuras son inscripciones (fecha de alta en el sistema). Las barras rojas son bajas (alumnos que abandonaron). Fuente: inscripciones_psi." />
      </div>
      <p className="text-[10px] text-gray-400 mb-3">Inscriptos vs Bajas — agrupado por mes</p>
      <div className="h-52">
        {tendencias.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-xs">
            Sin datos para este período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tendencias} barGap={1}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 10 }} tickFormatter={formatPeriodo} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number, name: string) => [
                  formatNumber(value),
                  name === 'inscripciones' ? 'Inscripciones' :
                  name === 'finalizados' ? 'Egresados' : 'Bajas',
                ]}
                labelFormatter={formatPeriodoTooltip}
              />
              <Bar dataKey="inscripciones" fill={SLATE_700} radius={[3, 3, 0, 0]} opacity={0.85} name="inscripciones" />
              <Bar dataKey="bajas" fill={PSI_RED} radius={[3, 3, 0, 0]} opacity={0.7} name="bajas" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SLATE_700 }} />
          <span className="text-[10px] text-gray-500">Inscripciones</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PSI_RED }} />
          <span className="text-[10px] text-gray-500">Bajas</span>
        </div>
      </div>
    </div>
  );
}
