'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import InboxSidebar from './InboxSidebar';
import ConversationList from './ConversationList';
import ChatPanel from './ChatPanel';
import ContactInfo from './ContactInfo';
import FunctionPanel from './FunctionPanel';
import { Conversation, InboxType } from '@/lib/types/crm';
import { createClient } from '@/lib/supabase/client';
import { getAreaFromInbox } from '@/lib/crm/inboxMap';

interface CRMInterfaceProps {
  user: User | null;
}

// Tipo exportado desde InboxSidebar
import type { CRMFunction } from './InboxSidebar';

export default function CRMInterface({ user }: CRMInterfaceProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedInbox, setSelectedInbox] = useState<InboxType>('PSI Principal');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inboxStats, setInboxStats] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(true);
  const [selectedFunction, setSelectedFunction] = useState<CRMFunction>(null);

  const supabase = createClient();

  // Cargar conversaciones y estadísticas
  useEffect(() => {
    try {
      // Validar que Supabase esté configurado
      if (!supabase) {
        setError('Error: Cliente de Supabase no inicializado. Verifica las variables de entorno.');
        return;
      }

      // Debug: Verificar configuración (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Configuración Supabase:', {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurado' : '❌ Faltante',
          key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Faltante',
        });
      }

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
            console.log('✅ Suscrito a cambios en tiempo real');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error en suscripción a tiempo real');
            setError('Error de conexión en tiempo real');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error: any) {
      console.error('❌ Error en useEffect:', error);
      setError(`Error al inicializar: ${error?.message || 'Error desconocido'}`);
    }
  }, [selectedInbox, supabase]);

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

      // Filtrar por área/inbox - Mapear el inbox de la UI al valor real en Supabase
      // El Router PSI guarda áreas en minúsculas: 'administracion', 'alumnos', 'comunidad', 'ventas1'
      const areaValue = getAreaFromInbox(selectedInbox);
      query = query.eq('area', areaValue);
      
      // Debug: Log del filtro aplicado
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Filtro aplicado: inbox="${selectedInbox}" -> area="${areaValue}"`);
      }

      // Ordenar por último mensaje
      query = query.order('ts_ultimo_mensaje', { ascending: false, nullsFirst: false });

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('❌ Error loading conversations:', queryError);
        console.error('❌ Error details:', JSON.stringify(queryError, null, 2));
        
        // Mensaje de error más descriptivo
        let errorMessage = `Error al cargar conversaciones: ${queryError.message}`;
        
        // Detectar errores comunes
        if (queryError.code === 'PGRST301' || queryError.message.includes('JWT')) {
          errorMessage = '❌ Error de autenticación con Supabase. Verifica NEXT_PUBLIC_SUPABASE_ANON_KEY';
        } else if (queryError.message.includes('permission denied') || queryError.message.includes('RLS')) {
          errorMessage = '❌ Error de permisos (RLS). Verifica las políticas de Row Level Security en Supabase';
        } else if (queryError.message.includes('network') || queryError.message.includes('fetch')) {
          errorMessage = '❌ Error de conexión con Supabase. Verifica NEXT_PUBLIC_SUPABASE_URL';
        }
        
        setError(errorMessage);
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
      // Todas las bandejas activas
      const inboxes: InboxType[] = ['PSI Principal', 'Ventas', 'Alumnos', 'Administración', 'Comunidad'];
      const stats: Record<string, number> = {};

      for (const inbox of inboxes) {
        let query = supabase
          .from('conversaciones')
          .select('id', { count: 'exact', head: true });

        // Mapear el inbox de la UI al valor real en Supabase
        const areaValue = getAreaFromInbox(inbox);
        query = query.eq('area', areaValue);

        const { count, error } = await query;
        if (!error) {
          stats[inbox] = count || 0;
        } else {
          console.warn(`❌ Error cargando estadísticas para ${inbox} (área: ${areaValue}):`, error);
          stats[inbox] = 0;
        }
      }

      setInboxStats(stats);
      console.log('✅ Estadísticas de bandejas cargadas:', stats);
    } catch (error) {
      console.error('❌ Error loading inbox stats:', error);
    }
  };

  const handleConversationCreated = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    loadConversations();
    loadInboxStats();
  };

  const handleChangeInbox = (inbox: InboxType) => {
    setSelectedInbox(inbox);
    setSelectedFunction(null);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar de Inboxes - 250px (colapsable) */}
      <InboxSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        selectedInbox={selectedInbox}
        onSelectInbox={handleChangeInbox}
        user={user}
        inboxStats={inboxStats}
        selectedFunction={selectedFunction}
        onSelectFunction={setSelectedFunction}
      />

      {/* Lista de Conversaciones - 300px con scroll exclusivo */}
      <ConversationList
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        selectedInbox={selectedInbox}
        loading={loading}
        user={user}
        onChangeInbox={handleChangeInbox}
        onConversationCreated={handleConversationCreated}
      />

      {/* Panel de Chat o Función - flex-1 */}
      <div className="flex-1 flex flex-col relative h-screen" style={{ minHeight: 0 }}>
        {error && (
          <div className="bg-primary-50 border-l-4 border-primary text-gray-800 p-4 m-4 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
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
        {selectedFunction ? (
          <FunctionPanel 
            functionId={selectedFunction} 
            user={user}
            onClose={() => setSelectedFunction(null)}
          />
        ) : (
        <ChatPanel
          conversation={selectedConversation}
          user={user}
          onUpdateConversation={loadConversations}
            onToggleContactInfo={() => setIsContactInfoOpen(!isContactInfoOpen)}
            isContactInfoOpen={isContactInfoOpen}
        />
        )}
      </div>

      {/* Panel de Información de Contacto - 250px */}
      {isContactInfoOpen ? (
      <ContactInfo
        contact={selectedConversation?.contactos}
        conversation={selectedConversation}
          onClose={() => setIsContactInfoOpen(false)}
        />
      ) : (
        <div className="w-12 bg-white border-l border-gray-200 flex flex-col items-center pt-4">
          <button
            onClick={() => setIsContactInfoOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-600 transition-all duration-150"
            title="Mostrar información de contacto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
