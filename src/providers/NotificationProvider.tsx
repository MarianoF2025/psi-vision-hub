/**
 * NotificationProvider.tsx
 * Context provider que integra notificaciones con Supabase Realtime
 */

'use client';

import React, { createContext, useContext, useEffect, useCallback, ReactNode, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNotifications } from '@/hooks/useNotifications';

interface Message {
  id: string;
  conversacion_id: string;
  mensaje: string;
  direccion: 'entrante' | 'saliente';
  tipo: string;
  remitente_nombre?: string;
  timestamp?: string;
  created_at?: string;
}

interface NotificationContextValue {
  permissionStatus: NotificationPermission | 'unsupported';
  unreadCount: number;
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  clearUnread: () => void;
  markConversationAsRead: (conversationId: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
  currentUserId?: string;
  activeInboxes?: string[];
  activeConversationId?: string | null;
  enableSound?: boolean;
}

export function NotificationProvider({
  children,
  activeInboxes = ['psi_principal', 'ventas', 'alumnos', 'administracion', 'comunidad'],
  activeConversationId = null,
}: NotificationProviderProps) {
  const {
    permissionStatus,
    unreadCount,
    isSupported,
    requestPermission,
    showNotification,
    setUnreadCount,
    incrementUnread,
    clearUnread,
    playSound
  } = useNotifications();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopEnabled, setDesktopEnabled] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSound = localStorage.getItem('psi_notification_sound');
      const savedDesktop = localStorage.getItem('psi_notification_desktop');
      if (savedSound !== null) setSoundEnabled(savedSound === 'true');
      if (savedDesktop !== null) setDesktopEnabled(savedDesktop === 'true');
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const savedSound = localStorage.getItem('psi_notification_sound');
      const savedDesktop = localStorage.getItem('psi_notification_desktop');
      if (savedSound !== null) setSoundEnabled(savedSound === 'true');
      if (savedDesktop !== null) setDesktopEnabled(savedDesktop === 'true');
    };

    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(() => {
      const savedSound = localStorage.getItem('psi_notification_sound');
      const savedDesktop = localStorage.getItem('psi_notification_desktop');
      setSoundEnabled(savedSound !== 'false');
      setDesktopEnabled(savedDesktop !== 'false');
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const channelRef = useRef<RealtimeChannel | null>(null);

  const getContactInfo = useCallback(async (conversacionId: string): Promise<{ nombre: string; telefono: string } | null> => {
    try {
      const { data, error } = await supabase
        .from('conversaciones')
        .select(`
          contacto_id,
          contactos:contacto_id (
            nombre,
            telefono
          )
        `)
        .eq('id', conversacionId)
        .single();

      if (error || !data) return null;

      const contacto = data.contactos as { nombre?: string; telefono?: string } | null;
      return {
        nombre: contacto?.nombre || 'Nuevo mensaje',
        telefono: contacto?.telefono || ''
      };
    } catch {
      return null;
    }
  }, []);

  const handleNewMessage = useCallback(async (payload: { new: Message }) => {
    const message = payload.new;

    if (message.direccion !== 'entrante') return;
    if (activeConversationId && message.conversacion_id === activeConversationId) return;

    const contactInfo = await getContactInfo(message.conversacion_id);
    const contactName = contactInfo?.nombre || 'Nuevo mensaje';

    incrementUnread();

    if (soundEnabled) {
      playSound();
    }

    if (desktopEnabled && permissionStatus === 'granted') {
      let body = message.mensaje || '';
      if (body.length > 100) {
        body = body.substring(0, 97) + '...';
      }

      if (message.tipo !== 'text' && message.tipo !== 'texto') {
        const typeLabels: Record<string, string> = {
          image: '📷 Imagen',
          video: '🎥 Video',
          audio: '🎵 Audio',
          document: '📄 Documento',
          sticker: '🏷️ Sticker',
          location: '📍 Ubicación'
        };
        body = typeLabels[message.tipo] || body;
      }

      showNotification({
        title: contactName,
        body: body,
        tag: `msg-${message.conversacion_id}`,
        data: {
          conversacionId: message.conversacion_id,
          messageId: message.id
        },
        onClick: () => {
          window.focus();
          window.dispatchEvent(new CustomEvent('notification-click', {
            detail: {
              conversacionId: message.conversacion_id,
              messageId: message.id
            }
          }));
        }
      });
    }
  }, [
    activeConversationId,
    getContactInfo,
    incrementUnread,
    soundEnabled,
    desktopEnabled,
    playSound,
    permissionStatus,
    showNotification
  ]);

  useEffect(() => {
    channelRef.current = supabase
      .channel('crm-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes'
        },
        handleNewMessage
      )
      .subscribe((status) => {
        console.log('📡 Realtime notifications:', status);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [handleNewMessage]);

  useEffect(() => {
    const loadInitialUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('conversaciones')
          .select('*', { count: 'exact', head: true })
          .gt('mensajes_no_leidos', 0)
          .in('area', activeInboxes);

        if (!error && count !== null) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.error('Error loading initial unread count:', err);
      }
    };

    loadInitialUnreadCount();
  }, [activeInboxes, setUnreadCount]);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    try {
      await supabase.rpc('marcar_como_leidos', { conv_id: conversationId });

      const { count } = await supabase
        .from('conversaciones')
        .select('*', { count: 'exact', head: true })
        .gt('mensajes_no_leidos', 0)
        .in('area', activeInboxes);

      if (count !== null) {
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Error marking conversation as read:', err);
    }
  }, [activeInboxes, setUnreadCount]);

  const value: NotificationContextValue = {
    permissionStatus,
    unreadCount,
    isSupported,
    requestPermission,
    clearUnread,
    markConversationAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationProvider;
