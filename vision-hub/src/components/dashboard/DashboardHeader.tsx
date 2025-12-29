'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  File,
  ChevronDown
} from 'lucide-react';

interface DashboardHeaderProps {
  titulo: string;
  subtitulo: string;
  icono: React.ReactNode;
  periodo: string;
  onPeriodoChange: (periodo: string) => void;
  onRefresh: () => void;
  onExport: (formato: 'excel' | 'csv' | 'pdf') => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const periodos = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'año', label: 'Año' },
];

export default function DashboardHeader({
  titulo,
  subtitulo,
  icono,
  periodo,
  onPeriodoChange,
  onRefresh,
  onExport,
  isLoading = false,
  children
}: DashboardHeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (formato: 'excel' | 'csv' | 'pdf') => {
    onExport(formato);
    setShowExportMenu(false);
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-12 lg:top-0 z-20">
      <div className="px-3 sm:px-4 py-2 sm:py-3">
        {/* Mobile: Stack vertical, Desktop: Horizontal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
          {/* Título e ícono */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-lg sm:rounded-xl">
              {icono}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">{titulo}</h1>
              <p className="text-[10px] sm:text-xs text-gray-500">{subtitulo}</p>
            </div>
          </div>

          {/* Controles: Período + Botones */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Selector de Período - Más compacto en mobile */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 flex-1 sm:flex-none">
              {periodos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPeriodoChange(p.id)}
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                    periodo === p.id
                      ? 'bg-[#e63946] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Botón Descargar */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className={`flex items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-lg transition-all ${
                  showExportMenu
                    ? 'bg-[#e63946] text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <ChevronDown className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-44 sm:w-48 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                  <div className="p-2">
                    <p className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider px-2 mb-2">
                      Exportar datos
                    </p>
                    <button
                      onClick={() => handleExport('excel')}
                      className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      <span>CSV (.csv)</span>
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <File className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                      <span>PDF (.pdf)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botón Actualizar */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                isLoading
                  ? 'bg-[#e63946] text-white'
                  : 'text-gray-500 hover:text-white hover:bg-[#e63946]'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Contenido adicional (selector de curso, filtros, etc.) */}
        {children}
      </div>
    </div>
  );
}
