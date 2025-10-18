// src/components/debug/TestRPC.tsx - Componente para probar RPC directamente
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestRPC() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      console.log('🧪 Probando conexión a Supabase...')
      
      // Test 1: Verificar conexión básica
      const { data: testData, error: testError } = await supabase
        .from('conversacion')
        .select('id')
        .limit(1)
      
      console.log('🧪 Test conexión básica:', { testData, testError })
      
      if (testError) {
        setResult({
          success: false,
          error: {
            message: `Error de conexión: ${testError.message}`,
            details: testError.details,
            hint: testError.hint,
            code: testError.code
          }
        })
        return
      }
      
      // Test 2: Verificar si existe la función RPC
      console.log('🧪 Probando RPC enviar_mensaje...')
      
      const params = {
        p_chatwoot_conversation_id: 1,
        p_mensaje: 'Mensaje de prueba',
        p_remitente: 'Agente',
        p_origen: 'CRM'
      }
      
      console.log('🧪 Parámetros RPC:', params)
      
      const { data, error } = await supabase.rpc('enviar_mensaje', params)
      
      console.log('🧪 Resultado RPC:', { data, error })
      
      setResult({
        success: !error,
        data: {
          connection: 'OK',
          rpc: data,
          rpcError: error ? {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          } : null
        }
      })
      
    } catch (err) {
      console.error('🧪 Error en test:', err)
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
    <div className="fixed bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-md">
      <h3 className="font-semibold mb-2">🧪 Test RPC</h3>
      
      <button
        onClick={testConnection}
        disabled={loading}
        className="bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
      >
        {loading ? 'Probando...' : 'Probar Conexión + RPC'}
      </button>
      
      {result && (
        <div className="mt-3 text-xs">
          <div className={`font-semibold ${result.success ? 'text-green-600' : 'text-red-600'}`}>
            {result.success ? '✅ Éxito' : '❌ Error'}
          </div>
          
          {result.data && (
            <div className="mt-1">
              <strong>Data:</strong>
              <pre className="bg-gray-100 p-1 rounded text-xs overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
          
          {result.error && (
            <div className="mt-1">
              <strong>Error:</strong>
              <pre className="bg-red-100 p-1 rounded text-xs overflow-auto">
                {JSON.stringify(result.error, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
