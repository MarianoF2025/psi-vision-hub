'use client';

import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import {
  Bell,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  ChevronDown,
  X,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface Alerta {
  id: string;
  tipo: 'critica' | 'warning' | 'info' | 'success';
  area: 'marketing' | 'ventas' | 'alumnos' | 'administracion' | 'comunidad';
  titulo: string;
  descripcion: string;
  accion_sugerida: string;
  fecha: string;
  leida: boolean;
  resuelta: boolean;
}

// ============================================
// DATOS MOCK
// ============================================

const alertasMock: Alerta[] = [
  {
    id: '1',
    tipo: 'critica',
    area: 'ventas',
    titulo: '12 leads sin contactar +24hs',
    descripcion: 'Hay leads que llevan más de 24 horas sin recibir respuesta. El TTF ideal es menor a 15 minutos.',
    accion_sugerida: 'Asignar leads pendientes a vendedoras disponibles inmediatamente.',
    fecha: '2025-01-20T10:30:00',
    leida: false,
    resuelta: false
  },
  {
    id: '2',
    tipo: 'warning',
    area: 'administracion',
    titulo: '$890K en cobros vencidos',
    descripcion: '5 cuentas tienen pagos vencidos hace más de 15 días. Riesgo de morosidad creciente.',
    accion_sugerida: 'Contactar a los 5 alumnos con mayor deuda para gestionar plan de pagos.',
    fecha: '2025-01-20T09:15:00',
    leida: false,
    resuelta: false
  },
  {
    id: '3',
    tipo: 'warning',
    area: 'alumnos',
    titulo: 'Biodescodificación: 61% abandono',
    descripcion: 'La tasa de abandono de este curso está muy por encima del promedio (54%).',
    accion_sugerida: 'Revisar contenido del curso y hacer seguimiento proactivo a alumnos activos.',
    fecha: '2025-01-19T16:45:00',
    leida: true,
    resuelta: false
  },
  {
    id: '4',
    tipo: 'info',
    area: 'marketing',
    titulo: 'CPL de APA subió 15%',
    descripcion: 'El costo por lead del curso APA aumentó respecto al mes anterior.',
    accion_sugerida: 'Revisar segmentación de audiencia y creativos de las campañas de APA.',
    fecha: '2025-01-19T14:20:00',
    leida: true,
    resuelta: false
  },
  {
    id: '5',
    tipo: 'success',
    area: 'ventas',
    titulo: 'Sofía superó meta mensual',
    descripcion: 'Sofía García alcanzó 17.9% de conversión, el mejor del equipo.',
    accion_sugerida: 'Compartir sus técnicas con el resto del equipo en la próxima reunión.',
    fecha: '2025-01-19T11:00:00',
    leida: true,
    resuelta: true
  },
  {
    id: '6',
    tipo: 'success',
    area: 'alumnos',
    titulo: 'Ingresos +73% vs 2024',
    descripcion: 'Los ingresos por inscripciones crecieron significativamente respecto al año anterior.',
    accion_sugerida: 'Mantener estrategia actual y evaluar expansión de cursos exitosos.',
    fecha: '2025-01-18T17:30:00',
    leida: true,
    resuelta: true
  },
  {
    id: '7',
    tipo: 'info',
    area: 'comunidad',
    titulo: '156 miembros nuevos sin interacción',
    descripcion: 'Miembros que se unieron este mes pero no han participado aún.',
    accion_sugerida: 'Enviar email de bienvenida personalizado con contenido destacado.',
    fecha: '2025-01-18T10:15:00',
    leida: false,
    resuelta: false
  },
  {
    id: '8',
    tipo: 'warning',
    area: 'marketing',
    titulo: 'Frecuencia alta en campaña AT',
    descripcion: 'La campaña AT - Intereses tiene frecuencia de 4.2, puede causar fatiga de audiencia.',
    accion_sugerida: 'Ampliar audiencia o pausar campaña temporalmente.',
    fecha: '2025-01-17T15:45:00',
    leida: true,
    resuelta: false
  },
];

// ============================================
// UTILIDADES
// ============================================

const getTipoConfig = (tipo: Alerta['tipo']) => {
  switch (tipo) {
    case 'critica':
      return { color: '#ef4444', bgColor: '#ef444415', icon: XCircle, label: 'Crítica' };
    case 'warning':
      return { color: '#f59e0b', bgColor: '#f59e0b15', icon: AlertTriangle, label: 'Advertencia' };
    case 'info':
      return { color: '#3b82f6', bgColor: '#3b82f615', icon: Bell, label: 'Info' };
    case 'success':
      return { color: '#10b981', bgColor: '#10b98115', icon: CheckCircle, label: 'Éxito' };
  }
};

const getAreaConfig = (area: Alerta['area']) => {
  switch (area) {
    case 'marketing':
      return { color: '#e63946', label: 'Marketing' };
    case 'ventas':
      return { color: '#3b82f6', label: 'Ventas' };
    case 'alumnos':
      return { color: '#10b981', label: 'Alumnos' };
    case 'administracion':
      return { color: '#8b5cf6', label: 'Administración' };
    case 'comunidad':
      return { color: '#f59e0b', label: 'Comunidad' };
  }
};

const formatFecha = (fecha: string) => {
  const date = new Date(fecha);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return 'Hace menos de 1 hora';
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroArea, setFiltroArea] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setAlertas(alertasMock);
      setIsLoading(false);
    }, 500);
  }, []);

  const clearFilters = () => {
    setFiltroTipo('');
    setFiltroArea('');
    setFiltroEstado('');
  };

  const hasActiveFilters = filtroTipo || filtroArea || filtroEstado;

  const alertasFiltradas = alertas.filter(a => {
    if (filtroTipo && a.tipo !== filtroTipo) return false;
    if (filtroArea && a.area !== filtroArea) return false;
    if (filtroEstado === 'pendientes' && a.resuelta) return false;
    if (filtroEstado === 'resueltas' && !a.resuelta) return false;
    if (filtroEstado === 'no_leidas' && a.leida) return false;
    return true;
  });

  const marcarLeida = (id: string) => {
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, leida: true } : a));
  };

  const marcarResuelta = (id: string) => {
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, resuelta: true, leida: true } : a));
  };

  const eliminarAlerta = (id: string) => {
    setAlertas(prev => prev.filter(a => a.id !== id));
  };

  // Stats
  const stats = {
    total: alertas.length,
    criticas: alertas.filter(a => a.tipo === 'critica' && !a.resuelta).length,
    pendientes: alertas.filter(a => !a.resuelta).length,
    noLeidas: alertas.filter(a => !a.leida).length,
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader
        titulo="Alertas"
        subtitulo="Centro de notificaciones inteligentes"
        icono={<Bell className="w-5 h-5 text-white" />}
        periodo=""
        onPeriodoChange={() => {}}
        onExport={() => {}}
        onRefresh={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 500); }}
        isLoading={isLoading}
      >
        <div className="mt-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              hasActiveFilters ? 'bg-[#e63946] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {hasActiveFilters && <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">Activos</span>}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Tipo</label>
                  <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent">
                    <option value="">Todos</option>
                    <option value="critica">Críticas</option>
                    <option value="warning">Advertencias</option>
                    <option value="info">Info</option>
                    <option value="success">Éxitos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Área</label>
                  <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent">
                    <option value="">Todas</option>
                    <option value="marketing">Marketing</option>
                    <option value="ventas">Ventas</option>
                    <option value="alumnos">Alumnos</option>
                    <option value="administracion">Administración</option>
                    <option value="comunidad">Comunidad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Estado</label>
                  <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent">
                    <option value="">Todos</option>
                    <option value="no_leidas">No leídas</option>
                    <option value="pendientes">Pendientes</option>
                    <option value="resueltas">Resueltas</option>
                  </select>
                </div>
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-[#e63946] transition-colors">
                      <X className="w-3 h-3" />Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardHeader>

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-gray-400" />
              <span className="text-[10px] text-gray-500 uppercase">Total</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-[10px] text-gray-500 uppercase">Críticas</span>
            </div>
            <p className="text-xl font-bold text-red-600">{stats.criticas}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] text-gray-500 uppercase">Pendientes</span>
            </div>
            <p className="text-xl font-bold text-amber-600">{stats.pendientes}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] text-gray-500 uppercase">No leídas</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{stats.noLeidas}</p>
          </div>
        </div>

        {/* Lista de alertas */}
        <div className="space-y-3">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))
          ) : alertasFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay alertas que coincidan con los filtros</p>
            </div>
          ) : (
            alertasFiltradas.map((alerta) => {
              const tipoConfig = getTipoConfig(alerta.tipo);
              const areaConfig = getAreaConfig(alerta.area);
              const TipoIcon = tipoConfig.icon;

              return (
                <div
                  key={alerta.id}
                  className={`bg-white rounded-xl p-4 shadow-sm border transition-all ${
                    !alerta.leida ? 'border-l-4' : 'border-gray-100'
                  } ${alerta.resuelta ? 'opacity-60' : ''}`}
                  style={{ borderLeftColor: !alerta.leida ? tipoConfig.color : undefined }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: tipoConfig.bgColor }}
                    >
                      <TipoIcon className="w-5 h-5" style={{ color: tipoConfig.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${areaConfig.color}15`, color: areaConfig.color }}
                        >
                          {areaConfig.label}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatFecha(alerta.fecha)}</span>
                        {!alerta.leida && (
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        )}
                        {alerta.resuelta && (
                          <span className="text-[10px] text-green-600 font-medium">✓ Resuelta</span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{alerta.titulo}</h3>
                      <p className="text-xs text-gray-600 mb-2">{alerta.descripcion}</p>

                      <div className="bg-gray-50 rounded-lg p-2 mb-3">
                        <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Acción sugerida</p>
                        <p className="text-xs text-gray-700">{alerta.accion_sugerida}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!alerta.leida && (
                          <button
                            onClick={() => marcarLeida(alerta.id)}
                            className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            Marcar leída
                          </button>
                        )}
                        {!alerta.resuelta && (
                          <button
                            onClick={() => marcarResuelta(alerta.id)}
                            className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                          >
                            Marcar resuelta
                          </button>
                        )}
                        <button
                          onClick={() => eliminarAlerta(alerta.id)}
                          className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
