'use client';

import { AlertTriangle, TrendingUp, Bot, Lightbulb, LucideIcon } from 'lucide-react';

type InsightType = 'alert' | 'positive' | 'recommendation' | 'info';

interface AgentInsightProps {
  type: InsightType;
  title: string;
  message: string;
  className?: string;
}

const insightConfig: Record<InsightType, { icon: LucideIcon; color: string; label: string }> = {
  alert: { icon: AlertTriangle, color: 'text-amber-400', label: 'Alerta' },
  positive: { icon: TrendingUp, color: 'text-emerald-400', label: 'Tendencia Positiva' },
  recommendation: { icon: Bot, color: 'text-blue-400', label: 'Recomendación' },
  info: { icon: Lightbulb, color: 'text-purple-400', label: 'Insight' },
};

export function AgentInsight({ type, title, message, className = '' }: AgentInsightProps) {
  const config = insightConfig[type];
  const Icon = config.icon;

  return (
    <div className={`p-3 bg-white/10 rounded-lg border border-white/10 ${className}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
        <div>
          <p className={`text-xs font-medium ${config.color}`}>
            {title || config.label}
          </p>
          <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
