'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Send, Image, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LINEAS_EVOLUTION, type LineaEvolution, type Conversacion } from '@/types/crm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conversacion: Conversacion;
  mensaje: string;
  archivoUrl?: string;
  archivoTipo?: 'image' | 'document';
  archivoNombre?: string;
  usuarioEmail: string;
  usuarioNombre: string;
  onSuccess: () => void;
}

export default function ModalProgramarMensaje({
  isOpen,
  onClose,
  conversacion,
  mensaje,
  archivoUrl,
  archivoTipo,
  archivoNombre,
  usuarioEmail,
  usuarioNombre,
  onSuccess
}: Props) {
  const [lineaSeleccionada, setLineaSeleccionada] = useState<LineaEvolution | null>(null);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('09:00');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar fecha con mañana
  useEffect(() => {
    if (isOpen) {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      setFecha(manana.toISOString().split('T')[0]);
      setLineaSeleccionada(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGuardar = async () => {
    if (!lineaSeleccionada) {
      setError('Selecciona una línea de envío');
      return;
    }
    if (!fecha || !hora) {
      setError('Selecciona fecha y hora');
      return;
    }
    if (!mensaje && !archivoUrl) {
      setError('El mensaje no puede estar vacío');
      return;
    }

    // Validar que la fecha sea futura
    const fechaProgramada = new Date(`${fecha}T${hora}:00`);
    if (fechaProgramada <= new Date()) {
      setError('La fecha debe ser en el futuro');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const linea = LINEAS_EVOLUTION.find(l => l.id === lineaSeleccionada);
      
      const response = await fetch('/api/mensajes-programados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversacion_id: conversacion.id,
          contacto_id: conversacion.contacto_id,
          telefono: conversacion.telefono,
          nombre_contacto: conversacion.nombre,
          mensaje: mensaje || null,
          media_url: archivoUrl || null,
          media_type: archivoTipo || null,
          media_filename: archivoNombre || null,
          linea_envio: lineaSeleccionada,
          instancia_evolution: linea?.instancia,
          programado_para: fechaProgramada.toISOString(),
          creado_por: usuarioEmail,
          creado_por_nombre: usuarioNombre,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al programar mensaje');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // Obtener fecha mínima (hoy)
  const hoy = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-500">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Clock size={18} />
            Programar mensaje
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-white/20 rounded-md transition-colors"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Destinatario */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Destinatario</p>
            <p className="font-medium text-slate-800 dark:text-white">
              {conversacion.nombre || conversacion.telefono}
            </p>
            <p className="text-sm text-slate-500">{conversacion.telefono}</p>
          </div>

          {/* Preview del mensaje */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Mensaje a enviar</p>
            {archivoUrl && (
              <div className="flex items-center gap-2 mb-2 text-sm text-slate-600 dark:text-slate-300">
                {archivoTipo === 'image' ? <Image size={16} /> : <FileText size={16} />}
                <span>{archivoNombre || 'Archivo adjunto'}</span>
              </div>
            )}
            {mensaje ? (
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                {mensaje.length > 200 ? mensaje.substring(0, 200) + '...' : mensaje}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">Solo archivo adjunto</p>
            )}
          </div>

          {/* Selección de línea */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Línea de envío (Evolution API)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LINEAS_EVOLUTION.map((linea) => (
                <button
                  key={linea.id}
                  onClick={() => setLineaSeleccionada(linea.id)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg border-2 flex items-center gap-2 transition-all text-left",
                    lineaSeleccionada === linea.id
                      ? `border-${linea.color}-500 bg-${linea.color}-50 dark:bg-${linea.color}-500/10`
                      : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                  )}
                  style={{
                    borderColor: lineaSeleccionada === linea.id ? 
                      (linea.color === 'amber' ? '#f59e0b' : 
                       linea.color === 'blue' ? '#3b82f6' : 
                       linea.color === 'emerald' ? '#10b981' : '#a855f7') : undefined,
                    backgroundColor: lineaSeleccionada === linea.id ?
                      (linea.color === 'amber' ? '#fffbeb' : 
                       linea.color === 'blue' ? '#eff6ff' : 
                       linea.color === 'emerald' ? '#ecfdf5' : '#faf5ff') : undefined
                  }}
                >
                  <span className="text-xl">{linea.icono}</span>
                  <div>
                    <p className={cn(
                      "font-medium text-sm",
                      lineaSeleccionada === linea.id 
                        ? "text-slate-800 dark:text-white" 
                        : "text-slate-600 dark:text-slate-300"
                    )}>
                      {linea.nombre}
                    </p>
                    <p className="text-[10px] text-slate-400">{linea.instancia}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <Calendar size={14} className="inline mr-1" />
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                min={hoy}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <Clock size={14} className="inline mr-1" />
                Hora
              </label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-2">
            💡 El mensaje se enviará automáticamente en la fecha y hora programada por la línea seleccionada.
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || !lineaSeleccionada}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors",
              lineaSeleccionada && !guardando
                ? "bg-indigo-500 text-white hover:bg-indigo-600"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
            )}
          >
            {guardando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Programando...
              </>
            ) : (
              <>
                <Send size={16} />
                Programar envío
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
