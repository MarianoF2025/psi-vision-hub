'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TableTest() {
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const testTables = async () => {
      const tables = [
        'vw_conversaciones_activas_inbox',
        'vw_mensajes_conversacion', 
        'messages',
        'conversations',
        'information_schema.tables'
      ]

      const testResults: Record<string, any> = {}

      for (const table of tables) {
        try {
          console.log(`Probando tabla: ${table}`)
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(3)

          testResults[table] = {
            success: !error,
            error: error?.message || null,
            dataCount: data?.length || 0,
            sampleData: data?.[0] || null
          }
        } catch (err) {
          testResults[table] = {
            success: false,
            error: err instanceof Error ? err.message : 'Error desconocido',
            dataCount: 0,
            sampleData: null
          }
        }
      }

      setResults(testResults)
      setLoading(false)
    }

    testTables()
  }, [])

  if (loading) {
    return (
      <div className="p-4 bg-gray-100 border border-gray-400 rounded">
        <h3 className="font-bold text-gray-800">🔍 Probando tablas...</h3>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-100 border border-gray-400 rounded">
      <h3 className="font-bold text-gray-800">🔍 Test de Tablas/Vistas</h3>
      <div className="mt-2 text-sm space-y-2">
        {Object.entries(results).map(([table, result]) => (
          <div key={table} className="border-l-4 border-gray-300 pl-2">
            <p><strong>{table}:</strong></p>
            <p className={result.success ? 'text-green-600' : 'text-red-600'}>
              {result.success ? '✅ Funciona' : '❌ Error'}
            </p>
            {result.error && <p className="text-red-500 text-xs">{result.error}</p>}
            <p className="text-gray-600 text-xs">Datos: {result.dataCount}</p>
            {result.sampleData && (
              <p className="text-gray-500 text-xs">
                Ejemplo: {JSON.stringify(result.sampleData).substring(0, 100)}...
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}




