'use client';

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  highlight?: boolean;
  loading?: boolean;
}

export function KPICard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel = 'vs período anterior',
  highlight = false,
  loading = false,
}: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 animate-pulse">
        <div className="w-10 h-10 bg-slate-200 rounded-lg mb-3" />
        <div className="h-3 bg-slate-200 rounded w-24 mb-2" />
        <div className="h-7 bg-slate-200 rounded w-20" />
      </div>
    );
  }

  const getDeltaColor = () => {
    if (delta === undefined || delta === 0) return 'text-slate-500';
    return delta > 0 ? 'text-emerald-600' : 'text-red-500';
  };

  const getDeltaIcon = () => {
    if (delta === undefined || delta === 0) return Minus;
    return delta > 0 ? TrendingUp : TrendingDown;
  };

  const DeltaIcon = getDeltaIcon();

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
          highlight ? 'bg-red-50' : 'bg-slate-100'
        }`}
      >
        <Icon
          className={`w-5 h-5 ${highlight ? 'text-[#e63946]' : 'text-slate-600'}`}
        />
      </div>

      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </p>

      <p className="text-2xl font-bold text-slate-900">{value}</p>

      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          <DeltaIcon className={`w-3.5 h-3.5 ${getDeltaColor()}`} />
          <span className={`text-xs font-medium ${getDeltaColor()}`}>
            {delta > 0 ? '+' : ''}{delta}%
          </span>
          <span className="text-[10px] text-slate-400 ml-1">{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}

interface KPICardHeroProps extends KPICardProps {
  subtitle?: string;
}

export function KPICardHero({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel = 'vs período anterior',
  subtitle,
  loading = false,
}: KPICardHeroProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-xl p-5 shadow-lg animate-pulse">
        <div className="h-4 bg-white/20 rounded w-32 mb-3" />
        <div className="h-10 bg-white/20 rounded w-24" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-xl p-5 shadow-lg text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white/90">{label}</p>
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>

        <p className="text-4xl font-bold mb-2">{value}</p>

        <div className="flex items-center gap-2">
          {delta !== undefined && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full">
              {delta >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span className="text-xs font-medium">
                {delta > 0 ? '+' : ''}{delta}%
              </span>
            </div>
          )}
          <span className="text-xs text-white/70">
            {subtitle || deltaLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
