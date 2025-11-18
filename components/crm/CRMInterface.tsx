'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import InboxSidebar from './InboxSidebar';
import ConversationList from './ConversationList';
import ChatPanel from './ChatPanel';
import ContactInfo from './ContactInfo';
import { Conversation, InboxType } from '@/lib/types/crm';
import { createClient } from '@/lib/supabase/client';

interface CRMInterfaceProps {
  user: User | null;
}

// Mapeo de áreas a inboxes
const areaToInboxMap: Record<string, InboxType> = {
  'Ventas': 'Ventas',
  'Alumnos': 'Alumnos',
  'Administración': 'Administración',
  'Comunidad': 'Comunidad',
  'PSI Principal': 'PSI Principal',
};

export default function CRMInterface({ user }: CRMInterfaceProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedInbox, setSelectedInbox] = useState<InboxType>('PSI Principal');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inboxStats, setInboxStats] = useState<Record<string, number>>({});

  const supabase = createClient();

  // Cargar conversaciones y estadísticas
  useEffect(() => {
    loadConversations();
    loadInboxStats();
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversaciones',
        },
        () => {
          loadConversations();
          loadInboxStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedInbox]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Construir query base
      let query = supabase
        .from('conversaciones')
        .select(`
          *,
          contactos (
            id,
            telefono,
            nombre
          )
        `);

      // Filtrar por área/inbox
      if (selectedInbox === 'PSI Principal') {
        // PSI Principal combina mensajes del router principal
        query = query.or('area.eq.PSI Principal,inbox_id.eq.PSI Principal');
      } else {
        query = query.eq('area', selectedInbox);
      }

      // Ordenar por último mensaje
      query = query.order('ts_ultimo_mensaje', { ascending: false, nullsFirst: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error loading conversations:', error);
        throw error;
      }

      // Transformar datos para la UI
      const transformedConversations: Conversation[] = (data || []).map((conv: any) => ({
        ...conv,
        contactos: conv.contactos ? {
          ...conv.contactos,
          phone: conv.contactos.telefono,
          name: conv.contactos.nombre,
        } : null,
        last_message_at: conv.ts_ultimo_mensaje,
        unread_count: 0, // TODO: Calcular desde mensajes no leídos
      }));

      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInboxStats = async () => {
    try {
      const areas = ['Ventas', 'Alumnos', 'Administración', 'Comunidad', 'PSI Principal'];
      const stats: Record<string, number> = {};

      for (const area of areas) {
        let query = supabase
          .from('conversaciones')
          .select('id', { count: 'exact', head: true });

        if (area === 'PSI Principal') {
          query = query.or('area.eq.PSI Principal,inbox_id.eq.PSI Principal');
        } else {
          query = query.eq('area', area);
        }

        const { count, error } = await query;
        if (!error) {
          stats[area] = count || 0;
        }
      }

      setInboxStats(stats);
    } catch (error) {
      console.error('Error loading inbox stats:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden fixed inset-0">
      {/* Sidebar de Inboxes - 250px (colapsable) */}
      <InboxSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        selectedInbox={selectedInbox}
        onSelectInbox={setSelectedInbox}
        user={user}
        inboxStats={inboxStats}
      />

      {/* Lista de Conversaciones - 300px con scroll exclusivo */}
      <ConversationList
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        selectedInbox={selectedInbox}
        loading={loading}
        user={user}
      />

      {/* Panel de Chat - flex-1 */}
      <ChatPanel
        conversation={selectedConversation}
        user={user}
        onUpdateConversation={loadConversations}
      />

      {/* Panel de Información de Contacto - 250px */}
      <ContactInfo
        contact={selectedConversation?.contactos}
        conversation={selectedConversation}
      />
    </div>
  );
}
