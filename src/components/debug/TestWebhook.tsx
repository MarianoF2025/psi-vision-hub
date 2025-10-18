// src/components/debug/TestWebhook.tsx - Componente para probar webhook directamente
'use client'

import { useState } from 'react'

export default function TestWebhook() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testWebhook = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      console.log('🌐 Probando webhook n8n directamente...')
      
      const webhookData = {
        conversation_id: "1", // ID de prueba
        message: "Mensaje de prueba desde TestWebhook",
        attachments: [],
        message_type: "text",
        rpc_data: { test: true } // Datos simulados
      }
      
      console.log('🌐 Datos del webhook:', webhookData)
      
      const response = await fetch('https://n8n.psivisionhub.com/webhook/crm/enviar-mensaje', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      })
      
      console.log('🌐 Respuesta del webhook:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      const responseData = await response.text()
      console.log('🌐 Datos de respuesta:', responseData)
      
      setResult({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        error: !response.ok ? `HTTP ${response.status}: ${response.statusText}` : null
      })
      
    } catch (err) {
      console.error('🌐 Error en test webhook:', err)
      setResult({
        success: false,
        error: {
          message: err instanceof Error ? err.message : 'Error desconocido',
          stack: err instanceof Error ? err.stack : undefined
        }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-md">
      <h3 className="font-semibold mb-2">🌐 Test Webhook</h3>
      
      <button
        onClick={testWebhook}
        disabled={loading}
        className="bg-green-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
      >
        {loading ? 'Probando...' : 'Probar Webhook'}
      </button>
      
      {result && (
        <div className="mt-3 text-xs">
          <div className={`font-semibold ${result.success ? 'text-green-600' : 'text-red-600'}`}>
            {result.success ? '✅ Éxito' : '❌ Error'}
          </div>
          
          {result.status && (
            <div className="mt-1">
              <strong>Status:</strong> {result.status} {result.statusText}
            </div>
          )}
          
          {result.data && (
            <div className="mt-1">
              <strong>Data:</strong>
              <pre className="bg-gray-100 p-1 rounded text-xs overflow-auto max-h-20">
                {result.data}
              </pre>
            </div>
          )}
          
          {result.error && (
            <div className="mt-1">
              <strong>Error:</strong>
              <pre className="bg-red-100 p-1 rounded text-xs overflow-auto">
                {typeof result.error === 'string' ? result.error : JSON.stringify(result.error, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}



