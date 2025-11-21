import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Validar que las variables estén configuradas
  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    const errorMessage = 
      `❌ Variables de entorno de Supabase no configuradas: ${missingVars.join(', ')}\n` +
      `Por favor, crea un archivo .env.local en la raíz del proyecto con:\n` +
      `NEXT_PUBLIC_SUPABASE_URL=https://rbtczzjlvnymylkvcwdv.supabase.co\n` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui`;
    
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validar formato de URL
  try {
    new URL(supabaseUrl);
  } catch {
    const errorMessage = `❌ NEXT_PUBLIC_SUPABASE_URL tiene formato inválido: ${supabaseUrl}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validar que la key no sea un placeholder
  if (supabaseAnonKey.includes('tu_anon_key') || supabaseAnonKey.includes('placeholder')) {
    const errorMessage = 
      `❌ NEXT_PUBLIC_SUPABASE_ANON_KEY parece ser un placeholder\n` +
      `Por favor, reemplázalo con la clave real de Supabase (Settings > API > anon/public key)`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

