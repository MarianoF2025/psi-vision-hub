import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Webhooks por línea
const WEBHOOKS_ENVIO: Record<string, string> = {
  wsp4: process.env.NEXT_PUBLIC_WEBHOOK_WSP4 || 'https://webhookn8n.psivisionhub.com/webhook/wsp4/enviar',
  ventas: process.env.NEXT_PUBLIC_WEBHOOK_VENTAS || 'https://webhookn8n.psivisionhub.com/webhook/ventas/enviar',
  ventas_api: process.env.NEXT_PUBLIC_WEBHOOK_VENTAS_API || 'https://webhookn8n.psivisionhub.com/webhook/crm/enviar-mensaje-ventas_api',
  alumnos: process.env.NEXT_PUBLIC_WEBHOOK_ALUMNOS || 'https://webhookn8n.psivisionhub.com/webhook/alumnos/enviar',
  administracion: process.env.NEXT_PUBLIC_WEBHOOK_ADMIN || 'https://webhookn8n.psivisionhub.com/webhook/admin/enviar',
  comunidad: process.env.NEXT_PUBLIC_WEBHOOK_COMUNIDAD || 'https://webhookn8n.psivisionhub.com/webhook/comunidad/enviar',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mensaje_id, emoji, telefono } = body;

    if (!mensaje_id || !emoji || !telefono) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Obtener el mensaje con su conversación
    const { data: mensaje, error: msgError } = await supabase
      .from('mensajes')
      .select('whatsapp_message_id, conversacion_id')
      .eq('id', mensaje_id)
      .single();

    if (msgError || !mensaje?.whatsapp_message_id) {
      return NextResponse.json({
        error: 'No se encontró el mensaje o no tiene ID de WhatsApp',
        details: msgError?.message
      }, { status: 404 });
    }

    // Obtener la línea de la conversación
    const { data: conversacion } = await supabase
      .from('conversaciones')
      .select('linea_origen, inbox_fijo, desconectado_wsp4')
      .eq('id', mensaje.conversacion_id)
      .single();

    // Determinar qué línea usar (igual que envío de mensajes)
    let linea = 'wsp4';
    if (conversacion?.desconectado_wsp4 && conversacion?.inbox_fijo) {
      linea = conversacion.inbox_fijo;
    } else if (conversacion?.linea_origen) {
      linea = conversacion.linea_origen;
    }

    const webhookUrl = WEBHOOKS_ENVIO[linea] || WEBHOOKS_ENVIO['wsp4'];

    console.log(`[Reacción CRM] Enviando ${emoji} a ${linea} → ${webhookUrl}`);

    // Enviar reacción al webhook correspondiente
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'reaccion',
        telefono,
        whatsapp_message_id: mensaje.whatsapp_message_id,
        emoji,
        conversacion_id: mensaje.conversacion_id,
        linea,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Reacción CRM] Error:', errorText);
      return NextResponse.json({ error: 'Error enviando reacción', details: errorText }, { status: 500 });
    }

    return NextResponse.json({ success: true, linea, webhook: webhookUrl });
  } catch (error) {
    console.error('[Reacción CRM] Error interno:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
