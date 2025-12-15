import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente singleton con soporte de cookies
let client: ReturnType<typeof createBrowserClient> | null = null;

const getClient = () => {
  if (typeof window === 'undefined') {
    // Server-side: crear cliente nuevo
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  // Client-side: singleton
  if (!client) {
    client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
};

export const supabase = getClient();

export const getSupabaseBrowser = () => getClient();

export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  return { error: error.message || 'Error desconocido' };
};
