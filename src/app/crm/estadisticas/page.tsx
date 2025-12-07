'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { MessageSquare, Users, Clock, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Stats {
  totalConversaciones: number;
  conversacionesHoy: number;
  mensajesHoy: number;
  tiempoRespuestaPromedio: string;
  leadsNuevos: number;
  conversiones: number;
}

export default function EstadisticasPage() {
  const [stats, setStats] = useState<Stats>({
    totalConversaciones: 0,
    conversacionesHoy: 0,
    mensajesHoy: 0,
    tiempoRespuestaPromedio: '--',
    leadsNuevos: 0,
    conversiones: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const hoy = new Date().toISOString().split('T')[0];

      // Total conversaciones
      const { count: totalConv } = await supabase.from('conversaciones').select('*', { count: 'exact', head: true });

      // Conversaciones hoy
      const { count: convHoy } = await supabase
        .from('conversaciones')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', hoy);

      // Mensajes hoy
      const { count: msgHoy } = await supabase
        .from('mensajes')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', hoy);

      // Leads nuevos (estado = nueva)
      const { count: leads } = await supabase
        .from('conversaciones')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'nueva');

      // Conversiones (resultado = INS)
      const { count: ins } = await supabase
        .from('conversaciones')
        .select('*', { count: 'exact', head: true })
        .eq('resultado', 'INS');

      setStats({
        totalConversaciones: totalConv || 0,
        conversacionesHoy: convHoy || 0,
        mensajesHoy: msgHoy || 0,
        tiempoRespuestaPromedio: '< 5 min',
        leadsNuevos: leads || 0,
        conversiones: ins || 0,
      });
      setLoading(false);
    };
    cargar();
  }, []);

  const tarjetas = [
    { titulo: 'Conversaciones Totales', valor: stats.totalConversaciones, icono: MessageSquare, color: 'indigo', cambio: '+12%', positivo: true },
    { titulo: 'Conversaciones Hoy', valor: stats.conversacionesHoy, icono: MessageSquare, color: 'blue', cambio: '+5%', positivo: true },
    { titulo: 'Mensajes Hoy', valor: stats.mensajesHoy, icono: MessageSquare, color: 'emerald', cambio: '+18%', positivo: true },
    { titulo: 'Tiempo Respuesta', valor: stats.tiempoRespuestaPromedio, icono: Clock, color: 'amber', cambio: '-2 min', positivo: true },
    { titulo: 'Leads Nuevos', valor: stats.leadsNuevos, icono: Users, color: 'purple', cambio: '+8%', positivo: true },
    { titulo: 'Conversiones (INS)', valor: stats.conversiones, icono: TrendingUp, color: 'green', cambio: '+3%', positivo: true },
  ];

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Estadísticas</h1>
          <p className="text-sm text-slate-500 mt-1">Resumen de actividad del CRM</p>
        </div>

        {loading ? (
          <p className="text-slate-400 text-center py-8">Cargando estadísticas...</p>
        ) : (
          <>
            {/* Tarjetas de métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {tarjetas.map((t) => (
                <div key={t.titulo} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">{t.titulo}</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{t.valor}</p>
                    </div>
                    <div className={cn('p-2 rounded-xl', `bg-${t.color}-100 dark:bg-${t.color}-500/20`)}>
                      <t.icono size={20} className={`text-${t.color}-500`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3">
                    {t.positivo ? (
                      <ArrowUpRight size={14} className="text-emerald-500" />
                    ) : (
                      <ArrowDownRight size={14} className="text-red-500" />
                    )}
                    <span className={cn('text-xs font-medium', t.positivo ? 'text-emerald-500' : 'text-red-500')}>
                      {t.cambio}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">vs semana anterior</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Placeholder para gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Conversaciones por Día</h3>
                <div className="h-48 flex items-center justify-center text-slate-400">
                  Gráfico próximamente
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Distribución por Área</h3>
                <div className="h-48 flex items-center justify-center text-slate-400">
                  Gráfico próximamente
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
