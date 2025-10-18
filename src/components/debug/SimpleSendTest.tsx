// src/components/debug/SimpleSendTest.tsx - Test simple de envío
'use client'

import { useState } from 'react'

export default function SimpleSendTest() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testSimpleSend = async () => {
    setLoading(true)
    setResult('')
    
    try {
      console.log('🧪 TEST SIMPLE: Iniciando envío...')
      
      // Test 1: Verificar que podemos hacer fetch
      console.log('🧪 TEST SIMPLE: Probando fetch básico...')
      const response = await fetch('https://n8n.psivisionhub.com/webhook/crm/enviar-mensaje', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: '7081', // ID de Juan González del diagnóstico
          message: 'Test simple desde CRM',
          attachments: [],
          message_type: 'text'
        })
      })
      
      console.log('🧪 TEST SIMPLE: Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      const responseText = await response.text()
      console.log('🧪 TEST SIMPLE: Contenido de respuesta:', responseText)
      
      if (response.ok) {
        setResult(`✅ ÉXITO: ${response.status} - ${responseText}`)
      } else {
        setResult(`❌ ERROR: ${response.status} - ${responseText}`)
      }
      
    } catch (error) {
      console.error('🧪 TEST SIMPLE: Error capturado:', error)
      setResult(`❌ EXCEPCIÓN: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed top-20 left-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-md">
      <h3 className="font-semibold mb-2">🧪 Test Simple de Envío</h3>
      
      <button
        onClick={testSimpleSend}
        disabled={loading}
        className="bg-green-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50 mb-3"
      >
        {loading ? 'Enviando...' : 'Enviar Test Simple'}
      </button>
      
      {result && (
        <div className="text-xs p-2 bg-gray-100 rounded">
          <strong>Resultado:</strong><br />
          {result}
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-2">
        Este test envía un mensaje directo al webhook sin pasar por el CRM.
      </div>
    </div>
  )
}



