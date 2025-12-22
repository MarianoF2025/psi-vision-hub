import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WEBHOOKS: Record<string, string> = {
  wsp4: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_CRM || '',
  ventas: process.env.N8N_WEBHOOK_ENVIO_VENTAS || '',
  ventas_api: process.env.N8N_WEBHOOK_ENVIO_VENTAS_API || '',
  alumnos: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS || '',
  administracion: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION || '',
  comunidad: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD || '',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      telefono,
      mensaje,
      conversacion_id,
      linea_origen,
      inbox_fijo,
      desconectado_wsp4,
      respuesta_a,
      media_url,
      media_type,
      duracion,
      agente_id,
      agente_nombre
    } = body;

    if (!telefono || !mensaje) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Si hay respuesta_a, obtener el whatsapp_message_id del mensaje original
    let whatsapp_context_id: string | null = null;
    if (respuesta_a) {
      const { data: mensajeOriginal } = await supabase
        .from('mensajes')
        .select('whatsapp_message_id')
        .eq('id', respuesta_a)
        .single();
      if (mensajeOriginal?.whatsapp_message_id) {
        whatsapp_context_id = mensajeOriginal.whatsapp_message_id;
      }
    }

    // Determinar webhook
    let webhookKey = linea_origen || 'wsp4';
    if (desconectado_wsp4 && inbox_fijo) {
      webhookKey = inbox_fijo;
    }

    const webhookUrl = WEBHOOKS[webhookKey];
    if (!webhookUrl) {
      return NextResponse.json({ error: `Webhook no configurado para: ${webhookKey}` }, { status: 500 });
    }

    // Enviar a n8n con datos del agente
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefono,
        mensaje,
        conversacion_id,
        respuesta_a,
        whatsapp_context_id,
        media_url,
        media_type,
        duracion,
        origen: 'crm',
        timestamp: new Date().toISOString(),
        // Datos del agente para tracking
        agente_id,
        agente_nombre
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error en webhook:', errorText);
      return NextResponse.json({ error: 'Error enviando mensaje', details: errorText }, { status: 500 });
    }

    const result = await response.json().catch(() => ({ success: true }));

    return NextResponse.json({
      success: true,
      data: result,
      mensaje_id: result.message_id
    });
  } catch (error) {
    console.error('Error en API enviar:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
