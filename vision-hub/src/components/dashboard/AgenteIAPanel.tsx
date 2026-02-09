'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles, AlertTriangle, TrendingUp, Lightbulb, Target,
  RefreshCw, Clock, ChevronDown, ChevronUp,
} from 'lucide-react';

const PSI_RED = '#e63946';

interface Insight {
  id: string;
  tipo: 'alerta' | 'tendencia' | 'oportunidad' | 'recomendacion';
  severidad: 'critica' | 'alta' | 'media' | 'info';
  titulo: string;
  que_paso: string;
  por_que: string;
  que_hacer: string;
  datos_soporte: Record<string, any>;
  periodo_analizado: { desde: string; hasta: string };
  created_at: string;
}

const TIPO_CONFIG = {
  alerta: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', label: 'Alerta' },
  tendencia: { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', label: 'Tendencia' },
  oportunidad: { icon: Lightbulb, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', label: 'Oportunidad' },
  recomendacion: { icon: Target, color: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/20', label: 'Recomendación' },
};

const SEVERIDAD_ORDER = { critica: 0, alta: 1, media: 2, info: 3 };

const SEVERIDAD_BADGE = {
  critica: 'bg-red-500/20 text-red-300',
  alta: 'bg-amber-500/20 text-amber-300',
  media: 'bg-blue-500/20 text-blue-300',
  info: 'bg-slate-500/20 text-slate-400',
};

function InsightCard({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false);
  const config = TIPO_CONFIG[insight.tipo] || TIPO_CONFIG.recomendacion;
  const Icon = config.icon;

  return (
    <div
      className={`p-3 rounded-lg border ${config.border} ${config.bg} cursor-pointer transition-all hover:border-white/20`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <Icon className={`w-3.5 h-3.5 ${config.color} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-[11px] font-semibold ${config.color} leading-tight`}>
              {insight.titulo}
            </p>
            {expanded ? (
              <ChevronUp className="w-3 h-3 text-slate-500 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
            )}
          </div>

          {/* Siempre visible: qué pasó */}
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {insight.que_paso}
          </p>

          {/* Expandido: por qué + qué hacer */}
          {expanded && (
            <div className="mt-2 space-y-2">
              <div className="pl-2 border-l-2 border-slate-600">
                <p className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Por qué</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">{insight.por_que}</p>
              </div>
              <div className="pl-2 border-l-2" style={{ borderColor: PSI_RED }}>
                <p className="text-[10px] uppercase font-semibold mb-0.5" style={{ color: PSI_RED }}>Qué hacer</p>
                <p className="text-[11px] text-slate-200 leading-relaxed font-medium">{insight.que_hacer}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mt-2 ml-5">
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${SEVERIDAD_BADGE[insight.severidad]}`}>
          {insight.severidad}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
          {config.label}
        </span>
      </div>
    </div>
  );
}

export default function AgenteIAPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ventas-agent');
      const data = await res.json();
      if (data.success && data.insights) {
        const sorted = data.insights.sort(
          (a: Insight, b: Insight) => SEVERIDAD_ORDER[a.severidad] - SEVERIDAD_ORDER[b.severidad]
        );
        setInsights(sorted);
        if (sorted.length > 0) {
          setLastUpdate(sorted[0].created_at);
        }
      }
    } catch (e) {
      console.error('Error cargando insights:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const generarAnalisis = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ventas-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        await cargarInsights();
      } else {
        setError(data.error || 'Error generando análisis');
      }
    } catch (e: any) {
      setError(e.message || 'Error de conexión');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    cargarInsights();
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-sm p-4 text-white h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ background: `linear-gradient(135deg, ${PSI_RED}, #c1121f)` }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Agente IA</h3>
            <p className="text-[10px] text-slate-400">
              {lastUpdate ? formatTimeAgo(lastUpdate) : 'Sin análisis'}
            </p>
          </div>
        </div>
        {lastUpdate && (
          <button
            onClick={cargarInsights}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Recargar insights"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Insights */}
      <div className="flex-1 space-y-2 overflow-y-auto min-h-0 max-h-[400px] pr-1">
        {isLoading && insights.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : insights.length > 0 ? (
          insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="w-8 h-8 text-slate-600 mb-3" />
            <p className="text-xs text-slate-400 mb-1">Sin análisis todavía</p>
            <p className="text-[10px] text-slate-500">Generá el primer análisis con el botón de abajo</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-[10px] text-red-300">{error}</p>
        </div>
      )}

      {/* Botón generar */}
      <button
        onClick={generarAnalisis}
        disabled={isGenerating}
        className="w-full mt-3 py-2.5 px-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Analizando datos...
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            Generar análisis completo
          </>
        )}
      </button>
    </div>
  );
}
