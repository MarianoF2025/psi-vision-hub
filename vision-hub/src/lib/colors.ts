// PSI Vision Hub - Design System Colors
// Fuente única de verdad para colores

export const colors = {
  // Brand Principal
  psi: {
    red: '#e63946',
    redDark: '#c1121f',
    redLight: '#fee2e2',
  },
  
  // Sidebar & Paneles Oscuros
  slate: {
    900: '#0f172a',
    800: '#1e2a3b',
    700: '#334155',
    600: '#475569',
    500: '#64748b',
    400: '#94a3b8',
    300: '#cbd5e1',
    200: '#e2e8f0',
    100: '#f1f5f9',
    50: '#f8fafc',
  },
  
  // Semánticos (solo para deltas/estados)
  semantic: {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  
  // Fondos
  background: {
    page: '#f8fafc',
    card: '#ffffff',
    muted: '#f1f5f9',
  }
} as const;

export const tw = {
  kpiIcon: {
    bg: 'bg-slate-100',
    icon: 'text-slate-600',
  },
  kpiIconHighlight: {
    bg: 'bg-red-50',
    icon: 'text-[#e63946]',
  },
  deltaPositive: 'text-emerald-600',
  deltaNegative: 'text-red-500',
  deltaNeutral: 'text-slate-500',
  agentPanel: 'bg-gradient-to-br from-slate-900 to-slate-800',
  sidebar: 'bg-[#1e2a3b]',
  sidebarActive: 'bg-[#e63946]',
  btnPrimary: 'bg-[#e63946] hover:bg-[#c1121f] text-white',
  btnSecondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
} as const;

export type SemanticColor = keyof typeof colors.semantic;
