import { createClient } from '@supabase/supabase-js';
import type { Metrica, AgentInsight, PupyConversation } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper para obtener métricas de cache
export async function getMetricasCache(area?: string, periodo?: string) {
  let query = supabase.from('metrics_cache').select('*');
  
  if (area) query = query.eq('area', area);
  if (periodo) query = query.eq('periodo', periodo);
  
  const { data, error } = await query;
  if (error) throw error;
  return data as Metrica[];
}

// Helper para obtener insights activos
export async function getInsightsActivos(agente?: string, severidad?: string) {
  let query = supabase
    .from('agent_insights')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: false });
  
  if (agente) query = query.eq('agente', agente);
  if (severidad) query = query.eq('severidad', severidad);
  
  const { data, error } = await query;
  if (error) throw error;
  return data as AgentInsight[];
}

// Helper para conversaciones de Pupy
export async function getPupyConversation(userEmail: string) {
  const { data, error } = await supabase
    .from('pupi_conversations')
    .select('*')
    .eq('user_email', userEmail)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data as PupyConversation | null;
}

export async function savePupyConversation(userEmail: string, messages: PupyConversation['messages']) {
  const { data, error } = await supabase
    .from('pupi_conversations')
    .upsert({
      user_email: userEmail,
      messages,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_email' })
    .select()
    .single();
  
  if (error) throw error;
  return data as PupyConversation;
}
