'use client'

export default function EnvTest() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
      <h3 className="font-bold text-yellow-800">🔧 Test de Variables de Entorno</h3>
      <div className="mt-2 text-sm space-y-1">
        <p><strong>URL:</strong> {url || '❌ No encontrada'}</p>
        <p><strong>Key:</strong> {key ? `✅ Configurada (${key.length} caracteres)` : '❌ No encontrada'}</p>
        <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
        <p><strong>NEXT_PUBLIC_APP_URL:</strong> {process.env.NEXT_PUBLIC_APP_URL || 'No configurada'}</p>
      </div>
    </div>
  )
}




