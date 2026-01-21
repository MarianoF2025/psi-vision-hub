'use client';
import { useState, useRef, useEffect } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import {
  DollarSign,
  Users,
  TrendingUp,
  Target,
  MousePointer,
  Eye,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Zap,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Megaphone,
  Filter,
  Search,
  Check,
  X,
  Calendar,
  GitCompare
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell,
  PieChart as RechartsPie, Pie
} from 'recharts';

// ============================================
// TIPOS
// ============================================

interface Curso {
  id: string;
  nombre: string;
  campañas: number;
}

interface DatosCurso {
  inversion: number;
  leads: number;
  cpl: number;
  roas: number;
  ctr: number;
  cpc: number;
  impresiones: number;
  deltaInversion: number;
  deltaLeads: number;
  deltaCpl: number;
  deltaRoas: number;
  evolucion: { mes: string; inversion: number; leads: number }[];
  campañas: { nombre: string; estado: string; invertido: number; leads: number; cpl: number; ctr: number; cpc: number; impresiones: number }[];
}

// ============================================
// DATOS MOCK
// ============================================

const cursosData: Curso[] = [
  { id: 'todos', nombre: 'Todos los cursos', campañas: 24 },
  { id: 'at', nombre: 'Acompañante Terapéutico', campañas: 4 },
  { id: 'apa', nombre: 'Apego y Parentalidad', campañas: 3 },
  { id: 'tea', nombre: 'Trastorno Espectro Autista', campañas: 2 },
  { id: 'trauma', nombre: 'Trauma y Disociación', campañas: 2 },
  { id: 'perinatal', nombre: 'Salud Mental Perinatal', campañas: 1 },
  { id: 'adicciones', nombre: 'Adicciones', campañas: 1 },
  { id: 'infantil', nombre: 'Psicología Infantil', campañas: 2 },
  { id: 'adultos', nombre: 'Psicoterapia Adultos', campañas: 3 },
  { id: 'parejas', nombre: 'Terapia de Parejas', campañas: 1 },
  { id: 'geriatria', nombre: 'Psicogeriatría', campañas: 1 },
  { id: 'forense', nombre: 'Psicología Forense', campañas: 2 },
  { id: 'laboral', nombre: 'Psicología Laboral', campañas: 1 },
  { id: 'neuropsico', nombre: 'Neuropsicología', campañas: 1 },
];

const datosPorCurso: Record<string, DatosCurso> = {
  todos: {
    inversion: 1200000, leads: 456, cpl: 2631, roas: 312, ctr: 2.4, cpc: 850, impresiones: 1450000,
    deltaInversion: 8, deltaLeads: 15, deltaCpl: -12, deltaRoas: 23,
    evolucion: [
      { mes: 'Jul', inversion: 180000, leads: 65 },
      { mes: 'Ago', inversion: 195000, leads: 72 },
      { mes: 'Sep', inversion: 210000, leads: 78 },
      { mes: 'Oct', inversion: 185000, leads: 68 },
      { mes: 'Nov', inversion: 220000, leads: 85 },
      { mes: 'Dic', inversion: 210000, leads: 88 },
    ],
    campañas: []
  },
  at: {
    inversion: 450000, leads: 180, cpl: 2500, roas: 385, ctr: 2.8, cpc: 780, impresiones: 580000,
    deltaInversion: 12, deltaLeads: 18, deltaCpl: -8, deltaRoas: 15,
    evolucion: [
      { mes: 'Jul', inversion: 70000, leads: 28 },
      { mes: 'Ago', inversion: 75000, leads: 30 },
      { mes: 'Sep', inversion: 80000, leads: 32 },
      { mes: 'Oct', inversion: 72000, leads: 28 },
      { mes: 'Nov', inversion: 78000, leads: 31 },
      { mes: 'Dic', inversion: 75000, leads: 31 },
    ],
    campañas: [
      { nombre: 'AT - Prospección Mayo', estado: 'activa', invertido: 180000, leads: 72, cpl: 2500, ctr: 2.3, cpc: 720, impresiones: 250000 },
      { nombre: 'AT - Retargeting', estado: 'activa', invertido: 120000, leads: 65, cpl: 1846, ctr: 4.1, cpc: 580, impresiones: 145000 },
      { nombre: 'AT - Lookalike Psicólogos', estado: 'activa', invertido: 100000, leads: 28, cpl: 3571, ctr: 1.9, cpc: 890, impresiones: 112000 },
      { nombre: 'AT - Intereses Salud Mental', estado: 'pausada', invertido: 50000, leads: 15, cpl: 3333, ctr: 1.5, cpc: 950, impresiones: 73000 },
    ]
  },
  apa: {
    inversion: 380000, leads: 95, cpl: 4000, roas: 245, ctr: 1.8, cpc: 1200, impresiones: 420000,
    deltaInversion: 5, deltaLeads: -8, deltaCpl: 15, deltaRoas: -12,
    evolucion: [
      { mes: 'Jul', inversion: 55000, leads: 14 },
      { mes: 'Ago', inversion: 60000, leads: 15 },
      { mes: 'Sep', inversion: 68000, leads: 17 },
      { mes: 'Oct', inversion: 65000, leads: 16 },
      { mes: 'Nov', inversion: 70000, leads: 17 },
      { mes: 'Dic', inversion: 62000, leads: 16 },
    ],
    campañas: [
      { nombre: 'APA - Prospección', estado: 'activa', invertido: 180000, leads: 45, cpl: 4000, ctr: 1.8, cpc: 1100, impresiones: 180000 },
      { nombre: 'APA - Retargeting', estado: 'activa', invertido: 80000, leads: 30, cpl: 2666, ctr: 3.2, cpc: 850, impresiones: 94000 },
      { nombre: 'APA - Lookalike', estado: 'pausada', invertido: 120000, leads: 20, cpl: 6000, ctr: 1.2, cpc: 1450, impresiones: 146000 },
    ]
  },
  tea: {
    inversion: 250000, leads: 116, cpl: 2155, roas: 298, ctr: 2.7, cpc: 720, impresiones: 350000,
    deltaInversion: 10, deltaLeads: 22, deltaCpl: -15, deltaRoas: 28,
    evolucion: [
      { mes: 'Jul', inversion: 38000, leads: 17 },
      { mes: 'Ago', inversion: 40000, leads: 18 },
      { mes: 'Sep', inversion: 42000, leads: 19 },
      { mes: 'Oct', inversion: 43000, leads: 20 },
      { mes: 'Nov', inversion: 45000, leads: 21 },
      { mes: 'Dic', inversion: 42000, leads: 21 },
    ],
    campañas: [
      { nombre: 'TEA - Prospección', estado: 'activa', invertido: 150000, leads: 70, cpl: 2142, ctr: 2.8, cpc: 680, impresiones: 220000 },
      { nombre: 'TEA - Awareness', estado: 'activa', invertido: 100000, leads: 46, cpl: 2173, ctr: 2.5, cpc: 780, impresiones: 130000 },
    ]
  },
  trauma: {
    inversion: 60000, leads: 32, cpl: 1875, roas: 420, ctr: 3.1, cpc: 620, impresiones: 52000,
    deltaInversion: 0, deltaLeads: 12, deltaCpl: -18, deltaRoas: 35,
    evolucion: [
      { mes: 'Jul', inversion: 8000, leads: 4 },
      { mes: 'Ago', inversion: 9000, leads: 5 },
      { mes: 'Sep', inversion: 10000, leads: 5 },
      { mes: 'Oct', inversion: 11000, leads: 6 },
      { mes: 'Nov', inversion: 12000, leads: 6 },
      { mes: 'Dic', inversion: 10000, leads: 6 },
    ],
    campañas: [
      { nombre: 'Trauma - Lanzamiento', estado: 'activa', invertido: 60000, leads: 32, cpl: 1875, ctr: 3.1, cpc: 620, impresiones: 52000 },
    ]
  },
  perinatal: {
    inversion: 35000, leads: 18, cpl: 1944, roas: 380, ctr: 2.9, cpc: 650, impresiones: 28000,
    deltaInversion: 5, deltaLeads: 8, deltaCpl: -5, deltaRoas: 12,
    evolucion: [
      { mes: 'Jul', inversion: 5000, leads: 2 },
      { mes: 'Ago', inversion: 5500, leads: 3 },
      { mes: 'Sep', inversion: 6000, leads: 3 },
      { mes: 'Oct', inversion: 6000, leads: 3 },
      { mes: 'Nov', inversion: 6500, leads: 4 },
      { mes: 'Dic', inversion: 6000, leads: 3 },
    ],
    campañas: [
      { nombre: 'Perinatal - Prospección', estado: 'activa', invertido: 35000, leads: 18, cpl: 1944, ctr: 2.9, cpc: 650, impresiones: 28000 },
    ]
  },
  adicciones: {
    inversion: 25000, leads: 15, cpl: 1666, roas: 450, ctr: 3.4, cpc: 580, impresiones: 20000,
    deltaInversion: 15, deltaLeads: 25, deltaCpl: -20, deltaRoas: 40,
    evolucion: [
      { mes: 'Jul', inversion: 3000, leads: 2 },
      { mes: 'Ago', inversion: 3500, leads: 2 },
      { mes: 'Sep', inversion: 4000, leads: 2 },
      { mes: 'Oct', inversion: 4500, leads: 3 },
      { mes: 'Nov', inversion: 5000, leads: 3 },
      { mes: 'Dic', inversion: 5000, leads: 3 },
    ],
    campañas: [
      { nombre: 'Adicciones - Test', estado: 'activa', invertido: 25000, leads: 15, cpl: 1666, ctr: 3.4, cpc: 580, impresiones: 20000 },
    ]
  },
};

const defaultDatos: DatosCurso = {
  inversion: 50000, leads: 25, cpl: 2000, roas: 300, ctr: 2.5, cpc: 700, impresiones: 60000,
  deltaInversion: 5, deltaLeads: 10, deltaCpl: -5, deltaRoas: 8,
  evolucion: [
    { mes: 'Jul', inversion: 7000, leads: 3 },
    { mes: 'Ago', inversion: 8000, leads: 4 },
    { mes: 'Sep', inversion: 8500, leads: 4 },
    { mes: 'Oct', inversion: 9000, leads: 5 },
    { mes: 'Nov', inversion: 9000, leads: 5 },
    { mes: 'Dic', inversion: 8500, leads: 4 },
  ],
  campañas: [
    { nombre: 'Campaña Principal', estado: 'activa', invertido: 50000, leads: 25, cpl: 2000, ctr: 2.5, cpc: 700, impresiones: 60000 },
  ]
};

const comparativaCursos = [
  { curso: 'AT', id: 'at', inversion: 450000, leads: 180, cpl: 2500, porcentaje: 39 },
  { curso: 'APA', id: 'apa', inversion: 380000, leads: 95, cpl: 4000, porcentaje: 21 },
  { curso: 'TEA', id: 'tea', inversion: 250000, leads: 116, cpl: 2155, porcentaje: 25 },
  { curso: 'Trauma', id: 'trauma', inversion: 60000, leads: 32, cpl: 1875, porcentaje: 7 },
  { curso: 'Perinatal', id: 'perinatal', inversion: 35000, leads: 18, cpl: 1944, porcentaje: 4 },
  { curso: 'Adicciones', id: 'adicciones', inversion: 25000, leads: 15, cpl: 1666, porcentaje: 4 },
];

const comparativaTemporal = {
  inversion: { actual: 210000, anterior: 195000, añoAnterior: 180000 },
  leads: { actual: 88, anterior: 76, añoAnterior: 62 },
  cpl: { actual: 2386, anterior: 2565, añoAnterior: 2903 },
};

const scatterData = [
  { curso: 'AT', inversion: 450, leads: 180, cpl: 2500 },
  { curso: 'APA', inversion: 380, leads: 95, cpl: 4000 },
  { curso: 'TEA', inversion: 250, leads: 116, cpl: 2155 },
  { curso: 'Trauma', inversion: 60, leads: 32, cpl: 1875 },
  { curso: 'Perinatal', inversion: 35, leads: 18, cpl: 1944 },
  { curso: 'Adicciones', inversion: 25, leads: 15, cpl: 1666 },
];

const distribucionInversion = [
  { name: 'AT', value: 37.5, color: '#e63946' },
  { name: 'APA', value: 31.7, color: '#3b82f6' },
  { name: 'TEA', value: 20.8, color: '#10b981' },
  { name: 'Otros', value: 10, color: '#9ca3af' },
];

const distribucionLeads = [
  { name: 'AT', value: 39.5, color: '#e63946' },
  { name: 'APA', value: 20.8, color: '#3b82f6' },
  { name: 'TEA', value: 25.4, color: '#10b981' },
  { name: 'Otros', value: 14.3, color: '#9ca3af' },
];

const alertas = [
  { tipo: 'warning', mensaje: 'CPL de APA subió 15% vs mes anterior', curso: 'apa' },
  { tipo: 'success', mensaje: 'TEA tiene el mejor rendimiento del mes', curso: 'tea' },
  { tipo: 'info', mensaje: 'Frecuencia alta en campaña AT - Intereses', curso: 'at' },
];

// ============================================
// COMPONENTES
// ============================================

const Sparkline = ({ data, color, height = 24 }: { data: number[]; color: string; height?: number }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#gradient-${color.replace('#', '')})`} points={areaPoints} />
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

const CursoSelector = ({
  lista,
  seleccionado,
  onSelect
}: {
  lista: Curso[];
  seleccionado: string;
  onSelect: (id: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cursoActual = lista.find(c => c.id === seleccionado);
  const cursosFiltrados = lista.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
          isOpen ? 'border-[#e63946] bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <BarChart3 className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-900">{cursoActual?.nombre}</span>
        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{cursoActual?.campañas}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar curso..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-red-100"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {cursosFiltrados.length > 0 ? (
              cursosFiltrados.map((curso, index) => (
                <button
                  key={curso.id}
                  onClick={() => { onSelect(curso.id); setIsOpen(false); setSearch(''); }}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${
                    index === 0 ? 'border-b border-gray-100' : ''
                  } ${seleccionado === curso.id ? 'bg-red-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {curso.id === 'todos' ? (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e63946] to-[#c1121f] flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-600">{curso.nombre.substring(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="text-left">
                      <p className={`text-sm font-medium ${seleccionado === curso.id ? 'text-[#e63946]' : 'text-gray-900'}`}>{curso.nombre}</p>
                      <p className="text-xs text-gray-500">{curso.campañas} campañas activas</p>
                    </div>
                  </div>
                  {seleccionado === curso.id && <Check className="w-5 h-5 text-[#e63946]" />}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No se encontraron cursos</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ title, value, delta, icon: Icon, color, sparklineData }: {
  title: string; value: string; delta: number; icon: any; color: string; sparklineData: number[];
}) => {
  const isPositive = delta >= 0;
  const colorClasses: Record<string, { bg: string; icon: string; spark: string }> = {
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', spark: '#10b981' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', spark: '#3b82f6' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', spark: '#f59e0b' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', spark: '#8b5cf6' },
  };
  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100/50 group">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-xl ${colors.bg} group-hover:scale-110 transition-transform`}>
          <Icon className={`w-4 h-4 ${colors.icon}`} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
        }`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(delta)}%
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <div className="mt-2 h-5">
        <Sparkline data={sparklineData} color={colors.spark} height={20} />
      </div>
    </div>
  );
};

const CampaignRow = ({ campaña, index }: { campaña: any; index: number }) => {
  const isActive = campaña.estado === 'activa';
  return (
    <div className={`grid grid-cols-7 gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
      <div className="col-span-2 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
        <span className="text-sm font-medium text-gray-900 truncate">{campaña.nombre}</span>
      </div>
      <div className="text-sm text-gray-600 flex items-center">{formatCurrency(campaña.invertido)}</div>
      <div className="text-sm font-semibold text-gray-900 flex items-center">{campaña.leads}</div>
      <div className="text-sm text-gray-600 flex items-center">{formatCurrency(campaña.cpl)}</div>
      <div className="text-sm text-gray-600 flex items-center">{campaña.ctr}%</div>
      <div className="text-sm text-gray-600 flex items-center">{(campaña.impresiones / 1000).toFixed(0)}K</div>
    </div>
  );
};

const ComparativaRow = ({ curso, index, onSelect }: { curso: any; index: number; onSelect: (id: string) => void }) => {
  const colors = ['#e63946', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const color = colors[index % colors.length];
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all cursor-pointer group" onClick={() => onSelect(curso.id)}>
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-gray-900 text-sm">{curso.curso}</span>
          <span className="text-xs text-gray-500">{curso.leads} leads</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${curso.porcentaje}%`, backgroundColor: color }} />
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
    </div>
  );
};

const CustomTooltipScatter = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
        <p className="font-semibold text-gray-900">{data.curso}</p>
        <p className="text-sm text-gray-600">Inversión: {formatCurrency(data.inversion * 1000)}</p>
        <p className="text-sm text-gray-600">Leads: {data.leads}</p>
        <p className="text-sm text-gray-600">CPL: {formatCurrency(data.cpl)}</p>
      </div>
    );
  }
  return null;
};

const ComparativaTemporalCard = ({
  titulo,
  actual,
  anterior,
  añoAnterior,
  formato = 'numero',
  invertirColor = false
}: {
  titulo: string;
  actual: number;
  anterior: number;
  añoAnterior: number;
  formato?: 'moneda' | 'numero';
  invertirColor?: boolean;
}) => {
  const cambioMes = ((actual - anterior) / anterior * 100).toFixed(1);
  const cambioAño = ((actual - añoAnterior) / añoAnterior * 100).toFixed(1);
  const maxVal = Math.max(actual, anterior, añoAnterior);

  const formatVal = (v: number) => formato === 'moneda' ? formatCurrency(v) : v.toLocaleString();

  const getColor = (cambio: number) => {
    if (invertirColor) {
      return cambio <= 0 ? 'text-emerald-600' : 'text-red-600';
    }
    return cambio >= 0 ? 'text-emerald-600' : 'text-red-600';
  };

  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs font-medium text-gray-500 mb-3">{titulo}</p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs text-gray-500">Actual</div>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#e63946] rounded-full" style={{ width: `${(actual / maxVal) * 100}%` }} />
          </div>
          <div className="w-16 text-right text-sm font-semibold text-gray-900">{formatVal(actual)}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs text-gray-500">Mes ant.</div>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#f59e0b] rounded-full" style={{ width: `${(anterior / maxVal) * 100}%` }} />
          </div>
          <div className="w-16 text-right text-sm text-gray-600">{formatVal(anterior)}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs text-gray-500">Año ant.</div>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#9ca3af] rounded-full" style={{ width: `${(añoAnterior / maxVal) * 100}%` }} />
          </div>
          <div className="w-16 text-right text-sm text-gray-600">{formatVal(añoAnterior)}</div>
        </div>
      </div>
      <div className="flex justify-between mt-3 pt-2 border-t border-gray-200">
        <span className={`text-xs font-medium ${getColor(parseFloat(cambioMes))}`}>
          {parseFloat(cambioMes) >= 0 ? '+' : ''}{cambioMes}% vs mes
        </span>
        <span className={`text-xs font-medium ${getColor(parseFloat(cambioAño))}`}>
          {parseFloat(cambioAño) >= 0 ? '+' : ''}{cambioAño}% vs año
        </span>
      </div>
    </div>
  );
};

// ============================================
// PÁGINA PRINCIPAL
// ============================================

export default function MarketingPage() {
  const [cursoSeleccionado, setCursoSeleccionado] = useState('todos');
  const [periodo, setPeriodo] = useState('mes');
  const [isLoading, setIsLoading] = useState(false);

  const datos = datosPorCurso[cursoSeleccionado] || defaultDatos;
  const cursoInfo = cursosData.find(c => c.id === cursoSeleccionado);
  const scatterColors = ['#e63946', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  const handleExport = (formato: 'excel' | 'csv' | 'pdf') => {
    const cursoNombre = cursoInfo?.nombre || 'todos';
    const fecha = new Date().toISOString().split('T')[0];
    
    if (formato === 'csv') {
      // Generar CSV
      const headers = ['Métrica', 'Valor', 'Cambio %'];
      const rows = [
        ['Inversión', datos.inversion.toString(), `${datos.deltaInversion}%`],
        ['Leads', datos.leads.toString(), `${datos.deltaLeads}%`],
        ['CPL', datos.cpl.toString(), `${datos.deltaCpl}%`],
        ['ROAS', `${datos.roas}%`, `${datos.deltaRoas}%`],
        ['CTR', `${datos.ctr}%`, ''],
        ['CPC', datos.cpc.toString(), ''],
        ['Impresiones', datos.impresiones.toString(), ''],
      ];
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `marketing_${cursoNombre}_${fecha}.csv`;
      link.click();
    } else if (formato === 'excel') {
      // Para Excel real necesitaríamos xlsx library, por ahora CSV con extensión xlsx
      const headers = ['Métrica', 'Valor', 'Cambio %'];
      const rows = [
        ['Inversión', datos.inversion.toString(), `${datos.deltaInversion}%`],
        ['Leads', datos.leads.toString(), `${datos.deltaLeads}%`],
        ['CPL', datos.cpl.toString(), `${datos.deltaCpl}%`],
        ['ROAS', `${datos.roas}%`, `${datos.deltaRoas}%`],
        ['CTR', `${datos.ctr}%`, ''],
        ['CPC', datos.cpc.toString(), ''],
        ['Impresiones', datos.impresiones.toString(), ''],
      ];
      
      const csvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `marketing_${cursoNombre}_${fecha}.xlsx`;
      link.click();
    } else if (formato === 'pdf') {
      // Para PDF real necesitaríamos jspdf, por ahora abrimos ventana de impresión
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
      {/* Header con DashboardHeader */}
      <DashboardHeader
        titulo="Marketing"
        subtitulo="Meta Ads Performance"
        icono={<Megaphone className="w-5 h-5 text-white" />}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isLoading={isLoading}
      >
        <CursoSelector lista={cursosData} seleccionado={cursoSeleccionado} onSelect={setCursoSeleccionado} />
      </DashboardHeader>

      <div className="p-4 space-y-4">
        {/* KPIs Principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard title="Inversión" value={formatCurrency(datos.inversion)} delta={datos.deltaInversion} icon={DollarSign} color="emerald" sparklineData={datos.evolucion.map(e => e.inversion)} />
          <KPICard title="Leads" value={datos.leads.toString()} delta={datos.deltaLeads} icon={Users} color="blue" sparklineData={datos.evolucion.map(e => e.leads)} />
          <KPICard title="CPL" value={formatCurrency(datos.cpl)} delta={datos.deltaCpl} icon={Target} color="amber" sparklineData={datos.evolucion.map(e => e.inversion / (e.leads || 1))} />
          <KPICard title="ROAS" value={`${datos.roas}%`} delta={datos.deltaRoas} icon={TrendingUp} color="purple" sparklineData={[280, 295, 310, 298, 320, datos.roas]} />
        </div>

        {/* KPIs Secundarios */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1"><MousePointer className="w-3.5 h-3.5" /><span className="text-xs">CTR</span></div>
            <p className="text-lg font-bold text-gray-900">{datos.ctr}%</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1"><DollarSign className="w-3.5 h-3.5" /><span className="text-xs">CPC</span></div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(datos.cpc)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1"><Eye className="w-3.5 h-3.5" /><span className="text-xs">Impresiones</span></div>
            <p className="text-lg font-bold text-gray-900">{(datos.impresiones / 1000).toFixed(0)}K</p>
          </div>
        </div>

        {/* Fila 1: Evolución + Comparativa Temporal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Evolución General */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Evolución {cursoSeleccionado !== 'todos' ? cursoInfo?.nombre : 'General'}</h3>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1"><div className="w-2.5 h-0.5 bg-[#e63946] rounded-full" /><span className="text-gray-500">Inversión</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-0.5 bg-[#3b82f6] rounded-full" /><span className="text-gray-500">Leads</span></div>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={datos.evolucion}>
                  <defs>
                    <linearGradient id="colorInversion" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e63946" stopOpacity={0.2}/><stop offset="95%" stopColor="#e63946" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis yAxisId="inversion" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} width={45} />
                  <YAxis yAxisId="leads" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(value: any, name: string) => [name === 'inversion' ? formatCurrency(value) : value, name === 'inversion' ? 'Inversión' : 'Leads']} />
                  <Area yAxisId="inversion" type="monotone" dataKey="inversion" stroke="#e63946" strokeWidth={2} fill="url(#colorInversion)" />
                  <Area yAxisId="leads" type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} fill="url(#colorLeads)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparativa Temporal */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 text-sm">Comparativa Temporal</h3>
            </div>
            <div className="space-y-4">
              <ComparativaTemporalCard titulo="INVERSIÓN" actual={comparativaTemporal.inversion.actual} anterior={comparativaTemporal.inversion.anterior} añoAnterior={comparativaTemporal.inversion.añoAnterior} formato="moneda" />
              <ComparativaTemporalCard titulo="LEADS" actual={comparativaTemporal.leads.actual} anterior={comparativaTemporal.leads.anterior} añoAnterior={comparativaTemporal.leads.añoAnterior} formato="numero" />
              <ComparativaTemporalCard titulo="CPL" actual={comparativaTemporal.cpl.actual} anterior={comparativaTemporal.cpl.anterior} añoAnterior={comparativaTemporal.cpl.añoAnterior} formato="moneda" invertirColor={true} />
            </div>
          </div>
        </div>

        {/* Fila 2: Rendimiento por Curso / Scatter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cursoSeleccionado === 'todos' ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-gray-400" />
                  Rendimiento por Curso
                </h3>
                <span className="text-xs text-gray-500">Click para detalle</span>
              </div>
              <div className="space-y-1">
                {comparativaCursos.map((curso, index) => (
                  <ComparativaRow key={curso.curso} curso={curso} index={index} onSelect={setCursoSeleccionado} />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  Campañas de {cursoInfo?.nombre}
                </h3>
              </div>
              <div className="grid grid-cols-7 gap-2 p-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-2 pl-2">Campaña</div><div>Invertido</div><div>Leads</div><div>CPL</div><div>CTR</div><div>Impr.</div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {datos.campañas.length > 0 ? datos.campañas.map((campaña, index) => (
                  <CampaignRow key={campaña.nombre} campaña={campaña} index={index} />
                )) : <div className="p-6 text-center text-gray-500 text-sm">No hay campañas</div>}
              </div>
            </div>
          )}

          {/* Scatter */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-gray-400" />
                Eficiencia por Curso
              </h3>
              <span className="text-xs text-gray-500">Inversión vs Leads</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <XAxis type="number" dataKey="inversion" name="Inversión" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `$${v}K`} domain={[0, 'dataMax + 50']} />
                  <YAxis type="number" dataKey="leads" name="Leads" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[0, 'dataMax + 20']} width={35} />
                  <ZAxis type="number" dataKey="cpl" range={[100, 500]} />
                  <Tooltip content={<CustomTooltipScatter />} />
                  <Scatter data={scatterData} shape="circle">
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={scatterColors[index % scatterColors.length]} fillOpacity={0.8} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {scatterData.map((item, index) => (
                <div key={item.curso} className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: scatterColors[index] }} />
                  <span className="text-gray-600">{item.curso}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fila 3: Distribución */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-gray-400" />
              Distribución: ¿Dónde va la plata vs dónde vienen los leads?
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-center text-gray-500 mb-2">% Inversión</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={distribucionInversion} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                      {distribucionInversion.map((entry, index) => (<Cell key={`cell-inv-${index}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {distribucionInversion.map((item) => (
                  <div key={item.name} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600">{item.name}: {item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-center text-gray-500 mb-2">% Leads</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={distribucionLeads} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                      {distribucionLeads.map((entry, index) => (<Cell key={`cell-leads-${index}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {distribucionLeads.map((item) => (
                  <div key={item.name} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600">{item.name}: {item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-amber-800">APA tiene desbalance:</span>
                <span className="text-amber-700"> Recibe 31.7% de inversión pero solo genera 20.8% de leads. Revisar segmentación.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Agente IA */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-lg">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Agente IA</h3>
              <p className="text-[10px] text-gray-400">Análisis inteligente</p>
            </div>
          </div>
          <div className="space-y-3">
            {alertas.filter(a => cursoSeleccionado === 'todos' || a.curso === cursoSeleccionado).map((alerta, index) => (
              <div key={index} className="p-3 bg-white/10 rounded-lg border border-white/10">
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 flex-shrink-0 ${alerta.tipo === 'warning' ? 'text-amber-400' : alerta.tipo === 'success' ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {alerta.tipo === 'warning' ? <AlertTriangle className="w-4 h-4" /> : alerta.tipo === 'success' ? <TrendingUp className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${alerta.tipo === 'warning' ? 'text-amber-400' : alerta.tipo === 'success' ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {alerta.tipo === 'warning' ? 'Alerta' : alerta.tipo === 'success' ? 'Destacado' : 'Info'}
                    </p>
                    <p className="text-[11px] text-gray-300 mt-1">{alerta.mensaje}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Generar análisis completo
          </button>
        </div>
      </div>
    </div>
  );
}
