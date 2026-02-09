'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Search, ChevronDown, ChevronUp, X, Check, BarChart3, TrendingUp } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Paleta PSI ───
const PSI_RED = '#e63946';
const SLATE_700 = '#334155';

interface CursoAgregado {
  curso_codigo: string;
  total_alumnos: number;
  total_con_inscripcion: number;
  monto_vendido: number;
  monto_cobrado: number;
  tasa_cobro: number;
  ticket_promedio: number;
  total_cohortes: number;
  morosos: number;
}

interface CohorteDetalle {
  curso_codigo: string;
  educativa_codigo: string;
  cohorte_nombre: string;
  cohorte_anio: number;
  cohorte_mes: number;
  alumnos_cohorte: number;
  con_inscripcion: number;
  monto_vendido: number;
  monto_cobrado: number;
  tasa_cobro: number;
  morosos: number;
}

const formatCurrency = (v: number) => {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};
const formatNumber = (v: number) => new Intl.NumberFormat('es-AR').format(v);
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function CursosDetalle() {
  const [cursosRaw, setCursosRaw] = useState<CursoAgregado[]>([]);
  const [cohortesRaw, setCohortesRaw] = useState<CohorteDetalle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Curso selector
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCursos, setSelectedCursos] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cohorte selector
  const [cohorteMode, setCohorteMode] = useState<'todas' | 'especificas'>('todas');
  const [selectedCohortes, setSelectedCohortes] = useState<string[]>([]);

  // Load ALL data (no date filter — independent from header)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_ventas_cursos_detalle', {
        p_fecha_desde: null,
        p_fecha_hasta: null,
        p_curso_codigo: null,
      });
      if (data && !error) {
        setCursosRaw(data.cursos || []);
        setCohortesRaw(data.cohortes || []);
      }
    } catch (error) {
      console.error('Error cargando cursos detalle:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Available cohorte pills — filtered by selected cursos, organized by year rows
  const cohortesDisponibles = useMemo(() => {
    const source = selectedCursos.length > 0
      ? cohortesRaw.filter(c => selectedCursos.includes(c.curso_codigo))
      : cohortesRaw;

    const map = new Map<string, { anio: number; mes: number }>();
    source.forEach(c => {
      if (!c.cohorte_anio || !c.cohorte_mes) return;
      const key = `${c.cohorte_anio}-${String(c.cohorte_mes).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { anio: c.cohorte_anio, mes: c.cohorte_mes });
    });

    // Group by year
    const byYear = new Map<number, { key: string; mes: number; label: string }[]>();
    map.forEach(({ anio, mes }, key) => {
      if (!byYear.has(anio)) byYear.set(anio, []);
      byYear.get(anio)!.push({ key, mes, label: `${MESES_CORTO[mes - 1]} ${anio}` });
    });

    // Sort: years desc, months desc within year
    const result: { anio: number; items: { key: string; mes: number; label: string }[] }[] = [];
    Array.from(byYear.keys()).sort((a, b) => b - a).forEach(anio => {
      const items = byYear.get(anio)!.sort((a, b) => b.mes - a.mes);
      result.push({ anio, items });
    });
    return result;
  }, [cohortesRaw, selectedCursos]);

  // Clear invalid cohorte selections when cursos change
  useEffect(() => {
    const validKeys = new Set(cohortesDisponibles.flatMap(y => y.items.map(i => i.key)));
    setSelectedCohortes(prev => prev.filter(k => validKeys.has(k)));
  }, [cohortesDisponibles]);

  const toggleCohorte = (key: string) => {
    setSelectedCohortes(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleCohorteMode = (mode: 'todas' | 'especificas') => {
    setCohorteMode(mode);
    if (mode === 'todas') setSelectedCohortes([]);
  };

  // Filter cohortes by selected pills
  const cohortesFiltered = useMemo(() => {
    if (cohorteMode === 'todas' || selectedCohortes.length === 0) return cohortesRaw;
    return cohortesRaw.filter(c => {
      const key = `${c.cohorte_anio}-${String(c.cohorte_mes).padStart(2, '0')}`;
      return selectedCohortes.includes(key);
    });
  }, [cohortesRaw, selectedCohortes, cohorteMode]);

  // Recalculate cursos from filtered cohortes
  const cursos = useMemo(() => {
    if (cohorteMode === 'todas' || selectedCohortes.length === 0) return cursosRaw;
    const map = new Map<string, CursoAgregado>();
    cohortesFiltered.forEach(c => {
      const ex = map.get(c.curso_codigo);
      if (ex) {
        ex.total_con_inscripcion += c.con_inscripcion;
        ex.total_alumnos += c.alumnos_cohorte;
        ex.monto_vendido += c.monto_vendido;
        ex.monto_cobrado += c.monto_cobrado;
        ex.morosos += c.morosos;
        ex.total_cohortes += 1;
      } else {
        map.set(c.curso_codigo, {
          curso_codigo: c.curso_codigo,
          total_alumnos: c.alumnos_cohorte,
          total_con_inscripcion: c.con_inscripcion,
          monto_vendido: c.monto_vendido,
          monto_cobrado: c.monto_cobrado,
          tasa_cobro: 0, ticket_promedio: 0,
          total_cohortes: 1, morosos: c.morosos,
        });
      }
    });
    return Array.from(map.values())
      .map(c => ({
        ...c,
        tasa_cobro: c.monto_vendido > 0 ? Math.round(c.monto_cobrado / c.monto_vendido * 1000) / 10 : 0,
        ticket_promedio: c.total_con_inscripcion > 0 ? Math.round(c.monto_vendido / c.total_con_inscripcion) : 0,
      }))
      .sort((a, b) => b.monto_vendido - a.monto_vendido);
  }, [cursosRaw, cohortesFiltered, selectedCohortes, cohorteMode]);

  // Curso dropdown
  const filteredDropdown = cursos.filter(c =>
    !search || c.curso_codigo.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCurso = (codigo: string) => {
    setSelectedCursos(prev =>
      prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]
    );
  };

  // Chart data
  const displayCursos = selectedCursos.length > 0
    ? cursos.filter(c => selectedCursos.includes(c.curso_codigo))
    : cursos.slice(0, 5);

  const isSingleCourse = selectedCursos.length === 1;

  const chartData = useMemo(() => {
    if (isSingleCourse) {
      return cohortesFiltered
        .filter(c => c.curso_codigo === selectedCursos[0])
        .sort((a, b) => a.cohorte_anio - b.cohorte_anio || a.cohorte_mes - b.cohorte_mes)
        .map(c => ({
          name: `${MESES_CORTO[c.cohorte_mes - 1]} ${c.cohorte_anio}`,
          vendido: c.monto_vendido,
          cobrado: c.monto_cobrado,
        }));
    }
    return displayCursos.map(c => ({
      name: c.curso_codigo,
      vendido: c.monto_vendido,
      cobrado: c.monto_cobrado,
    }));
  }, [selectedCursos, cohortesFiltered, displayCursos, isSingleCourse]);

  // Table data
  const tableData = selectedCursos.length > 0
    ? cursos.filter(c => selectedCursos.includes(c.curso_codigo))
    : cursos.slice(0, 15);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      {/* Header + Selectors */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: PSI_RED }} />
            Análisis por Curso
          </h3>
          <span className="text-[10px] text-slate-400">
            {selectedCursos.length === 0
              ? `${cursos.length} cursos · Top 5 por facturación`
              : `${selectedCursos.length} seleccionado${selectedCursos.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Selected pills */}
        {selectedCursos.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {selectedCursos.map(c => (
              <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border"
                style={{ backgroundColor: `${PSI_RED}10`, borderColor: `${PSI_RED}30`, color: PSI_RED }}>
                {c}
                <button onClick={() => toggleCurso(c)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
              </span>
            ))}
            <button onClick={() => setSelectedCursos([])} className="text-[10px] text-slate-400 hover:text-red-500 ml-1">Limpiar</button>
          </div>
        )}

        {/* Curso dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400 flex-1">Agregar más cursos...</span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>

          {isOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-80 overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por código o nombre..."
                    className="w-full pl-8 pr-3 py-2 text-sm border-0 focus:ring-0 bg-slate-50 rounded-lg" autoFocus />
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
                <button onClick={() => setSelectedCursos(filteredDropdown.map(c => c.curso_codigo))}
                  className="text-xs font-medium hover:underline" style={{ color: PSI_RED }}>
                  Seleccionar todos ({filteredDropdown.length})
                </button>
                <span className="text-[10px] text-slate-400">{selectedCursos.length} seleccionados</span>
              </div>
              <div className="overflow-y-auto max-h-52">
                {filteredDropdown.map(curso => {
                  const isSel = selectedCursos.includes(curso.curso_codigo);
                  return (
                    <div key={curso.curso_codigo} onClick={() => toggleCurso(curso.curso_codigo)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSel ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                      <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{ backgroundColor: isSel ? PSI_RED : 'transparent', borderColor: isSel ? PSI_RED : '#cbd5e1' }}>
                        {isSel && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-24">{curso.curso_codigo}</span>
                      <span className="text-xs text-slate-500 flex-1 truncate">{formatNumber(curso.total_con_inscripcion)} inscr.</span>
                      <span className="text-xs text-slate-400">{formatCurrency(curso.monto_vendido)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Cohorte pills — Remarketing style: rows by year */}
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cohorte</span>
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => handleCohorteMode('todas')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${cohorteMode === 'todas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                Todas
              </button>
              <button onClick={() => handleCohorteMode('especificas')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${cohorteMode === 'especificas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                Específicas
              </button>
            </div>
            {cohorteMode === 'especificas' && selectedCohortes.length > 0 && (
              <button onClick={() => setSelectedCohortes([])} className="text-[10px] text-slate-400 hover:text-red-500">Limpiar</button>
            )}
          </div>

          {cohorteMode === 'especificas' && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {cohortesDisponibles.length === 0 ? (
                <span className="text-xs text-slate-400">No hay cohortes para los filtros actuales</span>
              ) : (
                cohortesDisponibles.map(yearGroup => (
                  <div key={yearGroup.anio} className="flex flex-wrap gap-1.5">
                    {yearGroup.items.map(ch => {
                      const isSel = selectedCohortes.includes(ch.key);
                      return (
                        <button key={ch.key} onClick={() => toggleCohorte(ch.key)}
                          className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-all"
                          style={{
                            backgroundColor: isSel ? PSI_RED : 'white',
                            color: isSel ? 'white' : '#475569',
                            borderColor: isSel ? PSI_RED : '#e2e8f0',
                          }}>
                          {ch.label}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">
            {isSingleCourse ? `${selectedCursos[0]} — Evolución por Cohorte` : 'Comparativo de Facturación'}
          </span>
        </div>

        <div className="h-52">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">Sin datos para este período</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'vendido' ? 'Vendido' : 'Cobrado'
                  ]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="vendido" fill={SLATE_700} radius={[4, 4, 0, 0]} name="Vendido" />
                <Bar dataKey="cobrado" fill={PSI_RED} radius={[4, 4, 0, 0]} opacity={0.8} name="Cobrado" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="p-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              {['Curso','Cohortes','Inscriptos','Vendido','Cobrado','% Cobro','Morosos','Ticket'].map(h => (
                <th key={h} className={`py-2.5 px-3 font-medium text-slate-500 uppercase tracking-wider text-[10px] ${h === 'Curso' ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map(curso => (
              <tr key={curso.curso_codigo} onClick={() => toggleCurso(curso.curso_codigo)}
                className={`border-b border-slate-50 cursor-pointer transition-colors ${selectedCursos.includes(curso.curso_codigo) ? 'bg-red-50/30' : 'hover:bg-slate-50'}`}>
                <td className="py-2.5 px-3 font-semibold text-slate-900">{curso.curso_codigo}</td>
                <td className="text-right py-2.5 px-3 text-slate-600">{curso.total_cohortes}</td>
                <td className="text-right py-2.5 px-3 font-medium text-slate-900">{formatNumber(curso.total_con_inscripcion)}</td>
                <td className="text-right py-2.5 px-3 font-medium text-slate-900">{formatCurrency(curso.monto_vendido)}</td>
                <td className="text-right py-2.5 px-3 font-medium" style={{ color: PSI_RED }}>{formatCurrency(curso.monto_cobrado)}</td>
                <td className="text-right py-2.5 px-3">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      backgroundColor: curso.tasa_cobro >= 50 ? '#f0fdf4' : `${PSI_RED}10`,
                      color: curso.tasa_cobro >= 50 ? '#16a34a' : PSI_RED,
                    }}>
                    {curso.tasa_cobro}%
                  </span>
                </td>
                <td className="text-right py-2.5 px-3">
                  {curso.morosos > 0 ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ backgroundColor: `${PSI_RED}10`, color: PSI_RED }}>
                      {formatNumber(curso.morosos)}
                    </span>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="text-right py-2.5 px-3 text-slate-600">{formatCurrency(curso.ticket_promedio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {selectedCursos.length === 0 && cursos.length > 15 && (
          <p className="text-center text-[10px] text-slate-400 mt-3">
            Mostrando top 15 de {cursos.length}. Usá el selector para filtrar cursos específicos.
          </p>
        )}
      </div>
    </div>
  );
}
