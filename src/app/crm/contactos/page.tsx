'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn, formatPhone, getInitials, timeAgo } from '@/lib/utils';
import { Search, Plus, Filter, Download, MoreHorizontal, Phone, Mail, Tag } from 'lucide-react';

interface Contacto {
  id: string;
  telefono: string;
  nombre?: string;
  email?: string;
  pais?: string;
  created_at: string;
  estado_lead?: string;
  resultado?: string;
  etiquetas?: string[];
}

export default function ContactosPage() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('contactos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setContactos(data);
      setLoading(false);
    };
    cargar();
  }, []);

  const filtrados = contactos.filter(c => 
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda) ||
    c.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Contactos</h1>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700">
              <Download size={16} /> Exportar
            </button>
            <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-600">
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

      {/* Tabla */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Contacto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Estado</th>
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
                    {c.estado_lead && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                        {c.estado_lead}
                      </span>
                    )}
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
                  <td className="px-4 py-3">
                    <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                      <MoreHorizontal size={16} className="text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
