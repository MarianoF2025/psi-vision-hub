'use client';

import { useState } from 'react';
import { useCRMStore } from '@/stores/crm-store';
import { cn } from '@/lib/utils';
import { User, Bell, MessageSquare, Shield, Database, ChevronRight } from 'lucide-react';

const SECCIONES = [
  { id: 'perfil', nombre: 'Mi Perfil', icono: User, descripcion: 'Nombre, email y preferencias' },
  { id: 'notificaciones', nombre: 'Notificaciones', icono: Bell, descripcion: 'Sonidos y alertas' },
  { id: 'respuestas', nombre: 'Respuestas Rápidas', icono: MessageSquare, descripcion: 'Plantillas de mensajes' },
  { id: 'seguridad', nombre: 'Seguridad', icono: Shield, descripcion: 'Contraseña y accesos' },
  { id: 'datos', nombre: 'Datos y Exportación', icono: Database, descripcion: 'Backup y exportar' },
];

export default function AjustesPage() {
  const { darkMode, toggleDarkMode, usuario } = useCRMStore();
  const [seccionActiva, setSeccionActiva] = useState('perfil');

  return (
    <div className="flex-1 flex bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar de secciones */}
      <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Ajustes</h1>
        <nav className="space-y-1">
          {SECCIONES.map((seccion) => (
            <button
              key={seccion.id}
              onClick={() => setSeccionActiva(seccion.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left',
                seccionActiva === seccion.id
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <seccion.icono size={20} />
              <div className="flex-1">
                <p className="font-medium text-sm">{seccion.nombre}</p>
                <p className="text-xs opacity-70">{seccion.descripcion}</p>
              </div>
              <ChevronRight size={16} className="opacity-50" />
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      <div className="flex-1 p-8 overflow-y-auto">
        {seccionActiva === 'perfil' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Mi Perfil</h2>
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                  {usuario?.nombre?.[0] || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{usuario?.nombre || 'Usuario'}</p>
                  <p className="text-sm text-slate-500">{usuario?.email || 'Sin email'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    defaultValue={usuario?.nombre || ''}
                    className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    defaultValue={usuario?.email || ''}
                    className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Tema */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">Modo Oscuro</p>
                  <p className="text-sm text-slate-500">Cambiar apariencia del sistema</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative',
                    darkMode ? 'bg-indigo-500' : 'bg-slate-300'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform',
                    darkMode ? 'translate-x-6' : 'translate-x-0.5'
                  )} />
                </button>
              </div>
            </div>
          </div>
        )}

        {seccionActiva === 'notificaciones' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Notificaciones</h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              {['Sonido de nuevos mensajes', 'Notificaciones de escritorio', 'Alertas de leads META'].map((item) => (
                <div key={item} className="flex items-center justify-between py-2">
                  <span className="text-slate-700 dark:text-slate-300">{item}</span>
                  <button className="w-12 h-6 rounded-full bg-indigo-500 relative">
                    <div className="w-5 h-5 rounded-full bg-white shadow absolute top-0.5 translate-x-6" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {seccionActiva !== 'perfil' && seccionActiva !== 'notificaciones' && (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400">Sección en desarrollo</p>
          </div>
        )}
      </div>
    </div>
  );
}
