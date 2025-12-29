'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { 
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  Filter
} from 'lucide-react';

export default function AlertasPage() {
  const [periodo, setPeriodo] = useState('mes');
  const [isLoading, setIsLoading] = useState(false);
  const [filtro, setFiltro] = useState('todas');

  const handleExport = (formato: 'excel' | 'csv' | 'pdf') => {
    console.log('Export:', formato);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  const alertas = [
    { id: 1, tipo: 'urgente', area: 'Marketing', titulo: 'CPL aumentó 45%', mensaje: 'El costo por lead de Meta Ads subió significativamente en las últimas 24hs.', tiempo: 'Hace 2h', icono: AlertTriangle, color: '#ef4444' },
    { id: 2, tipo: 'warning', area: 'Ventas', titulo: '12 leads sin respuesta', mensaje: 'Hay leads de más de 4 horas sin primera respuesta.', tiempo: 'Hace 4h', icono: AlertCircle, color: '#f59e0b' },
    { id: 3, tipo: 'info', area: 'Alumnos', titulo: '3 alumnos en riesgo', mensaje: 'Detectamos baja actividad en el curso de AT.', tiempo: 'Hace 1d', icono: Info, color: '#3b82f6' },
    { id: 4, tipo: 'success', area: 'Administración', titulo: 'Meta mensual alcanzada', mensaje: 'Se alcanzó el 100% de la meta de facturación.', tiempo: 'Hace 2d', icono: CheckCircle, color: '#10b981' },
  ];

  const filtros = [
    { id: 'todas', label: 'Todas' },
    { id: 'urgente', label: 'Urgentes' },
    { id: 'warning', label: 'Advertencias' },
    { id: 'info', label: 'Info' },
  ];

  const alertasFiltradas = filtro === 'todas' ? alertas : alertas.filter(a => a.tipo === filtro);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader
        titulo="Alertas"
        subtitulo="Centro de notificaciones inteligentes"
        icono={<Bell className="w-5 h-5 text-white" />}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onExport={handleExport}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4 text-center">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 mx-auto mb-1" />
            <p className="text-lg sm:text-xl font-bold text-red-600">1</p>
            <p className="text-[10px] sm:text-xs text-red-500">Urgentes</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 sm:p-4 text-center">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 mx-auto mb-1" />
            <p className="text-lg sm:text-xl font-bold text-amber-600">1</p>
            <p className="text-[10px] sm:text-xs text-amber-500">Advertencias</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4 text-center">
            <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-lg sm:text-xl font-bold text-blue-600">1</p>
            <p className="text-[10px] sm:text-xs text-blue-500">Información</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 sm:p-4 text-center">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-lg sm:text-xl font-bold text-emerald-600">1</p>
            <p className="text-[10px] sm:text-xs text-emerald-500">Resueltas</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {filtros.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                filtro === f.id
                  ? 'bg-[#e63946] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de alertas */}
        <div className="space-y-2 sm:space-y-3">
          {alertasFiltradas.map((alerta) => (
            <div key={alerta.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${alerta.color}15` }}>
                  <alerta.icono className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: alerta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${alerta.color}15`, color: alerta.color }}>
                        {alerta.area}
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mt-1">{alerta.titulo}</h3>
                    </div>
                    <button className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">{alerta.mensaje}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-2">{alerta.tiempo}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
