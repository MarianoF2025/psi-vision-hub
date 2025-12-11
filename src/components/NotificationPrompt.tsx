/**
 * NotificationPrompt.tsx
 * Componente para solicitar permisos de notificación
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useNotificationContext } from '@/providers/NotificationProvider';

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

interface NotificationPromptProps {
  variant?: 'banner' | 'modal' | 'inline';
  onAccept?: () => void;
  onDismiss?: () => void;
  forceShow?: boolean;
}

export function NotificationPrompt({
  variant = 'banner',
  onAccept,
  onDismiss,
  forceShow = false
}: NotificationPromptProps) {
  const { permissionStatus, isSupported, requestPermission } = useNotificationContext();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isSupported) {
      setIsVisible(false);
      return;
    }

    if (permissionStatus === 'granted' || permissionStatus === 'denied') {
      setIsVisible(false);
      return;
    }

    if (dismissed && !forceShow) {
      setIsVisible(false);
      return;
    }

    const lastPrompt = localStorage.getItem('notificationPromptDismissed');
    if (lastPrompt && !forceShow) {
      const lastDate = new Date(lastPrompt);
      const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        setIsVisible(false);
        return;
      }
    }

    setIsVisible(true);
  }, [isSupported, permissionStatus, dismissed, forceShow]);

  const handleAccept = async () => {
    setIsLoading(true);
    const granted = await requestPermission();
    setIsLoading(false);
    
    if (granted) {
      setIsVisible(false);
      onAccept?.();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setIsVisible(false);
    localStorage.setItem('notificationPromptDismissed', new Date().toISOString());
    onDismiss?.();
  };

  if (!isVisible) return null;

  // BANNER
  if (variant === 'banner') {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg animate-slideDown">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <BellIcon />
            </div>
            <div>
              <p className="font-medium">Activar notificaciones</p>
              <p className="text-sm text-white/80">
                Recibí alertas cuando lleguen nuevos mensajes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Activando...' : 'Activar'}
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <XIcon />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // INLINE
  if (variant === 'inline') {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full">
            <BellIcon />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Notificaciones de escritorio
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Recibí alertas cuando lleguen nuevos mensajes de WhatsApp.
            </p>
            <div className="flex items-center gap-2 mt-3">
              {permissionStatus === 'granted' ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckIcon />
                  <span className="text-sm font-medium">Activadas</span>
                </div>
              ) : permissionStatus === 'denied' ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Bloqueadas. Habilitá en configuración del navegador.
                </p>
              ) : (
                <button
                  onClick={handleAccept}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Activando...' : 'Activar notificaciones'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MODAL
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md mx-4 overflow-hidden animate-scaleIn">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-center text-white">
          <div className="inline-flex p-4 bg-white/20 rounded-full mb-4">
            <BellIcon />
          </div>
          <h2 className="text-xl font-bold">¿Activar notificaciones?</h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-gray-600 dark:text-gray-300 text-center">
            Recibí alertas instantáneas cuando lleguen nuevos mensajes de WhatsApp.
          </p>

          <ul className="mt-4 space-y-2">
            {[
              'Notificaciones estilo WhatsApp',
              'Sonido de alerta',
              'Badge en la pestaña',
              'Click para ir al chat'
            ].map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-green-500">✓</span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Ahora no
          </button>
          <button
            onClick={handleAccept}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Activando...' : 'Activar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationStatus() {
  const { permissionStatus, unreadCount, isSupported, requestPermission } = useNotificationContext();

  if (!isSupported) return null;

  const statusConfig = {
    granted: { icon: '🔔', text: 'Activas', color: 'text-green-600 dark:text-green-400' },
    denied: { icon: '🔕', text: 'Bloqueadas', color: 'text-red-600 dark:text-red-400' },
    default: { icon: '🔔', text: 'Desactivadas', color: 'text-gray-500' }
  };

  const status = statusConfig[permissionStatus as keyof typeof statusConfig] || statusConfig.default;

  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span>{status.icon}</span>
        <span className={status.color}>{status.text}</span>
        {unreadCount > 0 && (
          <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount}
          </span>
        )}
      </div>
      {permissionStatus === 'default' && (
        <button onClick={requestPermission} className="text-xs text-blue-600 hover:underline">
          Activar
        </button>
      )}
    </div>
  );
}

export default NotificationPrompt;
