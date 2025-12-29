'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { 
  Construction, 
  Users,
  Heart,
  MessageCircle,
  TrendingUp,
  Calendar,
  Award
} from 'lucide-react';

export default function ComunidadPage() {
  const [periodo, setPeriodo] = useState('mes');
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = (formato: 'excel' | 'csv' | 'pdf') => {
    console.log('Export:', formato);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  const previewMetrics = [
    { icon: Users, label: 'Miembros Activos', value: '—', color: '#8b5cf6' },
    { icon: Heart, label: 'Engagement', value: '—', color: '#e63946' },
    { icon: MessageCircle, label: 'Interacciones', value: '—', color: '#3b82f6' },
    { icon: TrendingUp, label: 'Conversión a PSI', value: '—', color: '#10b981' },
  ];

  const upcomingFeatures = [
    { icon: Users, text: 'Miembros activos vs inactivos' },
    { icon: Heart, text: 'Engagement por contenido' },
    { icon: MessageCircle, text: 'Posts y comentarios' },
    { icon: Calendar, text: 'Asistencia a eventos LC' },
    { icon: TrendingUp, text: 'Conversión LC → Cursos PSI' },
    { icon: Award, text: 'Contenido más consumido' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader
        titulo="Comunidad"
        subtitulo="Métricas de La Comunidad LC"
        icono={<Users className="w-5 h-5 text-white" />}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onExport={handleExport}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {previewMetrics.map((metric, index) => (
            <div key={index} className="bg-white/60 rounded-xl p-3 sm:p-4 border border-dashed border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center opacity-40" style={{ backgroundColor: `${metric.color}15` }}>
                  <metric.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: metric.color }} />
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">{metric.label}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-300 mt-1">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 lg:p-10">
          <div className="text-center max-w-lg mx-auto">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl mb-4">
              <Construction className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">En Construcción</h2>
            <p className="text-xs sm:text-sm text-gray-500 mb-6">Este dashboard conectará con la plataforma LC para métricas de comunidad.</p>
            <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Próximamente</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {upcomingFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-left">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#e63946]" />
                    </div>
                    <span className="text-[11px] sm:text-xs text-gray-600">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-gray-400">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs">Datos desde plataforma La Comunidad</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
