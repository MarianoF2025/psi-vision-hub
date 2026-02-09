'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  File,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
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

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const ANIO_INICIO = 2022;

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
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [pickerAnio, setPickerAnio] = useState(new Date().getFullYear());
  const exportRef = useRef<HTMLDivElement>(null);
  const yearPickerRef = useRef<HTMLDivElement>(null);

  const anioActual = new Date().getFullYear();
  const mesActual = new Date().getMonth();
  const anios = Array.from({ length: anioActual - ANIO_INICIO + 1 }, (_, i) => ANIO_INICIO + i);

  const isRapido = ['hoy', 'semana', 'mes'].includes(periodo);
  const isAnio = /^\d{4}$/.test(periodo);
  const isAnioMes = /^\d{4}-\d{2}$/.test(periodo);
  const periodoAnio = isAnio ? parseInt(periodo) : isAnioMes ? parseInt(periodo.split('-')[0]) : null;
  const periodoMes = isAnioMes ? parseInt(periodo.split('-')[1]) - 1 : null;

  const getYearButtonLabel = () => {
    if (isAnioMes) return `${MESES_CORTO[periodoMes!]} ${periodoAnio}`;
    if (isAnio) return `${periodoAnio}`;
    return `${anioActual}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target as Node)) {
        setShowYearPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRapido = (id: string) => {
    setShowYearPicker(false);
    onPeriodoChange(id);
  };

  const handleAnioCompleto = (anio: number) => {
    onPeriodoChange(`${anio}`);
    setShowYearPicker(false);
  };

  const handleMesClick = (mesIndex: number) => {
    const mesStr = String(mesIndex + 1).padStart(2, '0');
    onPeriodoChange(`${pickerAnio}-${mesStr}`);
    setShowYearPicker(false);
  };

  const handleExport = (formato: 'excel' | 'csv' | 'pdf') => {
    onExport(formato);
    setShowExportMenu(false);
  };

  const openYearPicker = () => {
    if (periodoAnio) {
      setPickerAnio(periodoAnio);
    } else {
      setPickerAnio(anioActual);
    }
    setShowYearPicker(!showYearPicker);
  };

  const isMesFuturo = (mesIndex: number) => {
    return pickerAnio === anioActual && mesIndex > mesActual;
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-12 lg:top-0 z-20">
      <div className="px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-lg sm:rounded-xl">
              {icono}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">{titulo}</h1>
              <p className="text-[10px] sm:text-xs text-gray-500">{subtitulo}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5 items-center">
              {[
                { id: 'hoy', label: 'Hoy' },
                { id: 'semana', label: 'Semana' },
                { id: 'mes', label: 'Mes' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleRapido(p.id)}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                    periodo === p.id
                      ? 'bg-[#e63946] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}

              <div className="relative" ref={yearPickerRef}>
                <button
                  onClick={openYearPicker}
                  className={`flex items-center gap-0.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                    isAnio || isAnioMes
                      ? 'bg-[#e63946] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="ml-0.5">{getYearButtonLabel()}</span>
                  <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showYearPicker ? 'rotate-180' : ''}`} />
                </button>

                {showYearPicker && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => setPickerAnio(Math.max(ANIO_INICIO, pickerAnio - 1))}
                          disabled={pickerAnio <= ANIO_INICIO}
                          className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>

                        <button
                          onClick={() => handleAnioCompleto(pickerAnio)}
                          className={`px-4 py-1 text-sm font-bold rounded-lg transition-all ${
                            isAnio && periodoAnio === pickerAnio
                              ? 'bg-[#e63946] text-white'
                              : 'text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          {pickerAnio}
                        </button>

                        <button
                          onClick={() => setPickerAnio(Math.min(anioActual, pickerAnio + 1))}
                          disabled={pickerAnio >= anioActual}
                          className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>

                      <p className="text-[9px] text-gray-400 text-center mb-2">
                        Click en el año para ver todo {pickerAnio} · Click en un mes para filtrar
                      </p>

                      <div className="grid grid-cols-4 gap-1">
                        {MESES_CORTO.map((mes, index) => {
                          const esFuturo = isMesFuturo(index);
                          const seleccionado = isAnioMes && periodoAnio === pickerAnio && periodoMes === index;

                          return (
                            <button
                              key={mes}
                              onClick={() => !esFuturo && handleMesClick(index)}
                              disabled={esFuturo}
                              className={`py-1.5 px-1 text-[11px] font-medium rounded-lg transition-all ${
                                seleccionado
                                  ? 'bg-[#e63946] text-white shadow-sm'
                                  : esFuturo
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {mes}
                            </button>
                          );
                        })}
                      </div>

                      {anios.length > 1 && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <div className="flex gap-1 justify-center">
                            {anios.map((a) => (
                              <button
                                key={a}
                                onClick={() => {
                                  setPickerAnio(a);
                                  handleAnioCompleto(a);
                                }}
                                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                                  isAnio && periodoAnio === a
                                    ? 'bg-[#e63946] text-white'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

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

        {children}
      </div>
    </div>
  );
}
