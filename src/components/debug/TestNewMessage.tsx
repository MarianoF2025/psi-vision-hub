// src/components/debug/TestNewMessage.tsx - Botón de prueba para simular mensaje nuevo
'use client'

import { useState } from 'react'

interface TestNewMessageProps {
  onSimulateNewMessage: () => void
}

export default function TestNewMessage({ onSimulateNewMessage }: TestNewMessageProps) {
  const [isVisible, setIsVisible] = useState(false)

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-bold"
      >
        TEST
      </button>
      
      {isVisible && (
        <div className="absolute top-12 right-0 bg-black text-white p-4 rounded-lg">
          <h3 className="font-bold text-yellow-400 mb-2">Simular Mensaje Nuevo</h3>
          <p className="text-sm text-gray-300 mb-3">
            Esto simulará que llega un mensaje nuevo y la conversación se moverá al tope.
          </p>
          <button
            onClick={() => {
              onSimulateNewMessage()
              setIsVisible(false)
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm"
          >
            Simular Mensaje
          </button>
        </div>
      )}
    </div>
  )
}



