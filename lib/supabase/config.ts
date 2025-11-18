/**
 * Configuración de Supabase
 * 
 * Variables de entorno requeridas:
 * - NEXT_PUBLIC_SUPABASE_URL: URL de tu proyecto Supabase
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Clave anónima pública de Supabase
 * 
 * Para obtener estas credenciales:
 * 1. Ve a tu proyecto en https://supabase.com
 * 2. Settings > API
 * 3. Copia la URL del proyecto y la anon/public key
 */

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

// Validar que las variables de entorno estén configuradas
if (typeof window === 'undefined') {
  // Solo validar en el servidor
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    console.warn(
      '⚠️  Variables de entorno de Supabase no configuradas.\n' +
      'Por favor, crea un archivo .env.local con:\n' +
      'NEXT_PUBLIC_SUPABASE_URL=tu_url\n' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key'
    );
  }
}

