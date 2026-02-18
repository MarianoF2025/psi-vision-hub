'use client';

import { useState, useMemo } from 'react';
import { Search, X, GraduationCap, BookOpen, UserX, ChevronDown, ChevronUp } from 'lucide-react';
import type { CursoConCohortes, CohorteInfo } from '@/lib/supabase-alumnos';

const MESES_LABEL = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const PSI_RED = '#e63946';

export interface FiltrosState {
  cursosSeleccionados: string[];
  cohorteMode: 'todas' | 'especificas';
  cohortesSeleccionadas: string[];
  estadoSeleccionado: string;
  fechaDesdeManual: string;
  fechaHastaManual: string;
}

interface Props {
  cursosData: CursoConCohortes[];
  filtros: FiltrosState;
  onFiltrosChange: (filtros: FiltrosState) => void;
  fechasEfectivas: { desde: string; hasta: string };
  nivel: 'global' | 'curso' | 'cohorte';
}

const ESTADOS = [
  { id: '', nombre: 'Todos' },
  { id: 'activo', nombre: 'Cursando' },
  { id: 'finalizado', nombre: 'Egresados' },
  { id: 'baja', nombre: 'Bajas' },
];

export default function AlumnosFiltros({ cursosData, filtros, onFiltrosChange, fechasEfectivas, nivel }: Props) {
  const [busquedaCurso, setBusquedaCurso] = useState('');
  const [showCursosList, setShowCursosList] = useState(false);

  const cursosOrdenados = useMemo(() => {
    return [...cursosData].sort((a, b) => b.total_alumnos - a.total_alumnos);
  }, [cursosData]);

  const cursosFiltrados = useMemo(() => {
    if (!busquedaCurso) return cursosOrdenados;
    const q = busquedaCurso.toLowerCase();
    return cursosOrdenados.filter(c =>
      c.curso_nombre.toLowerCase().includes(q) ||
      c.curso_codigo.toLowerCase().includes(q)
    );
  }, [cursosOrdenados, busquedaCurso]);

  const cohortesDisponibles = useMemo(() => {
    if (filtros.cursosSeleccionados.length === 0) return [];
    const cohortes: (CohorteInfo & { cursoCodigo: string })[] = [];
    filtros.cursosSeleccionados.forEach(codigo => {
      const curso = cursosData.find(c => c.curso_codigo === codigo);
      if (curso) {
        curso.cohortes.forEach(coh => {
          cohortes.push({ ...coh, cursoCodigo: codigo });
        });
      }
    });
    return cohortes.sort((a, b) => b.anio - a.anio || b.mes - a.mes);
  }, [filtros.cursosSeleccionados, cursosData]);

  const periodosUnicos = useMemo(() => {
    const set = new Map<string, { mes: number; anio: number; totalAlumnos: number; codigos: string[] }>();
    cohortesDisponibles.forEach(c => {
      const key = `${c.anio}-${String(c.mes).padStart(2, '0')}`;
      const existing = set.get(key);
      if (existing) {
        existing.totalAlumnos += c.alumnos;
        existing.codigos.push(c.educativa_codigo);
      } else {
        set.set(key, { mes: c.mes, anio: c.anio, totalAlumnos: c.alumnos, codigos: [c.educativa_codigo] });
      }
    });
    return Array.from(set.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, val]) => ({ key, ...val }));
  }, [cohortesDisponibles]);

  const toggleCurso = (codigo: string) => {
    const nuevos = filtros.cursosSeleccionados.includes(codigo)
      ? filtros.cursosSeleccionados.filter(c => c !== codigo)
      : [...filtros.cursosSeleccionados, codigo];
    onFiltrosChange({ ...filtros, cursosSeleccionados: nuevos, cohortesSeleccionadas: [], cohorteMode: 'todas' });
  };

  const toggleCohorte = (educativaCodigos: string[]) => {
    const allSelected = educativaCodigos.every(c => filtros.cohortesSeleccionadas.includes(c));
    let nuevas: string[];
    if (allSelected) {
      nuevas = filtros.cohortesSeleccionadas.filter(c => !educativaCodigos.includes(c));
    } else {
      nuevas = Array.from(new Set([...filtros.cohortesSeleccionadas, ...educativaCodigos]));
    }
    onFiltrosChange({ ...filtros, cohortesSeleccionadas: nuevas, cohorteMode: nuevas.length > 0 ? 'especificas' : 'todas', fechaDesdeManual: '', fechaHastaManual: '' });
  };

  const limpiarNombre = (nombre: string) => {
    return nombre.replace(/\s*-\s*(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+\d{4}/gi, '').trim();
  };

  const clearAll = () => {
    onFiltrosChange({ cursosSeleccionados: [], cohorteMode: 'todas', cohortesSeleccionadas: [], estadoSeleccionado: '', fechaDesdeManual: '', fechaHastaManual: '' });
    setBusquedaCurso('');
  };

  const hasFilters = filtros.cursosSeleccionados.length > 0 || filtros.estadoSeleccionado || filtros.fechaDesdeManual || filtros.fechaHastaManual;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <div className="w-32">
          <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Desde</label>
          <input type="date" value={filtros.fechaDesdeManual || fechasEfectivas.desde}
            onChange={(e) => onFiltrosChange({ ...filtros, fechaDesdeManual: e.target.value, cohortesSeleccionadas: [], cohorteMode: 'todas' })}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent" />
        </div>
        <div className="w-32">
          <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Hasta</label>
          <input type="date" value={filtros.fechaHastaManual || fechasEfectivas.hasta}
            onChange={(e) => onFiltrosChange({ ...filtros, fechaHastaManual: e.target.value, cohortesSeleccionadas: [], cohorteMode: 'todas' })}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent" />
        </div>
        <div className="flex items-center gap-1">
          {ESTADOS.map(est => (
            <button key={est.id} onClick={() => onFiltrosChange({ ...filtros, estadoSeleccionado: est.id })}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                filtros.estadoSeleccionado === est.id ? 'bg-[#e63946] border-[#e63946] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>{est.nombre}</button>
          ))}
        </div>
        {hasFilters && (
          <button onClick={clearAll} className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-[#e63946] transition-colors">
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
        <span className="text-[10px] text-slate-400 ml-auto">
          {fechasEfectivas.desde.split('-').reverse().join('/')} → {fechasEfectivas.hasta.split('-').reverse().join('/')}
          {nivel === 'global' && ' · Mes actual'}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setShowCursosList(!showCursosList)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <GraduationCap className="w-3.5 h-3.5" style={{ color: PSI_RED }} />
            CURSOS
            {filtros.cursosSeleccionados.length > 0 && (
              <span className="text-[10px] font-normal text-gray-400">{filtros.cursosSeleccionados.length} seleccionados</span>
            )}
            {showCursosList ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
          </button>
          {filtros.cursosSeleccionados.length > 0 && (
            <button onClick={() => onFiltrosChange({ ...filtros, cursosSeleccionados: [], cohortesSeleccionadas: [], cohorteMode: 'todas' })}
              className="text-[10px] text-[#e63946] hover:text-[#c1121f]">Limpiar</button>
          )}
        </div>

        {filtros.cursosSeleccionados.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {filtros.cursosSeleccionados.map(codigo => (
              <span key={codigo} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#e63946]/10 text-[#e63946] text-xs font-medium rounded-full">
                {codigo}
                <button onClick={() => toggleCurso(codigo)} className="hover:text-[#c1121f]"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}

        {showCursosList && (
          <>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" value={busquedaCurso} onChange={(e) => setBusquedaCurso(e.target.value)}
                placeholder="Buscar curso..." className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent" />
            </div>
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg">
              {cursosFiltrados.map(curso => {
                const isSelected = filtros.cursosSeleccionados.includes(curso.curso_codigo);
                const nombre = limpiarNombre(curso.curso_nombre);
                return (
                  <button key={curso.curso_codigo} onClick={() => toggleCurso(curso.curso_codigo)}
                    className={`w-full px-3 py-2 text-left text-xs border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-[#e63946]/5 text-[#e63946]' : 'hover:bg-gray-50 text-gray-700'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-[#e63946] border-[#e63946]' : 'border-gray-300'}`}>
                        {isSelected && (<svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>)}
                      </div>
                      <span className="font-medium">{curso.curso_codigo}</span>
                      <span className="text-gray-500">{nombre}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{curso.total_alumnos.toLocaleString('es-AR')}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {filtros.cursosSeleccionados.length > 0 && periodosUnicos.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-medium text-gray-500 uppercase">Cohorte</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={filtros.cohorteMode === 'todas'}
                  onChange={() => onFiltrosChange({ ...filtros, cohorteMode: 'todas', cohortesSeleccionadas: [] })}
                  className="w-3 h-3" style={{ accentColor: PSI_RED }} />
                <span className="text-[10px] text-gray-600">Todas</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={filtros.cohorteMode === 'especificas'}
                  onChange={() => onFiltrosChange({ ...filtros, cohorteMode: 'especificas' })}
                  className="w-3 h-3" style={{ accentColor: PSI_RED }} />
                <span className="text-[10px] text-gray-600">Específicas</span>
              </label>
            </div>
            {filtros.cohorteMode === 'especificas' && (
              <div className="flex flex-wrap gap-1.5">
                {periodosUnicos.map(p => {
                  const allSelected = p.codigos.every(c => filtros.cohortesSeleccionadas.includes(c));
                  return (
                    <button key={p.key} onClick={() => toggleCohorte(p.codigos)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                        allSelected ? 'bg-[#e63946] border-[#e63946] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <span className="font-medium">{MESES_LABEL[p.mes]} {p.anio}</span>
                      <span className={`ml-1 text-[10px] ${allSelected ? 'text-white/70' : 'text-gray-400'}`}>{p.totalAlumnos}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

