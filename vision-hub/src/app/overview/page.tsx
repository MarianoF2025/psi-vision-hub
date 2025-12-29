'use client';

import { useState, useEffect } from 'react';
import { AreaChart, DonutChart } from '@tremor/react';
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Megaphone,
  GraduationCap,
  Building2,
  Heart,
  LayoutDashboard
} from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

// Sparkline Component
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
    <svg viewBox={`0 0 100 ${height}`} className="w-16 sm:w-20 h-5 sm:h-6" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${height} ${points} 100,${height}`} fill={`url(#spark-${color.replace('#', '')})`} />
    </svg>
  );
}

// KPI Card Premium - Responsive
function KPICardPremium({ title, value, change, positive, icon: Icon, color, sparkData }: {
  title: string; value: string; change: number; positive: boolean; icon: any; color: string; sparkData: number[]
}) {
  return (
    <div className="group relative bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden">
      <div className="relative">
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color }} />
          </div>
          <Sparkline data={sparkData} color={color} />
        </div>
        <p className="text-[10px] sm:text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
        <div className={`flex items-center gap-1 mt-1.5 sm:mt-2 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span className="text-[10px] sm:text-xs font-semibold">{positive ? '+' : ''}{change}%</span>
          <span className="text-[9px] sm:text-[10px] text-gray-400 ml-1 hidden sm:inline">vs mes ant.</span>
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [mounted, setMounted] = useState(false);
  const [periodo, setPeriodo] = useState('mes');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const chartData = [
    { semana: 'Sem 1', leads: 45, conversiones: 8 },
    { semana: 'Sem 2', leads: 52, conversiones: 11 },
    { semana: 'Sem 3', leads: 48, conversiones: 9 },
    { semana: 'Sem 4', leads: 61, conversiones: 14 },
  ];

  const donutData = [
    { name: 'AT (Acompañante)', value: 35, color: '#e63946' },
    { name: 'APA', value: 28, color: '#3b82f6' },
    { name: 'TEA', value: 22, color: '#10b981' },
    { name: 'Otros', value: 15, color: '#f59e0b' },
  ];

  const canalesData = [
    { name: 'Meta Ads', value: 156, icon: Megaphone, color: '#e63946' },
    { name: 'Google Ads', value: 89, icon: Target, color: '#3b82f6' },
    { name: 'Orgánico', value: 67, icon: Users, color: '#10b981' },
    { name: 'Referidos', value: 34, icon: Heart, color: '#f59e0b' },
    { name: 'WhatsApp', value: 22, icon: Users, color: '#8b5cf6' },
  ];

  const areasData = [
    { area: 'Marketing', leads: 156, conversion: '18%', trend: 12, color: '#e63946', icon: Megaphone },
    { area: 'Ventas', leads: 89, conversion: '24%', trend: 8, color: '#3b82f6', icon: TrendingUp },
    { area: 'Alumnos', leads: 234, conversion: '94%', trend: 3, color: '#10b981', icon: GraduationCap },
    { area: 'Admin', leads: 45, conversion: '87%', trend: -2, color: '#f59e0b', icon: Building2 },
  ];

  const kpisData = { leadsTotales: 206, tasaConversion: 18.4, facturacion: 4200000, roiMarketing: 145 };

  const handleExport = (formato: 'excel' | 'csv' | 'pdf') => {
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `overview_${periodo}_${fecha}`;
    const exportData = [
      ['Métrica', 'Valor', 'Cambio %'],
      ['Leads Totales', kpisData.leadsTotales.toString(), '+12%'],
      ['Tasa Conversión', `${kpisData.tasaConversion}%`, '+5%'],
      ['Facturación', `$${(kpisData.facturacion / 1000000).toFixed(1)}M`, '-3%'],
      ['ROI Marketing', `${kpisData.roiMarketing}%`, '+8%'],
    ];
    if (formato === 'csv' || formato === 'excel') {
      const separator = formato === 'csv' ? ',' : '\t';
      const content = exportData.map(row => row.join(separator)).join('\n');
      const blob = new Blob(['\ufeff' + content], { type: formato === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${formato === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (formato === 'pdf') {
      window.print();
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  if (!mounted) {
    return (
      <div className="p-3 sm:p-6 space-y-3 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 sm:h-32 bg-gray-200 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader
        titulo="Overview"
        subtitulo="Vista general de todas las áreas"
        icono={<LayoutDashboard className="w-5 h-5 text-white" />}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onExport={handleExport}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <KPICardPremium title="Leads Totales" value="206" change={12} positive={true} icon={Users} color="#10b981" sparkData={[45, 52, 48, 61, 55, 68, 72]} />
          <KPICardPremium title="Tasa Conversión" value="18.4%" change={5} positive={true} icon={TrendingUp} color="#3b82f6" sparkData={[14, 16, 15, 17, 18, 17, 18]} />
          <KPICardPremium title="Facturación" value="$4.2M" change={-3} positive={false} icon={DollarSign} color="#f59e0b" sparkData={[4.5, 4.2, 4.4, 4.1, 4.3, 4.0, 4.2]} />
          <KPICardPremium title="ROI Marketing" value="145%" change={8} positive={true} icon={Target} color="#8b5cf6" sparkData={[130, 138, 142, 135, 148, 140, 145]} />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">Evolución Mensual</h3>
                <p className="text-[9px] sm:text-[10px] text-gray-500">Leads y conversiones</p>
              </div>
              <div className="flex items-center gap-2 text-[9px]">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#e63946]"></div><span className="hidden sm:inline text-gray-600">Leads</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#10b981]"></div><span className="hidden sm:inline text-gray-600">Conv.</span></div>
              </div>
            </div>
            <AreaChart className="h-36 sm:h-44" data={chartData} index="semana" categories={['leads', 'conversiones']} colors={['rose', 'emerald']} showLegend={false} showGridLines={false} curveType="monotone" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <div className="mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">Ingresos por Curso</h3>
              <p className="text-[9px] sm:text-[10px] text-gray-500">Distribución del mes</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <DonutChart className="h-32 w-32 sm:h-40 sm:w-40" data={donutData} category="value" index="name" colors={['rose', 'blue', 'emerald', 'amber']} showLabel={true} label="100%" showAnimation={true} />
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 w-full sm:w-auto">
                {donutData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[9px] sm:text-[10px] text-gray-600 truncate">{item.name}</span>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-gray-900 ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Canales y Áreas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <div className="mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">Top Canales</h3>
              <p className="text-[9px] sm:text-[10px] text-gray-500">Leads por fuente</p>
            </div>
            <div className="space-y-2.5">
              {canalesData.map((canal, index) => {
                const maxValue = Math.max(...canalesData.map(c => c.value));
                const percentage = (canal.value / maxValue) * 100;
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${canal.color}15` }}>
                          <canal.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: canal.color }} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700">{canal.name}</span>
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-gray-900">{canal.value}</span>
                    </div>
                    <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: canal.color }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <div className="mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">Rendimiento por Área</h3>
              <p className="text-[9px] sm:text-[10px] text-gray-500">Métricas por departamento</p>
            </div>
            <div className="space-y-2">
              {areasData.map((area, index) => (
                <div key={index} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0" style={{ backgroundColor: `${area.color}15` }}>
                    <area.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: area.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-900">{area.area}</p>
                    <p className="text-[9px] sm:text-[10px] text-gray-500 truncate">{area.leads} leads · {area.conversion}</p>
                  </div>
                  <div className={`flex items-center gap-0.5 flex-shrink-0 ${area.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {area.trend >= 0 ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                    <span className="text-[9px] sm:text-[10px] font-semibold">{area.trend >= 0 ? '+' : ''}{area.trend}%</span>
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
