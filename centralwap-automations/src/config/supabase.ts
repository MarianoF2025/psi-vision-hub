import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos');
  process.exit(1);
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function verificarConexion(): Promise<boolean> {
  try {
    const { error } = await supabase.from('cursos').select('count').limit(1);
    if (error) {
      console.error('❌ Error conectando a Supabase:', error.message);
      return false;
    }
    console.log('✅ Conectado a Supabase');
    return true;
  } catch (err) {
    console.error('❌ Error de conexión:', err);
    return false;
  }
}

export default supabase;
