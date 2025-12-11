'use client';

import { useEffect } from 'react';
import { useCRMStore } from '@/stores/crm-store';
import ConversacionesPanel from '@/components/crm/ConversacionesPanel';
import ChatPanel from '@/components/crm/ChatPanel';
import InfoContactoPanel from '@/components/crm/InfoContactoPanel';
import { NotificationPrompt } from '@/components/NotificationPrompt';

export default function CRMPage() {
  const { panelInfoAbierto, conversacionActual } = useCRMStore();

  // Escuchar clicks en notificaciones para navegar a la conversación
  useEffect(() => {
    const handleNotificationClick = (event: CustomEvent) => {
      const { conversacionId } = event.detail;
      if (conversacionId) {
        // TODO: Implementar navegación a la conversación
        console.log('Navegando a conversación:', conversacionId);
      }
    };

    window.addEventListener('notification-click', handleNotificationClick as EventListener);
    return () => {
      window.removeEventListener('notification-click', handleNotificationClick as EventListener);
    };
  }, []);

  return (
    <>
      {/* Banner de notificaciones - aparece solo si no tiene permisos */}
      <NotificationPrompt variant="banner" />
      
      <div className="flex w-full h-full overflow-hidden">
        <ConversacionesPanel />
        <ChatPanel />
        {panelInfoAbierto && conversacionActual && <InfoContactoPanel />}
      </div>
    </>
  );
}
