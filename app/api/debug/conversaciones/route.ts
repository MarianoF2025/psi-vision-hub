import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Endpoint de diagnóstico para verificar conversaciones en Supabase
 * Uso: GET /api/debug/conversaciones
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Obtener TODAS las conversaciones sin filtros
    const { data: allConversations, error: allError } = await supabase
      .from('conversaciones')
      .select('*')
      .order('ts_ultimo_mensaje', { ascending: false });

    if (allError) {
      return NextResponse.json(
        {
          error: 'Error al obtener conversaciones',
          details: allError,
        },
        { status: 500 }
      );
    }

    // 2. Obtener valores únicos del campo 'area'
    const uniqueAreas = Array.from(
      new Set(allConversations?.map((c: any) => c.area).filter(Boolean) || [])
    );

    // 3. Contar por área
    const countByArea: Record<string, number> = {};
    allConversations?.forEach((c: any) => {
      const area = c.area || 'sin_area';
      countByArea[area] = (countByArea[area] || 0) + 1;
    });

    // 4. Obtener algunos mensajes para verificar
    const { data: messages, error: messagesError } = await supabase
      .from('mensajes')
      .select('id, conversacion_id, mensaje, timestamp')
      .order('timestamp', { ascending: false })
      .limit(5);

    // 5. Verificar estructura de una conversación
    const sampleConversation = allConversations?.[0];

    return NextResponse.json({
      success: true,
      summary: {
        total_conversaciones: allConversations?.length || 0,
        total_mensajes_sample: messages?.length || 0,
        areas_unicas: uniqueAreas,
        conteo_por_area: countByArea,
      },
      conversaciones: allConversations?.map((c: any) => ({
        id: c.id,
        telefono: c.telefono,
        area: c.area,
        estado: c.estado,
        ts_ultimo_mensaje: c.ts_ultimo_mensaje,
        router_estado: c.router_estado,
      })),
      mensajes_sample: messages,
      muestra_conversacion: sampleConversation,
      diagnostic: {
        problema_detectado: uniqueAreas.length === 0 
          ? 'No hay conversaciones en la base de datos'
          : !uniqueAreas.includes('PSI Principal')
          ? `El CRM busca 'PSI Principal' pero las áreas reales son: ${uniqueAreas.join(', ')}`
          : 'Las áreas coinciden, verificar RLS o permisos',
        recomendacion: !uniqueAreas.includes('PSI Principal')
          ? `Actualizar el filtro del CRM para usar: ${uniqueAreas[0] || 'el área que realmente existe'}`
          : 'Verificar políticas RLS en Supabase Dashboard',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Error en diagnóstico',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}





