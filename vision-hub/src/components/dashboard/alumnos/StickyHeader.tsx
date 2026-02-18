'use client';

import { ReactNode } from 'react';
import {
  GraduationCap, Download, RefreshCw, ChevronDown, ChevronUp,
  FileSpreadsheet, FileText, File, Filter,
} from 'lucide-react';
import type { FiltrosState } from '@/components/dashboard/alumnos/AlumnosFiltros';

const ESTADOS_LABEL: Record<string, string> = {
  '': 'Todos', activo: 'Cursando', finalizado: 'Egresados', baja: 'Bajas',
};

interface Props {
  isCollapsed: boolean;
  onToggle: () => void;
  filtros: FiltrosState;
  isLoading: boolean;
  onRefresh: () => void;
  showExport: boolean;
  onToggleExport: () => void;
  onExport: (fmt: string) => void;
  children: ReactNode;
}

export default function StickyHeader({
  isCollapsed, onToggle, filtros, isLoading,
  onRefresh, showExport, onToggleExport, onExport, children,
}: Props) {
  const hasFilters = filtros.cursosSeleccionados.length > 0 ||
    filtros.estadoSeleccionado !== '' ||
    filtros.fechaDesdeManual !== '' || filtros.fechaHastaManual !== '';

  const filterSummary = () => {
    const parts: string[] = [];
    if (filtros.cursosSeleccionados.length > 0) {
      parts.push(filtros.cursosSeleccionados.length === 1
        ? filtros.cursosSeleccionados[0]
        : `${filtros.cursosSeleccionados.length} cursos`);
    }
    if (filtros.estadoSeleccionado) {
      parts.push(ESTADOS_LABEL[filtros.estadoSeleccionado] || filtros.estadoSeleccionado);
    }
    if (filtros.fechaDesdeManual || filtros.fechaHastaManual) {
      const desde = filtros.fechaDesdeManual ? new Date(filtros.fechaDesdeManual).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '';
      const hasta = filtros.fechaHastaManual ? new Date(filtros.fechaHastaManual).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '';
      parts.push(`${desde}${desde && hasta ? ' → ' : ''}${hasta}`);
    }
    return parts;
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-12 lg:top-0 z-20 transition-all duration-200">
      {/* Compact bar - always visible */}
      <div className="px-3 sm:px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-lg shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-sm font-bold text-gray-900 shrink-0">Alumnos</h1>

          {/* Filter chips - only in collapsed mode */}
          {isCollapsed && hasFilters && (
            <div className="flex items-center gap-1.5 ml-2 min-w-0 overflow-hidden">
              <Filter className="w-3 h-3 text-gray-400 shrink-0" />
              {filterSummary().map((part, i) => (
                <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                  {part}
                </span>
              ))}
            </div>
          )}
          {isCollapsed && !hasFilters && (
            <span className="text-[10px] text-gray-400 ml-2">Sin filtros</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Export */}
          <div className="relative">
            <button onClick={onToggleExport}
              className="flex items-center gap-0.5 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
              <Download className="w-3.5 h-3.5" />
              <ChevronDown className="w-2 h-2" />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="p-2">
                  <p className="text-[10px] font-medium text-gray-400 uppercase px-2 mb-2">Exportar</p>
                  {[
                    { label: 'Excel (.xlsx)', icon: FileSpreadsheet, color: 'text-emerald-600', fmt: 'excel' },
                    { label: 'CSV (.csv)', icon: FileText, color: 'text-blue-600', fmt: 'csv' },
                    { label: 'PDF (.pdf)', icon: File, color: 'text-red-600', fmt: 'pdf' },
                  ].map(f => (
                    <button key={f.fmt} onClick={() => onExport(f.fmt)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded-lg">
                      <f.icon className={`w-3.5 h-3.5 ${f.color}`} />
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Refresh */}
          <button onClick={onRefresh} disabled={isLoading}
            className={`p-1.5 rounded-lg transition-all ${
              isLoading ? 'bg-[#e63946] text-white' : 'text-gray-400 hover:text-white hover:bg-[#e63946]'
            }`}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Toggle */}
          <button onClick={onToggle}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            title={isCollapsed ? 'Expandir filtros' : 'Colapsar filtros'}>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded content - filtros */}
      <div className={`overflow-hidden transition-all duration-200 ${isCollapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
        <div className="px-3 sm:px-4 pb-2 sm:pb-3">
          {children}
        </div>
      </div>
    </div>
  );
}
