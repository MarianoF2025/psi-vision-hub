'use client';

import { BarChart3 } from 'lucide-react';
import type { CursoRanking } from '@/types/alumnos';

import InfoTooltip from '@/components/dashboard/alumnos/InfoTooltip';

const PSI_RED = '#e63946';
const SLATE_700 = '#334155';

const formatNumber = (v: number) => new Intl.NumberFormat('es-AR').format(v);

interface Props {
  cursos: CursoRanking[];
  isLoading: boolean;
}

export default function AlumnosCursosTable({ cursos, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4 animate-pulse" />
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: PSI_RED }} />
            Ranking de Cursos
            <InfoTooltip text="Ranking histórico de cursos ordenado por total de inscripciones. Muestra activos (cursando), egresados (finalizaron), bajas, tasa de finalización y tasa de abandono. Responde a filtros de curso y fecha." />
          </h3>
          <span className="text-[10px] text-slate-400">
            {cursos.length} cursos · Ordenado por inscripciones
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                {['#', 'Curso', 'Inscripciones', 'Activos', 'Egresados', 'Bajas', 'Finalización', 'Abandono'].map((h) => (
                  <th
                    key={h}
                    className={`py-2.5 px-3 font-medium text-slate-500 uppercase tracking-wider text-[10px] ${
                      h === '#' || h === 'Curso' ? 'text-left' : 'text-right'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cursos.map((curso, index) => (
                <tr
                  key={curso.curso_codigo}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-2.5 px-3 text-xs font-bold text-slate-400">{index + 1}</td>
                  <td className="py-2.5 px-3">
                    <p className="text-xs font-semibold text-slate-900">{curso.curso_codigo}</p>
                    <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{curso.curso_nombre}</p>
                  </td>
                  <td className="text-right py-2.5 px-3 font-semibold text-slate-900">
                    {formatNumber(curso.total_inscripciones)}
                  </td>
                  <td className="text-right py-2.5 px-3 text-slate-600">
                    {formatNumber(curso.activos)}
                  </td>
                  <td className="text-right py-2.5 px-3 text-slate-600">
                    {formatNumber(curso.finalizados)}
                  </td>
                  <td className="text-right py-2.5 px-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ backgroundColor: `${PSI_RED}10`, color: PSI_RED }}
                    >
                      {formatNumber(curso.bajas)}
                    </span>
                  </td>
                  <td className="text-right py-2.5 px-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: curso.tasa_finalizacion >= 50 ? '#f0fdf4' : `${PSI_RED}10`,
                        color: curso.tasa_finalizacion >= 50 ? '#16a34a' : PSI_RED,
                      }}
                    >
                      {curso.tasa_finalizacion}%
                    </span>
                  </td>
                  <td className="text-right py-2.5 px-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: curso.tasa_abandono >= 50 ? `${PSI_RED}10` : '#f0fdf4',
                        color: curso.tasa_abandono >= 50 ? PSI_RED : '#16a34a',
                      }}
                    >
                      {curso.tasa_abandono}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
