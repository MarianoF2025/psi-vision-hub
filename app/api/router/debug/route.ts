import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Endpoint de diagnóstico para verificar estado de Supabase
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Contar conversaciones por área
    const areas = ['PSI Principal', 'Ventas', 'Alumnos', 'Administración', 'Comunidad'];
    const stats: Record<string, any> = {};

    for (const area of areas) {
      const { count, error } = await supabase
        .from('conversaciones')
        .select('*', { count: 'exact', head: true })
        .eq('area', area);

      stats[area] = {
        count: count || 0,
        error: error ? error.message : null,
      };
    }

    // Obtener últimas 5 conversaciones
    const { data: recentConversations, error: recentError } = await supabase
      .from('conversaciones')
      .select('id, telefono, area, estado, ts_ultimo_mensaje, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // Contar contactos
    const { count: contactsCount, error: contactsError } = await supabase
      .from('contactos')
      .select('*', { count: 'exact', head: true });

    // Contar mensajes
    const { count: messagesCount, error: messagesError } = await supabase
      .from('mensajes')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      stats,
      recentConversations: recentConversations || [],
      recentError: recentError?.message,
      contactsCount: contactsCount || 0,
      contactsError: contactsError?.message,
      messagesCount: messagesCount || 0,
      messagesError: messagesError?.message,
    });
  } catch (error: any) {
    console.error('Error en diagnóstico:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

