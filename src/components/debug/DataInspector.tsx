// src/components/debug/DataInspector.tsx - Inspector temporal de datos
'use client'

import { useState } from 'react'
import type { Conversation } from '@/lib/supabase'

interface DataInspectorProps {
  conversations: Conversation[]
  selectedConversation: Conversation | null
}

export default function DataInspector({ conversations, selectedConversation }: DataInspectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-bold"
      >
        DEBUG
      </button>
      
      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-black text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto text-xs">
          <div className="mb-4">
            <h3 className="font-bold text-yellow-400">CONVERSACIONES ({conversations.length})</h3>
            {conversations.length > 0 ? (
              <div>
                <p className="text-green-400">✅ Datos recibidos correctamente</p>
                <div className="mt-2">
                  <h4 className="font-bold text-blue-400">Primera conversación:</h4>
                  <pre className="bg-gray-800 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(conversations[0], null, 2)}
                  </pre>
                </div>
                <div className="mt-2">
                  <h4 className="font-bold text-blue-400">Campos disponibles:</h4>
                  <p className="text-gray-300">
                    {Object.keys(conversations[0]).join(', ')}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-red-400">❌ No hay conversaciones</p>
            )}
          </div>
          
          {selectedConversation && (
            <div>
              <h3 className="font-bold text-yellow-400">CONVERSACIÓN SELECCIONADA</h3>
              <pre className="bg-gray-800 p-2 rounded mt-1 overflow-auto">
                {JSON.stringify(selectedConversation, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}



