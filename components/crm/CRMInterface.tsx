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
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Cargar conversaciones y estadísticas
  useEffect(() => {
    try {
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
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Suscrito a cambios en tiempo real');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error en suscripción a tiempo real');
            setError('Error de conexión en tiempo real');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error: any) {
      console.error('Error en useEffect:', error);
      setError(`Error al inicializar: ${error?.message || 'Error desconocido'}`);
    }
  }, [selectedInbox]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
        // PSI Principal: buscar por área exacta
        query = query.eq('area', 'PSI Principal');
      } else {
        query = query.eq('area', selectedInbox);
      }

      // Ordenar por último mensaje
      query = query.order('ts_ultimo_mensaje', { ascending: false, nullsFirst: false });

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('Error loading conversations:', queryError);
        console.error('Error details:', JSON.stringify(queryError, null, 2));
        setError(`Error al cargar conversaciones: ${queryError.message}`);
        setConversations([]);
        return;
      }

      console.log(`Cargadas ${data?.length || 0} conversaciones para inbox: ${selectedInbox}`);

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
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      setError(`Error inesperado: ${error?.message || 'Error desconocido'}`);
      setConversations([]);
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
          query = query.eq('area', 'PSI Principal');
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
      <div className="flex-1 flex flex-col relative">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 m-4 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    loadConversations();
                  }}
                  className="mt-2 text-sm underline"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}
        <ChatPanel
          conversation={selectedConversation}
          user={user}
          onUpdateConversation={loadConversations}
        />
      </div>

      {/* Panel de Información de Contacto - 250px */}
      <ContactInfo
        contact={selectedConversation?.contactos}
        conversation={selectedConversation}
      />
    </div>
  );
}
