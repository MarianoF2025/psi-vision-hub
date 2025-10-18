// src/hooks/types.d.ts - Declaraciones de tipos para hooks

import type { Conversation, Message } from '../lib/supabase'

declare module './useConversations' {
  export interface UseConversationsReturn {
    conversations: Conversation[]
    loading: boolean
    error: string | null
    refetch: () => void
  }
}

declare module './useMessages' {
  export interface UseMessagesReturn {
    messages: Message[]
    loading: boolean
    error: string | null
    refetch: () => void
  }
}

declare module './useMessageSender' {
  export interface UseMessageSenderReturn {
    sendMessage: (conversationId: string, content: string) => Promise<void>
    sending: boolean
  }
}

declare module './useConversationUpdater' {
  export interface UseConversationUpdaterReturn {
    updateEstado: (conversationId: string, estado: string) => Promise<void>
    updateAssignee: (conversationId: string, assigneeId: number, assigneeName: string) => Promise<void>
    updating: boolean
  }
}




