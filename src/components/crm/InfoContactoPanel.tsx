'use client';

import { useState } from 'react';
import { useCRMStore } from '@/stores/crm-store';
import { supabase } from '@/lib/supabase';
import { cn, getInitials, getWindowTimeLeft, formatPhone } from '@/lib/utils';
import { X, Clock, Plus, Unlink } from 'lucide-react';

const ESTADOS_CONV = ['nueva', 'activa', 'esperando', 'resuelta', 'cerrada'] as const;
const RESULTADOS = ['INS', 'NOINT', 'NOCONT', 'NR+'] as const;

export default function InfoContactoPanel() {
  const { conversacionActual, setConversacionActual, setPanelInfoAbierto } = useCRMStore();
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (!conversacionActual) return null;

  const windowTime = getWindowTimeLeft(conversacionActual.ventana_24h_fin, conversacionActual.ventana_72h_fin);

  const actualizarConversacion = async (campo: string, valor: string) => {
    await supabase.from('conversaciones').update({ [campo]: valor }).eq('id', conversacionActual.id);
    setConversacionActual({ ...conversacionActual, [campo]: valor });
  };

  const guardarNota = async () => {
    if (!nota.trim()) return;
    setGuardando(true);
    await supabase.from('notas_internas').insert({ conversacion_id: conversacionActual.id, contenido: nota });
    setNota('');
    setGuardando(false);
  };

  const desconectar = async () => {
    if (confirm('¿Desconectar del Router?')) {
      await supabase.from('conversaciones').update({ desconectado_wsp4: true, inbox_fijo: conversacionActual.area }).eq('id', conversacionActual.id);
      setConversacionActual({ ...conversacionActual, desconectado_wsp4: true, inbox_fijo: conversacionActual.area });
    }
  };

  return (
    <div className="w-64 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-slate-800 dark:text-white">Info del Contacto</h3>
        <button onClick={() => setPanelInfoAbierto(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><X size={14} className="text-slate-400" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Avatar y nombre */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-lg font-medium mx-auto mb-2">
            {getInitials(conversacionActual.nombre || conversacionActual.telefono)}
          </div>
          <p className="font-semibold text-sm text-slate-800 dark:text-white">{conversacionActual.nombre || 'Sin nombre'}</p>
          <p className="text-xs text-slate-500">{formatPhone(conversacionActual.telefono)}</p>
        </div>

        {/* Estado Conversación */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Estado Conversación</p>
          <div className="flex flex-wrap gap-1">
            {ESTADOS_CONV.map((e) => (
              <button key={e} onClick={() => actualizarConversacion('estado', e)}
                className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors',
                  conversacionActual.estado === e ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                )}>{e}</button>
            ))}
          </div>
        </div>

        {/* Estado Lead */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Estado del Lead</p>
          <select value={conversacionActual.estado_lead || 'nuevo'} onChange={(e) => actualizarConversacion('estado_lead', e.target.value)}
            className="w-full px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded-md text-slate-800 dark:text-white">
            <option value="nuevo">Nuevo</option><option value="seguimiento">Seguimiento</option><option value="nr">NR</option><option value="silencioso">Silencioso</option><option value="pend_pago">Pend. pago</option><option value="alumna">Alumna</option>
          </select>
        </div>

        {/* Resultado */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Resultado</p>
          <div className="flex gap-1">
            {RESULTADOS.map((r) => (
              <button key={r} onClick={() => actualizarConversacion('resultado', r)}
                className={cn('flex-1 px-1 py-1 text-[10px] font-medium rounded-md border transition-colors',
                  conversacionActual.resultado === r ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                )}>{r}</button>
            ))}
          </div>
        </div>

        {/* Ventana */}
        {windowTime && (
          <div className={cn('p-2 rounded-lg border', windowTime.color.includes('emerald') ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10' : windowTime.color.includes('amber') ? 'border-amber-200 bg-amber-50 dark:bg-amber-500/10' : 'border-red-200 bg-red-50 dark:bg-red-500/10')}>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><Clock size={10} />{windowTime.tipo === '72H' ? 'VENTANA 72H META' : 'VENTANA 24H'}</div>
            <div className={cn('text-xl font-bold mt-0.5', windowTime.color)}>{windowTime.texto}</div>
            <p className="text-[9px] text-slate-500 mt-0.5">Mensajes gratuitos</p>
          </div>
        )}

        {/* Etiquetas */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Etiquetas</p>
            <button className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Plus size={12} className="text-slate-400" /></button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(conversacionActual.etiquetas || []).map((et) => (
              <span key={et} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] rounded">{et}</span>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Notas Internas</p>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Agregar nota..." rows={2}
            className="w-full px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded-md text-slate-800 dark:text-white resize-none" />
          <button onClick={guardarNota} disabled={guardando || !nota.trim()}
            className="w-full mt-1 py-1 bg-indigo-500 text-white text-[10px] font-medium rounded-md disabled:opacity-50">Guardar nota</button>
        </div>

        {/* Desconectar */}
        {!conversacionActual.desconectado_wsp4 && (
          <button onClick={desconectar} className="w-full py-1.5 border border-red-300 text-red-500 text-[10px] font-medium rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center gap-1">
            <Unlink size={12} /> Desconectar del Router
          </button>
        )}
      </div>
    </div>
  );
}
