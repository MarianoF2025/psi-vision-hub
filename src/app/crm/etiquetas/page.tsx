'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Plus, Tag, Edit2, Trash2, X } from 'lucide-react';

interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
  descripcion?: string;
  created_at: string;
}

const COLORES = [
  { nombre: 'Rojo', valor: '#ef4444' },
  { nombre: 'Naranja', valor: '#f97316' },
  { nombre: 'Amarillo', valor: '#eab308' },
  { nombre: 'Verde', valor: '#22c55e' },
  { nombre: 'Azul', valor: '#3b82f6' },
  { nombre: 'Indigo', valor: '#6366f1' },
  { nombre: 'Violeta', valor: '#8b5cf6' },
  { nombre: 'Rosa', valor: '#ec4899' },
];

export default function EtiquetasPage() {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Etiqueta | null>(null);
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [descripcion, setDescripcion] = useState('');

  const cargar = async () => {
    const { data } = await supabase.from('etiquetas_globales').select('*').order('nombre');
    if (data) setEtiquetas(data);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!nombre.trim()) return;
    if (editando) {
      await supabase.from('etiquetas_globales').update({ nombre, color, descripcion }).eq('id', editando.id);
    } else {
      await supabase.from('etiquetas_globales').insert({ nombre, color, descripcion });
    }
    setModalAbierto(false);
    setEditando(null);
    setNombre('');
    setColor('#6366f1');
    setDescripcion('');
    cargar();
  };

  const eliminar = async (id: string) => {
    if (confirm('¿Eliminar esta etiqueta?')) {
      await supabase.from('etiquetas_globales').delete().eq('id', id);
      cargar();
    }
  };

  const abrirEditar = (et: Etiqueta) => {
    setEditando(et);
    setNombre(et.nombre);
    setColor(et.color);
    setDescripcion(et.descripcion || '');
    setModalAbierto(true);
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Etiquetas</h1>
          <button
            onClick={() => { setEditando(null); setNombre(''); setColor('#6366f1'); setDescripcion(''); setModalAbierto(true); }}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-600"
          >
            <Plus size={16} /> Nueva Etiqueta
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="text-slate-400 col-span-full text-center py-8">Cargando...</p>
          ) : etiquetas.length === 0 ? (
            <p className="text-slate-400 col-span-full text-center py-8">No hay etiquetas</p>
          ) : etiquetas.map((et) => (
            <div key={et.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: et.color + '20' }}>
                    <Tag size={20} style={{ color: et.color }} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">{et.nombre}</p>
                    {et.descripcion && <p className="text-xs text-slate-500 mt-0.5">{et.descripcion}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => abrirEditar(et)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                    <Edit2 size={14} className="text-slate-400" />
                  </button>
                  <button onClick={() => eliminar(et.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                {editando ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white"
                  placeholder="Ej: VIP, Urgente, Pagado..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORES.map((c) => (
                    <button
                      key={c.valor}
                      onClick={() => setColor(c.valor)}
                      className={cn('w-8 h-8 rounded-lg transition-transform', color === c.valor && 'ring-2 ring-offset-2 ring-indigo-500 scale-110')}
                      style={{ backgroundColor: c.valor }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalAbierto(false)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-medium">
                Cancelar
              </button>
              <button onClick={guardar} className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
