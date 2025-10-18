// src/components/debug/DiagnosticPanel.tsx - Panel de diagnóstico completo
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DiagnosticPanel() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostic = async () => {
    setLoading(true)
    setResults(null)
    
    const diagnostic = {
      timestamp: new Date().toISOString(),
      tests: []
    }
    
    try {
      // Test 1: Verificar conexión a Supabase usando la vista correcta
      console.log('🔍 Test 1: Verificando conexión a Supabase...')
      const { data: testData, error: testError } = await supabase
        .from('vw_conversaciones_activas_inbox')
        .select('*')
        .limit(1)
      
      diagnostic.tests.push({
        name: 'Conexión Supabase (vista)',
        success: !testError,
        data: testData ? `Columnas: ${Object.keys(testData[0] || {}).join(', ')}` : 'Sin datos',
        error: testError?.message || null
      })
      
      // Test 2: Verificar si hay conversaciones y mostrar estructura
      console.log('🔍 Test 2: Verificando conversaciones...')
      const { data: conversations, error: convError } = await supabase
        .from('vw_conversaciones_activas_inbox')
        .select('*')
        .limit(3)
      
      diagnostic.tests.push({
        name: 'Conversaciones disponibles',
        success: !convError,
        data: conversations?.length ? `${conversations.length} conversaciones. Ejemplo: ${JSON.stringify(conversations[0], null, 2)}` : 'Sin conversaciones',
        error: convError?.message || null
      })
      
      // Test 3: Verificar mensajes
      console.log('🔍 Test 3: Verificando mensajes...')
      const { data: messages, error: msgError } = await supabase
        .from('vw_mensajes_conversacion')
        .select('*')
        .limit(5)
      
      diagnostic.tests.push({
        name: 'Mensajes disponibles',
        success: !msgError,
        data: messages?.length || 0,
        error: msgError?.message || null
      })
      
      // Test 4: Probar webhook
      console.log('🔍 Test 4: Probando webhook...')
      try {
        const webhookResponse = await fetch('https://n8n.psivisionhub.com/webhook/crm/enviar-mensaje', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: '1',
            message: 'Test de diagnóstico',
            attachments: [],
            message_type: 'text'
          })
        })
        
        diagnostic.tests.push({
          name: 'Webhook n8n',
          success: webhookResponse.ok,
          data: `Status: ${webhookResponse.status}`,
          error: webhookResponse.ok ? null : `HTTP ${webhookResponse.status}`
        })
      } catch (webhookError) {
        diagnostic.tests.push({
          name: 'Webhook n8n',
          success: false,
          data: null,
          error: webhookError instanceof Error ? webhookError.message : 'Error desconocido'
        })
      }
      
      // Test 5: Verificar configuración
      diagnostic.tests.push({
        name: 'Configuración',
        success: true,
        data: {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.psivisionhub.com',
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          nodeEnv: process.env.NODE_ENV
        },
        error: null
      })
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error)
      diagnostic.tests.push({
        name: 'Error general',
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
    
    setResults(diagnostic)
    setLoading(false)
  }

  return (
    <div className="fixed top-4 left-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-lg">
      <h3 className="font-semibold mb-2">🔍 Diagnóstico del Sistema</h3>
      
      <button
        onClick={runDiagnostic}
        disabled={loading}
        className="bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50 mb-3"
      >
        {loading ? 'Diagnosticando...' : 'Ejecutar Diagnóstico'}
      </button>
      
      {results && (
        <div className="text-xs space-y-2">
          <div className="font-semibold">Resultados del diagnóstico:</div>
          
          {results.tests.map((test: any, index: number) => (
            <div key={index} className={`p-2 rounded ${test.success ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="font-medium">
                {test.success ? '✅' : '❌'} {test.name}
              </div>
              {test.data && (
                <div className="text-gray-600 mt-1">
                  <strong>Datos:</strong> {typeof test.data === 'object' ? JSON.stringify(test.data) : test.data}
                </div>
              )}
              {test.error && (
                <div className="text-red-600 mt-1">
                  <strong>Error:</strong> {test.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
