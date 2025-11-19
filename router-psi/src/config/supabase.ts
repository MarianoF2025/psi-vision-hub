import { createClient } from '@supabase/supabase-js';
import { Env } from './environment';

export const supabaseAdmin = createClient(Env.supabase.url, Env.supabase.serviceKey, {
  auth: {
    persistSession: false,
  },
});

export const supabaseAnon = createClient(Env.supabase.url, Env.supabase.anonKey, {
  auth: {
    persistSession: false,
  },
});
