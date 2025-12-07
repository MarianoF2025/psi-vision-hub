// ===========================================
// SUPABASE CLIENT - Configuración
// ===========================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[Supabase] ERROR: Faltan variables de entorno SUPABASE_URL y/o SUPABASE_SERVICE_KEY');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Verificar conexión al iniciar
export async function verificarConexion(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('conversaciones')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('[Supabase] Error verificando conexión:', error.message);
      return false;
    }
    
    console.log('[Supabase] ✅ Conexión verificada');
    return true;
  } catch (err) {
    console.error('[Supabase] Error de conexión:', err);
    return false;
  }
}


