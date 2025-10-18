// src/hooks/index.ts - Exportaciones centralizadas de hooks

export { useConversations } from './useConversations'
export { useMessages } from './useMessages'
export { useMessageSender } from './useMessageSender'
export { useConversationUpdater } from './useConversationUpdater'
export { useEnviarMensaje } from './useEnviarMensaje'
export { useDirectWebhook } from './useDirectWebhook'
export { useRealtime, useRealtimeMessages, useRealtimeConversations } from './useRealtime'
export { useMockConversations, useMockMessages } from './useMockData'

// Re-exportar tipos de Supabase para conveniencia
export type { Conversation, Message, MessageAttachment, Inbox, Agent } from '../lib/supabase'
