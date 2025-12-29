'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Zap,
  Clock,
  BarChart3
} from 'lucide-react';

// Mini Sparkline Component
function Sparkline({ data, color = '#10b981', height = 24 }: { data: number[], color?: string, height?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full h-6" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sparkGradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-sm"
      />
      <polygon
        points={`0,${height} ${points} 100,${height}`}
        fill={`url(#sparkGradient-${color.replace('#', '')})`}
      />
    </svg>
  );
}

// Progress Ring Component
function ProgressRing({ progress, size = 36, strokeWidth = 3, color = '#e63946' }: { progress: number, size?: number, strokeWidth?: number, color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-white/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

export default function MorningBriefing() {
  const [mounted, setMounted] = useState(false);
  const [fechaActual, setFechaActual] = useState('');
  const [saludo, setSaludo] = useState('');
  const [horaActual, setHoraActual] = useState('');

  const nombreUsuario = 'Nina';

  useEffect(() => {
    setMounted(true);

    const ahora = new Date();
    const hora = ahora.getHours();

    const opcionesFecha: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    setFechaActual(ahora.toLocaleDateString('es-AR', opcionesFecha));
    setHoraActual(ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));

    if (hora >= 5 && hora < 12) {
      setSaludo('Buenos días');
    } else if (hora >= 12 && hora < 19) {
      setSaludo('Buenas tardes');
    } else {
      setSaludo('Buenas noches');
    }
  }, []);

  const leadsSparkData = [12, 15, 18, 14, 22, 19, 23];
  const conversionSparkData = [14, 16, 15, 17, 16, 18, 18];
  const revenueSparkData = [2.1, 2.3, 2.2, 2.5, 2.3, 2.4, 2.4];
  const roiSparkData = [130, 138, 142, 135, 148, 140, 145];

  const kpis = [
    { label: 'Leads Hoy', displayValue: '23', change: 12, positive: true, icon: Users, sparkData: leadsSparkData, sparkColor: '#10b981' },
    { label: 'Conversión', displayValue: '18%', change: 5, positive: true, icon: TrendingUp, sparkData: conversionSparkData, sparkColor: '#3b82f6' },
    { label: 'Facturación', displayValue: '$2.4M', change: 3, positive: false, icon: DollarSign, sparkData: revenueSparkData, sparkColor: '#f59e0b' },
    { label: 'ROI Ads', displayValue: '145%', change: 8, positive: true, icon: Target, sparkData: roiSparkData, sparkColor: '#8b5cf6' },
  ];

  const tareasUrgentes = [
    { texto: '5 leads sin respuesta de ayer', area: 'Ventas', link: '/ventas', prioridad: 'alta', icon: AlertCircle, tiempo: '2h pendiente' },
    { texto: 'Campaña TEA con CTR bajo', area: 'Marketing', link: '/marketing', prioridad: 'media', icon: BarChart3, tiempo: 'Revisar hoy' },
    { texto: '3 alumnos en riesgo de abandono', area: 'Alumnos', link: '/alumnos', prioridad: 'alta', icon: Users, tiempo: 'Contactar hoy' },
  ];

  if (!mounted) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl"></div>
        <div className="h-32 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hero Section - Compacto */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#e63946] via-[#d62839] to-[#c1121f] shadow-lg shadow-red-500/20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-black/10 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>

        <div className="relative p-4 lg:p-5">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/15 backdrop-blur-sm rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-medium text-white/90">En vivo</span>
              </div>
              <span className="text-[10px] text-white/70">{horaActual}</span>
            </div>
            <div className="text-[10px] text-white/60 capitalize">{fechaActual}</div>
          </div>

          {/* Main greeting */}
          <div className="mb-3">
            <h1 className="text-xl lg:text-2xl font-bold text-white mb-1 tracking-tight">
              {saludo}, {nombreUsuario} 
              <span className="inline-block ml-1.5 text-lg">👋</span>
            </h1>
            <p className="text-xs lg:text-sm text-white/80 max-w-2xl leading-relaxed">
              Tenés <span className="font-semibold text-white">23 leads nuevos</span>, 
              <span className="text-amber-300 font-semibold"> 8 requieren atención urgente</span>. 
              La campaña de TEA necesita revisión.
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {kpis.map((kpi, index) => (
              <div
                key={index}
                className="group relative bg-white/95 backdrop-blur-xl rounded-lg p-2.5 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</span>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${kpi.sparkColor}15` }}>
                      <kpi.icon className="w-3 h-3" style={{ color: kpi.sparkColor }} />
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-lg lg:text-xl font-bold text-gray-900 tracking-tight">
                      {kpi.displayValue}
                    </p>
                    <div className={`flex items-center gap-0.5 ${kpi.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {kpi.positive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                      <span className="text-[10px] font-semibold">{kpi.positive ? '+' : '-'}{kpi.change}%</span>
                      <span className="text-[9px] text-gray-400 ml-0.5">vs ayer</span>
                    </div>
                  </div>
                  
                  <div className="mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Sparkline data={kpi.sparkData} color={kpi.sparkColor} height={20} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Items Section - Compacto */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/30">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-gray-900">Acciones Prioritarias</h2>
                <p className="text-[10px] text-gray-500">3 tareas requieren tu atención</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-full animate-pulse">
              2 URGENTES
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {tareasUrgentes.map((tarea, index) => (
            <Link href={tarea.link} key={index}>
              <div className="group px-4 py-2 hover:bg-gray-50/80 transition-all duration-200 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      tarea.prioridad === 'alta' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      <tarea.icon className="w-3.5 h-3.5" />
                    </div>
                    {tarea.prioridad === 'alta' && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 group-hover:text-[#e63946] transition-colors">
                      {tarea.texto}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-gray-400" />
                      <span className="text-[10px] text-gray-500">{tarea.tiempo}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      tarea.area === 'Ventas' 
                        ? 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-500 group-hover:text-white' 
                        : tarea.area === 'Marketing'
                        ? 'bg-purple-100 text-purple-700 group-hover:bg-purple-500 group-hover:text-white'
                        : 'bg-blue-100 text-blue-700 group-hover:bg-blue-500 group-hover:text-white'
                    }`}>
                      {tarea.area}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#e63946] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <Sparkles className="w-3 h-3 text-[#e63946]" />
              <span>Pupi puede ayudarte a priorizar</span>
            </div>
            <Link href="/pupi">
              <button className="group flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#e63946] to-[#d62839] text-white text-xs font-semibold rounded-lg hover:shadow-md hover:shadow-red-500/30 transition-all duration-300 hover:-translate-y-0.5">
                <Sparkles className="w-3 h-3" />
                Preguntale a Pupi
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats Row - Compacto */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-3 text-white shadow-md shadow-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-[10px] font-medium">Meta del Mes</p>
              <p className="text-xl font-bold">78%</p>
            </div>
            <ProgressRing progress={78} color="#fff" size={36} strokeWidth={3} />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white shadow-md shadow-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-[10px] font-medium">Retención</p>
              <p className="text-xl font-bold">94%</p>
            </div>
            <ProgressRing progress={94} color="#fff" size={36} strokeWidth={3} />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-white shadow-md shadow-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-[10px] font-medium">NPS Score</p>
              <p className="text-xl font-bold">72</p>
            </div>
            <ProgressRing progress={72} color="#fff" size={36} strokeWidth={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
