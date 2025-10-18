'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupabaseDebug() {
  const [testResult, setTestResult] = useState<string>('Probando conexión...')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const testConnection = async () => {
      try {
        setIsLoading(true)
        
        // Test básico de conexión
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .limit(5)

        if (error) {
          setTestResult(`❌ Error: ${error.message}`)
        } else {
          const tableNames = data?.map(t => t.table_name).join(', ') || 'Ninguna'
          setTestResult(`✅ Conexión exitosa. Tablas: ${tableNames}`)
        }
      } catch (err) {
        setTestResult(`❌ Error de conexión: ${err instanceof Error ? err.message : 'Desconocido'}`)
      } finally {
        setIsLoading(false)
      }
    }

    testConnection()
  }, [])

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <div className="p-4 bg-blue-100 border border-blue-400 rounded">
      <h3 className="font-bold text-blue-800">🔧 Debug Info</h3>
      <div className="mt-2 text-sm space-y-1">
        <p><strong>URL:</strong> {url ? (url.includes('supabase.co') || url.includes(':8000') || url.includes('localhost') ? '✅ Configurada' : '⚠️ URL inválida') : '❌ No configurada'}</p>
        <p><strong>Key:</strong> {key ? (key.startsWith('eyJ') ? '✅ Configurada' : '⚠️ Key inválida') : '❌ No configurada'}</p>
        <p><strong>Test:</strong> {isLoading ? '🔄 Probando...' : testResult}</p>
        {url && <p className="text-xs text-gray-600">URL: {url.substring(0, 30)}...</p>}
      </div>
    </div>
  )
}
