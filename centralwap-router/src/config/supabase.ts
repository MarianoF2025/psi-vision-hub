import { createClient } from '@supabase/supabase-js';
import { config } from './environment';

// Cliente Supabase con permisos de service role (para operaciones administrativas)
export const supabaseAdmin = createClient(config.supabase.url, config.supabase.service_key, {
  auth: {
    persistSession: false,
  },
});

// Cliente Supabase anónimo (para operaciones públicas)
export const supabaseAnon = createClient(config.supabase.url, config.supabase.anon_key, {
  auth: {
    persistSession: false,
  },
});

// Exportar el cliente principal (admin por defecto)
export const supabase = supabaseAdmin;









