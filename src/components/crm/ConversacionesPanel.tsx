'use client';

import { useEffect, useState } from 'react';
import { useCRMStore } from '@/stores/crm-store';
import { supabase } from '@/lib/supabase';
import { INBOXES, type Conversacion } from '@/types/crm';
import { cn, timeAgo, getInitials, getWindowTimeLeft } from '@/lib/utils';
import { Search, Plus, Clock } from 'lucide-react';

export default function ConversacionesPanel() {
  const { 
    inboxActual, conversacionActual, setConversacionActual, 
    filtroConversaciones, setFiltroConversaciones,
    busquedaConversaciones, setBusquedaConversaciones,
    setContador, usuario
  } = useCRMStore();
  
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(true);
  const inboxConfig = INBOXES.find(i => i.id === inboxActual);

  useEffect(() => {
    const cargarConversaciones = async (inicial = false) => {
      if (inicial) setLoading(true); 
      
      let query = supabase.from('conversaciones').select('*').order('ts_ultimo_mensaje', { ascending: false });
      if (inboxActual !== 'wsp4') query = query.eq('area', inboxActual);
      if (filtroConversaciones === 'sin_asignar') query = query.is('agente_asignado_id', null);
      else if (filtroConversaciones === 'mias' && usuario?.id) query = query.eq('agente_asignado_id', usuario.id);
      if (busquedaConversaciones.trim()) query = query.or(`nombre.ilike.%${busquedaConversaciones}%,telefono.ilike.%${busquedaConversaciones}%`);
      const { data } = await query;
      if (data) {
        setConversaciones(data);
        setContador(inboxActual, data.filter(c => (c.mensajes_no_leidos || 0) > 0).length);
      }
      setLoading(false);
    };
    cargarConversaciones(true);
    const channel = supabase.channel(`conversaciones-${inboxActual}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversaciones' }, (p) => { console.log('Realtime conversaciones:', p); cargarConversaciones(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [inboxActual, filtroConversaciones, busquedaConversaciones, usuario?.id, setContador]);

  return (
    <div className="w-72 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0">
      {/* Header fijo */}
      <div className="flex-shrink-0 p-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm text-slate-800 dark:text-white">{inboxConfig?.nombre || 'Conversaciones'}</h2>
          <div className="flex gap-0.5">
            <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><Search size={14} /></button>
            <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><Plus size={14} /></button>
          </div>
        </div>
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Buscar..." value={busquedaConversaciones}
            onChange={(e) => setBusquedaConversaciones(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white placeholder-slate-400"
          />
        </div>
        <div className="flex gap-1">
          {(['todas', 'sin_asignar', 'mias'] as const).map((filtro) => (
            <button key={filtro} onClick={() => setFiltroConversaciones(filtro)}
              className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors',
                filtroConversaciones === filtro ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}>
              {filtro === 'todas' ? 'Todas' : filtro === 'sin_asignar' ? 'Sin asignar' : 'Mías'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista scrolleable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-3 text-center text-slate-400 text-xs">Cargando...</div>
        ) : conversaciones.length === 0 ? (
          <div className="p-3 text-center text-slate-400 text-xs">No hay conversaciones</div>
        ) : conversaciones.map((conv) => {
          const isSelected = conversacionActual?.id === conv.id;
          const windowInfo = getWindowTimeLeft(conv.ventana_24h_fin, conv.ventana_72h_fin);
          return (
            <div key={conv.id} onClick={() => setConversacionActual(conv)}
              className={cn('p-2 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors',
                isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )}>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
                  {getInitials(conv.nombre || conv.telefono)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-xs text-slate-800 dark:text-white truncate">{conv.nombre || conv.telefono}</span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(conv.ts_ultimo_mensaje)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {conv.es_lead_meta && <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[8px] font-medium rounded">META</span>}
                    {inboxActual === 'wsp4' && conv.area && conv.area !== 'wsp4' && (
                      <span className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[8px] font-medium rounded capitalize">{conv.area}</span>
                    )}
                    <span className={cn('px-1 py-0.5 text-[8px] font-medium rounded',
                      conv.estado === 'nueva' && 'bg-green-100 dark:bg-green-500/20 text-green-600',
                      conv.estado === 'activa' && 'bg-blue-100 dark:bg-blue-500/20 text-blue-600',
                      conv.estado === 'esperando' && 'bg-amber-100 dark:bg-amber-500/20 text-amber-600',
                      conv.estado === 'derivada' && 'bg-purple-100 dark:bg-purple-500/20 text-purple-600'
                    )}>{conv.estado}</span>
                    {windowInfo && <span className={cn('flex items-center gap-0.5 text-[8px]', windowInfo.color)}><Clock size={8} />{windowInfo.texto}</span>}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{conv.ultimo_mensaje || 'Sin mensajes'}</p>
                </div>
                {(conv.mensajes_no_leidos || 0) > 0 && (
                  <div className="flex-shrink-0 self-center">
                    <span className="min-w-[16px] h-4 px-1 bg-indigo-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">{conv.mensajes_no_leidos}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
