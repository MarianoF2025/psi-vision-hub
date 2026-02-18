'use client';

import { Users, UserCheck, UserX, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { MetricasAlumnos } from '@/types/alumnos';

const PSI_RED = '#e63946';
const SLATE_700 = '#334155';
const SLATE_600 = '#475569';

const formatNumber = (v: number) => new Intl.NumberFormat('es-AR').format(v);

const calcDelta = (actual: number, anterior: number): number => {
  if (anterior === 0) return actual > 0 ? 100 : 0;
  return Math.round(((actual - anterior) / anterior) * 100);
};

interface Props {
  metricas: MetricasAlumnos | null;
  isLoading: boolean;
}

export default function AlumnosKPIs({ metricas, isLoading }: Props) {
  const kpis = metricas
    ? [
        {
          label: 'Inscripciones',
          value: formatNumber(metricas.periodo_actual.total_inscripciones),
          delta: calcDelta(metricas.periodo_actual.total_inscripciones, metricas.periodo_anterior.total_inscripciones),
          icon: Users,
          color: SLATE_700,
        },
        {
          label: 'Egresados',
          value: formatNumber(metricas.periodo_actual.finalizados),
          delta: calcDelta(metricas.periodo_actual.finalizados, metricas.periodo_anterior.finalizados),
          icon: UserCheck,
          color: SLATE_600,
        },
        {
          label: 'Bajas',
          value: formatNumber(metricas.periodo_actual.bajas),
          delta: calcDelta(metricas.periodo_actual.bajas, metricas.periodo_anterior.bajas),
          icon: UserX,
          color: PSI_RED,
          invertDelta: true,
        },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-3 sm:p-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {kpis.map((kpi, i) => {
        const isGood = kpi.invertDelta ? kpi.delta < 0 : kpi.delta > 0;
        const isBad = kpi.invertDelta ? kpi.delta > 0 : kpi.delta < 0;

        return (
          <div key={i} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${kpi.color}15` }}
              >
                <kpi.icon className="w-[18px] h-[18px]" style={{ color: kpi.color }} />
              </div>
              {kpi.delta !== 0 && (
                <div
                  className={`flex items-center gap-0.5 text-[10px] font-semibold ${
                    isGood ? 'text-green-600' : isBad ? 'text-red-500' : 'text-slate-400'
                  }`}
                >
                  {kpi.delta > 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(kpi.delta)}%
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{kpi.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{kpi.value}</p>
          </div>
        );
      })}
    </div>
  );
}
