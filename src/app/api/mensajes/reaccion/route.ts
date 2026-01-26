import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// URL correcta del workflow
const WEBHOOK_ENVIO = 'https://webhookn8n.psivisionhub.com/webhook/crm/enviar_mensaje';

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

   console.log('[Reaccion CRM] Enviando ' + emoji + ' al mensaje ' + mensaje.whatsapp_message_id);   

    // Enviar reacción al workflow
    const response = await fetch(WEBHOOK_ENVIO, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || ''
      },
      body: JSON.stringify({
        tipo: 'reaccion',
        telefono,
        whatsapp_message_id: mensaje.whatsapp_message_id,
        emoji,
        conversacion_id: mensaje.conversacion_id,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Reaccion CRM] Error:', errorText);
      return NextResponse.json({ error: 'Error enviando reacción', details: errorText }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Reaccion CRM] Error interno:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
