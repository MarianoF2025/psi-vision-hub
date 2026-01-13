'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cn, formatPhone, getInitials, timeAgo } from '@/lib/utils';
import {
  Search, Plus, Filter, Download, MoreHorizontal,
  Pencil, Trash2, MessageSquare, X, User, Phone, Mail, Tag,
  AlertTriangle, Check
} from 'lucide-react';

interface Contacto {
  id: string;
  telefono: string;
  nombre?: string;
  email?: string;
  pais?: string;
  created_at: string;
  resultado?: string;
  etiquetas?: string[];
  notas?: string;
}

const RESULTADOS = [
  { value: '', label: 'En proceso', color: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400' },
  { value: 'INS', label: 'Inscripto/Alumno', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
  { value: 'NOINT', label: 'No interesado', color: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
  { value: 'NOCONT', label: 'No contactado', color: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' },
  { value: 'NR+', label: 'No responde plus', color: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400' },
];

export default function ContactosPage() {
  const router = useRouter();
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [modalEditar, setModalEditar] = useState<Contacto | null>(null);
  const [modalEliminar, setModalEliminar] = useState<Contacto | null>(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const menuRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    cargarContactos();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  const cargarContactos = async () => {
    const { data } = await supabase
      .from('contactos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setContactos(data);
    setLoading(false);
  };

  const filtrados = contactos.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda) ||
    c.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const guardarContacto = async (contacto: Partial<Contacto>, esNuevo: boolean) => {
    setGuardando(true);
    try {
      if (esNuevo) {
        if (!contacto.telefono) {
          setMensaje({ tipo: 'error', texto: 'El teléfono es requerido' });
          setGuardando(false);
          return;
        }
        let telefono = contacto.telefono.replace(/\D/g, '');
        if (!telefono.startsWith('+')) {
          telefono = '+' + telefono;
        }
        const { error } = await supabase
          .from('contactos')
          .insert({ ...contacto, telefono });
        if (error) {
          if (error.code === '23505') {
            setMensaje({ tipo: 'error', texto: 'Ya existe un contacto con ese teléfono' });
          } else {
            setMensaje({ tipo: 'error', texto: error.message });
          }
          setGuardando(false);
          return;
        }
        setMensaje({ tipo: 'success', texto: 'Contacto creado correctamente' });
        setModalNuevo(false);
      } else {
        const { error } = await supabase
          .from('contactos')
          .update(contacto)
          .eq('id', contacto.id);
        if (error) {
          setMensaje({ tipo: 'error', texto: error.message });
          setGuardando(false);
          return;
        }
        setMensaje({ tipo: 'success', texto: 'Contacto actualizado correctamente' });
        setModalEditar(null);
      }
      await cargarContactos();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al guardar el contacto' });
    }
    setGuardando(false);
  };

  const eliminarContacto = async (id: string) => {
    setGuardando(true);
    try {
      const { error } = await supabase
        .from('contactos')
        .delete()
        .eq('id', id);
      if (error) {
        setMensaje({ tipo: 'error', texto: error.message });
      } else {
        setMensaje({ tipo: 'success', texto: 'Contacto eliminado correctamente' });
        await cargarContactos();
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar el contacto' });
    }
    setModalEliminar(null);
    setGuardando(false);
  };

  const verConversaciones = async (telefono: string) => {
    const { data } = await supabase
      .from('conversaciones')
      .select('id')
      .eq('telefono', telefono)
      .limit(1)
      .single();
    if (data) {
      router.push(`/crm?conversacion=${data.id}`);
    } else {
      setMensaje({ tipo: 'error', texto: 'No hay conversaciones con este contacto' });
    }
    setMenuAbierto(null);
  };

  const exportarCSV = () => {
    const headers = ['Nombre', 'Teléfono', 'Email', 'Resultado', 'Creado'];
    const rows = filtrados.map(c => [
      c.nombre || '',
      c.telefono,
      c.email || '',
      c.resultado || 'En proceso',
      new Date(c.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contactos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getResultadoColor = (resultado?: string) => {
    const found = RESULTADOS.find(r => r.value === resultado);
    return found?.color || 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400';
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {mensaje && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2",
          mensaje.tipo === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}>
          {mensaje.tipo === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          {mensaje.texto}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Contactos</h1>
          <div className="flex gap-2">
            <button
              onClick={exportarCSV}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <Download size={16} /> Exportar
            </button>
            <button
              onClick={() => setModalNuevo(true)}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-600"
            >
              <Plus size={16} /> Nuevo Contacto
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-800 dark:text-white"
            />
          </div>
          <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm flex items-center gap-2">
            <Filter size={16} /> Filtros
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Contacto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Resultado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Etiquetas</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Creado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay contactos</td></tr>
              ) : filtrados.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-medium">
                        {getInitials(c.nombre || c.telefono)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">{c.nombre || 'Sin nombre'}</p>
                        {c.email && <p className="text-xs text-slate-500">{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatPhone(c.telefono)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getResultadoColor(c.resultado))}>
                      {RESULTADOS.find(r => r.value === c.resultado)?.label || 'En proceso'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(c.etiquetas || []).slice(0, 2).map((et) => (
                        <span key={et} className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                          {et}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{timeAgo(c.created_at)}</td>
                  <td className="px-4 py-3 relative" ref={menuAbierto === c.id ? menuRef : null}>
                    <button
                      onClick={() => setMenuAbierto(menuAbierto === c.id ? null : c.id)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                    >
                      <MoreHorizontal size={16} className="text-slate-400" />
                    </button>
                    {menuAbierto === c.id && (
                      <div className="fixed right-8 mt-8 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-[100]">
                        <button
                          onClick={() => { setModalEditar(c); setMenuAbierto(null); }}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <Pencil size={14} /> Editar contacto
                        </button>
                        <button
                          onClick={() => verConversaciones(c.telefono)}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <MessageSquare size={14} /> Ver conversaciones
                        </button>
                        <hr className="my-1 border-slate-200 dark:border-slate-700" />
                        <button
                          onClick={() => { setModalEliminar(c); setMenuAbierto(null); }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Eliminar contacto
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-slate-500">
          Mostrando {filtrados.length} de {contactos.length} contactos
        </div>
      </div>

      {(modalEditar || modalNuevo) && (
        <ModalContacto
          contacto={modalEditar || undefined}
          onClose={() => { setModalEditar(null); setModalNuevo(false); }}
          onSave={(c) => guardarContacto(c, modalNuevo)}
          guardando={guardando}
        />
      )}

      {modalEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Eliminar contacto</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              ¿Estás seguro de que querés eliminar a <strong>{modalEliminar.nombre || modalEliminar.telefono}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalEliminar(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminarContacto(modalEliminar.id)}
                disabled={guardando}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {guardando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalContacto({
  contacto,
  onClose,
  onSave,
  guardando
}: {
  contacto?: Contacto;
  onClose: () => void;
  onSave: (c: Partial<Contacto>) => void;
  guardando: boolean;
}) {
  const [form, setForm] = useState({
    id: contacto?.id || '',
    nombre: contacto?.nombre || '',
    telefono: contacto?.telefono || '',
    email: contacto?.email || '',
    resultado: contacto?.resultado || '',
    notas: contacto?.notas || '',
  });

  const esNuevo = !contacto;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg mx-4 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {esNuevo ? 'Nuevo Contacto' : 'Editar Contacto'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre del contacto"
                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Teléfono {esNuevo && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="+54 9 11 1234-5678"
                disabled={!esNuevo}
                className={cn(
                  "w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-800 dark:text-white",
                  !esNuevo && "opacity-60 cursor-not-allowed"
                )}
              />
            </div>
            {!esNuevo && <p className="text-xs text-slate-500 mt-1">El teléfono no se puede modificar</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@ejemplo.com"
                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Resultado</label>
            <div className="relative">
              <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={form.resultado}
                onChange={(e) => setForm({ ...form, resultado: e.target.value })}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-800 dark:text-white appearance-none"
              >
                {RESULTADOS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Notas adicionales sobre el contacto..."
              rows={3}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-800 dark:text-white resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={guardando}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : (esNuevo ? 'Crear Contacto' : 'Guardar Cambios')}
          </button>
        </div>
      </div>
    </div>
  );
}
