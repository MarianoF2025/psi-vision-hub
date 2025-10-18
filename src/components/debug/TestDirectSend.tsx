// src/components/debug/TestDirectSend.tsx - Componente para probar envío directo
'use client'

import { useState } from 'react'
import { useDirectWebhook } from '@/hooks'

export default function TestDirectSend() {
  const [result, setResult] = useState<any>(null)
  const { sendDirectToWebhook, loading, error } = useDirectWebhook()

  const testDirectSend = async () => {
    setResult(null)
    
    try {
      console.log('🚀 Probando envío directo al webhook...')
      
      const success = await sendDirectToWebhook({
        conversationId: "1", // ID de prueba
        message: "Mensaje de prueba directo al webhook",
        attachments: [],
        messageType: "text"
      })
      
      setResult({
        success,
        message: success ? 'Mensaje enviado exitosamente' : 'Error en envío',
        error: error
      })
      
    } catch (err) {
      console.error('🚀 Error en test directo:', err)
      setResult({
        success: false,
        message: 'Error en test',
        error: err instanceof Error ? err.message : 'Error desconocido'
      })
    }
  }

  return (
    <div className="fixed top-4 left-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-md">
      <h3 className="font-semibold mb-2">🚀 Test Envío Directo</h3>
      
      <button
        onClick={testDirectSend}
        disabled={loading}
        className="bg-purple-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Enviar Directo'}
      </button>
      
      {result && (
        <div className="mt-3 text-xs">
          <div className={`font-semibold ${result.success ? 'text-green-600' : 'text-red-600'}`}>
            {result.success ? '✅ Éxito' : '❌ Error'}
          </div>
          
          <div className="mt-1">
            <strong>Mensaje:</strong> {result.message}
          </div>
          
          {result.error && (
            <div className="mt-1">
              <strong>Error:</strong>
              <pre className="bg-red-100 p-1 rounded text-xs overflow-auto">
                {result.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}



