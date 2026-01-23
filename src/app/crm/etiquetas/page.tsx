'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { 
  Plus, Tag, Edit2, Trash2, X, Search, 
  Filter, SlidersHorizontal, Users,
  TrendingUp, GraduationCap, Building2, HeartHandshake, AlertTriangle, HelpCircle
} from 'lucide-react';

interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
  descripcion?: string;
  categoria: string;
  activa: boolean;
  created_at: string;
  _count?: number;
}

const COLORES = [
  { nombre: 'Rojo', valor: '#ef4444' },
  { nombre: 'Naranja', valor: '#f97316' },
  { nombre: 'Amarillo', valor: '#eab308' },
  { nombre: 'Lima', valor: '#84cc16' },
  { nombre: 'Verde', valor: '#22c55e' },
  { nombre: 'Esmeralda', valor: '#10b981' },
  { nombre: 'Cyan', valor: '#06b6d4' },
  { nombre: 'Azul', valor: '#3b82f6' },
  { nombre: 'Indigo', valor: '#6366f1' },
  { nombre: 'Violeta', valor: '#8b5cf6' },
  { nombre: 'Rosa', valor: '#ec4899' },
  { nombre: 'Gris', valor: '#6b7280' },
];

const CATEGORIAS = [
  { id: 'ventas', nombre: 'Ventas', color: '#22c55e', icon: TrendingUp },
  { id: 'alumnos', nombre: 'Alumnos', color: '#8b5cf6', icon: GraduationCap },
  { id: 'administracion', nombre: 'Administración', color: '#3b82f6', icon: Building2 },
  { id: 'comunidad', nombre: 'Comunidad', color: '#f97316', icon: HeartHandshake },
  { id: 'soporte', nombre: 'Soporte', color: '#6b7280', icon: HelpCircle },
  { id: 'prioridad', nombre: 'Prioridad', color: '#ef4444', icon: AlertTriangle },
];

const ORDENAR_OPTIONS = [
  { id: 'nombre-asc', nombre: 'Nombre A-Z' },
  { id: 'nombre-desc', nombre: 'Nombre Z-A' },
  { id: 'uso-desc', nombre: 'Más usadas' },
  { id: 'uso-asc', nombre: 'Menos usadas' },
  { id: 'recientes', nombre: 'Más recientes' },
];

export default function EtiquetasPage() {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Etiqueta | null>(null);
  
  // Campos del formulario
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('ventas');
  const [activa, setActiva] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('activas');
  const [ordenar, setOrdenar] = useState('nombre-asc');

  const cargar = async () => {
    setLoading(true);
    
    // Cargar etiquetas
    const { data: etiquetasData } = await supabase
      .from('etiquetas_globales')
      .select('*')
      .order('nombre');
    
    if (etiquetasData) setEtiquetas(etiquetasData);

    // Cargar conteo de uso por etiqueta
    const { data: conteosData } = await supabase
      .from('etiquetas_contactos')
      .select('etiqueta_id');
    
    if (conteosData) {
      const counts: Record<string, number> = {};
      conteosData.forEach((row: any) => {
        counts[row.etiqueta_id] = (counts[row.etiqueta_id] || 0) + 1;
      });
      setConteos(counts);
    }

    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  // Filtrar y ordenar etiquetas
  const etiquetasFiltradas = useMemo(() => {
    let resultado = [...etiquetas];

    // Filtro por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(et => 
        et.nombre.toLowerCase().includes(termino) ||
        et.descripcion?.toLowerCase().includes(termino)
      );
    }

    // Filtro por categoría
    if (filtroCategoria !== 'todas') {
      resultado = resultado.filter(et => et.categoria === filtroCategoria);
    }

    // Filtro por estado
    if (filtroEstado === 'activas') {
      resultado = resultado.filter(et => et.activa !== false);
    } else if (filtroEstado === 'inactivas') {
      resultado = resultado.filter(et => et.activa === false);
    }

    // Ordenar
    resultado.sort((a, b) => {
      switch (ordenar) {
        case 'nombre-asc':
          return a.nombre.localeCompare(b.nombre);
        case 'nombre-desc':
          return b.nombre.localeCompare(a.nombre);
        case 'uso-desc':
          return (conteos[b.id] || 0) - (conteos[a.id] || 0);
        case 'uso-asc':
          return (conteos[a.id] || 0) - (conteos[b.id] || 0);
        case 'recientes':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return resultado;
  }, [etiquetas, busqueda, filtroCategoria, filtroEstado, ordenar, conteos]);

  const guardar = async () => {
    if (!nombre.trim()) return;
    
    const datos = { nombre, color, descripcion, categoria, activa };
    
    if (editando) {
      await supabase.from('etiquetas_globales').update(datos).eq('id', editando.id);
    } else {
      await supabase.from('etiquetas_globales').insert(datos);
    }
    
    cerrarModal();
    cargar();
  };

  const eliminar = async (id: string) => {
    if (confirm('¿Eliminar esta etiqueta? Se quitará de todos los contactos que la tengan.')) {
      await supabase.from('etiquetas_globales').delete().eq('id', id);
      cargar();
    }
  };

  const abrirEditar = (et: Etiqueta) => {
    setEditando(et);
    setNombre(et.nombre);
    setColor(et.color);
    setDescripcion(et.descripcion || '');
    setCategoria(et.categoria || 'ventas');
    setActiva(et.activa !== false);
    setModalAbierto(true);
  };

  const abrirNuevo = () => {
    setEditando(null);
    setNombre('');
    setColor('#6366f1');
    setDescripcion('');
    setCategoria('ventas');
    setActiva(true);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const getCategoriaInfo = (catId: string) => {
    return CATEGORIAS.find(c => c.id === catId) || CATEGORIAS[0];
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Tag size={24} className="text-indigo-500" />
              Etiquetas
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gestión de etiquetas para clasificar contactos
            </p>
          </div>
          <button
            onClick={abrirNuevo}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-600 transition-colors"
          >
            <Plus size={16} /> Nueva Etiqueta
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Búsqueda */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar etiqueta..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>

            {/* Categoría */}
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-slate-800 dark:text-white"
            >
              <option value="todas">Todas las categorías</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>

            {/* Estado */}
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-slate-800 dark:text-white"
            >
              <option value="todas">Todos los estados</option>
              <option value="activas">Activas</option>
              <option value="inactivas">Inactivas</option>
            </select>

            {/* Ordenar */}
            <select
              value={ordenar}
              onChange={(e) => setOrdenar(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-slate-800 dark:text-white"
            >
              {ORDENAR_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contador */}
        <div className="text-sm text-slate-500 mb-4">
          Mostrando {etiquetasFiltradas.length} de {etiquetas.length} etiquetas
        </div>

        {/* Grid de etiquetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : etiquetasFiltradas.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Tag size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-slate-500">No se encontraron etiquetas</p>
              {busqueda && (
                <button 
                  onClick={() => setBusqueda('')}
                  className="mt-2 text-sm text-indigo-500 hover:underline"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            etiquetasFiltradas.map((et) => {
              const catInfo = getCategoriaInfo(et.categoria);
              const CatIcon = catInfo.icon;
              const cantidadUsos = conteos[et.id] || 0;

              return (
                <div 
                  key={et.id} 
                  className={cn(
                    "bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md",
                    !et.activa && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-11 h-11 rounded-xl flex items-center justify-center" 
                        style={{ backgroundColor: et.color + '20' }}
                      >
                        <Tag size={22} style={{ color: et.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white truncate">
                          {et.nombre}
                        </p>
                        {et.descripcion && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {et.descripcion}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button 
                        onClick={() => abrirEditar(et)} 
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Edit2 size={14} className="text-slate-400" />
                      </button>
                      <button 
                        onClick={() => eliminar(et.id)} 
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Footer con categoría y contador */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div 
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
                      style={{ 
                        backgroundColor: catInfo.color + '15',
                        color: catInfo.color 
                      }}
                    >
                      <CatIcon size={12} />
                      {catInfo.nombre}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Users size={12} />
                      {cantidadUsos} {cantidadUsos === 1 ? 'contacto' : 'contactos'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                {editando ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
              </h2>
              <button 
                onClick={cerrarModal} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-5 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white"
                  placeholder="Ej: VIP, Urgente, Pagado..."
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Categoría
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIAS.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoria(cat.id)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
                          categoria === cat.id
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                      >
                        <CatIcon size={18} style={{ color: cat.color }} />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {cat.nombre}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLORES.map((c) => (
                    <button
                      key={c.valor}
                      type="button"
                      onClick={() => setColor(c.valor)}
                      className={cn(
                        'w-8 h-8 rounded-lg transition-all',
                        color.toLowerCase() === c.valor.toLowerCase() && 'ring-2 ring-offset-2 ring-indigo-500 scale-110'
                      )}
                      style={{ backgroundColor: c.valor }}
                      title={c.nombre}
                    />
                  ))}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white"
                  placeholder="Breve descripción de la etiqueta..."
                />
              </div>

              {/* Activa */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Etiqueta activa</p>
                  <p className="text-xs text-slate-500">Las etiquetas inactivas no aparecen al asignar</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiva(!activa)}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-colors",
                    activa ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                    activa ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="flex gap-3 p-5 border-t border-slate-200 dark:border-slate-800">
              <button 
                onClick={cerrarModal} 
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={guardar} 
                className="flex-1 px-4 py-2.5 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
