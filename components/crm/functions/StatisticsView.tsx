'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { BarChart3, MessageSquare, Users, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface Statistics {
  totalConversations: number;
  activeConversations: number;
  resolvedConversations: number;
  totalMessages: number;
  averageResponseTime: number;
  conversationsByInbox: Record<string, number>;
  conversationsByStatus: Record<string, number>;
  recentActivity: Array<{
    date: string;
    conversations: number;
    messages: number;
  }>;
}

export default function StatisticsView({ user }: { user: User | null }) {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const supabase = createClient();

  useEffect(() => {
    loadStatistics();
  }, [dateRange]);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      // Cargar conversaciones
      const { data: conversations, error: convError } = await supabase
        .from('conversaciones')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (convError) throw convError;

      // Cargar mensajes
      const { data: messages, error: msgError } = await supabase
        .from('mensajes')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (msgError) throw msgError;

      // Calcular estadísticas
      const totalConversations = conversations?.length || 0;
      const activeConversations = conversations?.filter(c => c.estado === 'activa').length || 0;
      const resolvedConversations = conversations?.filter(c => c.estado === 'resuelta').length || 0;
      const totalMessages = messages?.length || 0;

      // Conversaciones por inbox
      const conversationsByInbox: Record<string, number> = {};
      conversations?.forEach(conv => {
        const inbox = conv.area || 'Sin área';
        conversationsByInbox[inbox] = (conversationsByInbox[inbox] || 0) + 1;
      });

      // Conversaciones por estado
      const conversationsByStatus: Record<string, number> = {};
      conversations?.forEach(conv => {
        const status = conv.estado || 'sin estado';
        conversationsByStatus[status] = (conversationsByStatus[status] || 0) + 1;
      });

      // Calcular tiempo promedio de respuesta (simplificado)
      const averageResponseTime = 0; // TODO: Implementar cálculo real

      setStats({
        totalConversations,
        activeConversations,
        resolvedConversations,
        totalMessages,
        averageResponseTime,
        conversationsByInbox,
        conversationsByStatus,
        recentActivity: [], // TODO: Implementar actividad reciente
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    subtitle 
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    trend?: 'up' | 'down'; 
    subtitle?: string;
  }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${
            trend === 'up' ? 'text-green-600' : 'text-gray-800'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-600">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No se pudieron cargar las estadísticas</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Estadísticas del CRM</h3>
            <p className="text-sm text-gray-500 mt-1">Métricas y análisis de rendimiento</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range === '7d' ? '7 días' : range === '30d' ? '30 días' : '90 días'}
              </button>
            ))}
          </div>
        </div>

        {/* Cards de estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Conversaciones"
            value={stats.totalConversations}
            icon={MessageSquare}
          />
          <StatCard
            title="Conversaciones Activas"
            value={stats.activeConversations}
            icon={Users}
          />
          <StatCard
            title="Resueltas"
            value={stats.resolvedConversations}
            icon={BarChart3}
          />
          <StatCard
            title="Total Mensajes"
            value={stats.totalMessages}
            icon={MessageSquare}
          />
        </div>

        {/* Gráficos y distribuciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversaciones por Inbox */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Conversaciones por Área</h4>
            <div className="space-y-3">
              {Object.entries(stats.conversationsByInbox).map(([inbox, count]) => (
                <div key={inbox}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{inbox}</span>
                    <span className="text-sm text-gray-600">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${(count / stats.totalConversations) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversaciones por Estado */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Conversaciones por Estado</h4>
            <div className="space-y-3">
              {Object.entries(stats.conversationsByStatus).map(([status, count]) => (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
                    <span className="text-sm text-gray-600">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${(count / stats.totalConversations) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

