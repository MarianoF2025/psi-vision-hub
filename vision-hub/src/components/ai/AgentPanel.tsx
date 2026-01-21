'use client';

import { Sparkles } from 'lucide-react';
import { AgentInsight } from './AgentInsight';

interface Insight {
  type: 'alert' | 'positive' | 'recommendation' | 'info';
  title?: string;
  message: string;
}

interface AgentPanelProps {
  insights: Insight[];
  onGenerateAnalysis?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function AgentPanel({
  insights,
  onGenerateAnalysis,
  isLoading = false,
  className = '',
}: AgentPanelProps) {
  return (
    <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Agente IA</h3>
          <p className="text-[10px] text-gray-400">Análisis inteligente</p>
        </div>
      </div>

      <div className="space-y-3">
        {insights.length > 0 ? (
          insights.map((insight, index) => (
            <AgentInsight
              key={index}
              type={insight.type}
              title={insight.title || ''}
              message={insight.message}
            />
          ))
        ) : (
          <div className="p-4 text-center text-gray-400 text-sm">
            No hay insights disponibles
          </div>
        )}
      </div>

      {onGenerateAnalysis && (
        <button
          onClick={onGenerateAnalysis}
          disabled={isLoading}
          className="w-full mt-4 py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Generar análisis completo
            </>
          )}
        </button>
      )}
    </div>
  );
}
