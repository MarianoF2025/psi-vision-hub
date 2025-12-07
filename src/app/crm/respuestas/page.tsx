'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Plus, MessageSquare, Edit2, Trash2, X, Copy, Check } from 'lucide-react';

interface Respuesta {
  id: string;
  atajo: string;
  titulo: string;
  contenido: string;
  categoria?: string;
  created_at: string;
}

export default function RespuestasPage() {
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Respuesta | null>(null);
  const [atajo, setAtajo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [categoria, setCategoria] = useState('');
  const [copiado, setCopiado] = useState<string | null>(null);

  const cargar = async () => {
    const { data } = await supabase.from('respuestas_predefinidas').select('*').order('atajo');
    if (data) setRespuestas(data);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!atajo.trim() || !contenido.trim()) return;
    const datos = { atajo: atajo.startsWith('/') ? atajo : '/' + atajo, titulo, contenido, categoria };
    if (editando) {
      await supabase.from('respuestas_predefinidas').update(datos).eq('id', editando.id);
    } else {
      await supabase.from('respuestas_predefinidas').insert(datos);
    }
    setModalAbierto(false);
    limpiar();
    cargar();
  };

  const limpiar = () => {
    setEditando(null);
    setAtajo('');
    setTitulo('');
    setContenido('');
    setCategoria('');
  };

  const eliminar = async (id: string) => {
    if (confirm('¿Eliminar esta respuesta?')) {
      await supabase.from('respuestas_predefinidas').delete().eq('id', id);
      cargar();
    }
  };

  const copiar = (texto: string, id: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 2000);
  };

  const abrirEditar = (r: Respuesta) => {
    setEditando(r);
    setAtajo(r.atajo);
    setTitulo(r.titulo);
    setContenido(r.contenido);
    setCategoria(r.categoria || '');
    setModalAbierto(true);
  };

  const categorias = [...new Set(respuestas.map(r => r.categoria).filter(Boolean))];

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Respuestas Rápidas</h1>
            <p className="text-sm text-slate-500 mt-1">Usá /atajo en el chat para insertar rápidamente</p>
          </div>
          <button
            onClick={() => { limpiar(); setModalAbierto(true); }}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-600"
          >
            <Plus size={16} /> Nueva Respuesta
          </button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-slate-400 text-center py-8">Cargando...</p>
          ) : respuestas.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No hay respuestas rápidas</p>
          ) : respuestas.map((r) => (
            <div key={r.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-sm font-mono rounded">
                      {r.atajo}
                    </code>
                    {r.titulo && <span className="font-medium text-slate-800 dark:text-white">{r.titulo}</span>}
                    {r.categoria && (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs rounded">
                        {r.categoria}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{r.contenido}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => copiar(r.contenido, r.id)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    title="Copiar"
                  >
                    {copiado === r.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-slate-400" />}
                  </button>
                  <button onClick={() => abrirEditar(r)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                    <Edit2 size={14} className="text-slate-400" />
                  </button>
                  <button onClick={() => eliminar(r.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded">
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                {editando ? 'Editar Respuesta' : 'Nueva Respuesta'}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Atajo</label>
                  <input
                    type="text"
                    value={atajo}
                    onChange={(e) => setAtajo(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white font-mono"
                    placeholder="/saludo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    list="categorias"
                    className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white"
                    placeholder="General"
                  />
                  <datalist id="categorias">
                    {categorias.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título (opcional)</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white"
                  placeholder="Saludo inicial"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contenido</label>
                <textarea
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white resize-none"
                  placeholder="Hola! Gracias por contactarnos..."
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
