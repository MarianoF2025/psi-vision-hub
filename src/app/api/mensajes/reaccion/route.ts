import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CLOUD_API_TOKEN = process.env.CLOUD_API_TOKEN || '';
const CLOUD_API_PHONE_NUMBER_ID = process.env.CLOUD_API_PHONE_NUMBER_ID || '';
const CLOUD_API_VENTAS_PHONE_NUMBER_ID = process.env.CLOUD_API_VENTAS_PHONE_NUMBER_ID || '';
const CLOUD_API_BASE_URL = process.env.CLOUD_API_BASE_URL || 'https://graph.facebook.com/v21.0';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mensaje_id, emoji, telefono } = body;

    if (!mensaje_id || emoji === undefined || !telefono) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Obtener el mensaje con su conversación y linea_origen
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

    // Obtener linea_origen de la conversación
    const { data: conv } = await supabase
      .from('conversaciones')
      .select('linea_origen')
      .eq('id', mensaje.conversacion_id)
      .single();

    const lineaOrigen = conv?.linea_origen || 'wsp4';

    console.log(`[Reaccion] ${emoji || '(quitar)'} → msg ${mensaje.whatsapp_message_id} → ${lineaOrigen}`);

    if (lineaOrigen === 'wsp4' || lineaOrigen === 'ventas_api') {
      // Cloud API directo
      const phoneNumber = telefono.replace(/\D/g, '');
      const phoneNumId = lineaOrigen === 'ventas_api' ? CLOUD_API_VENTAS_PHONE_NUMBER_ID : CLOUD_API_PHONE_NUMBER_ID;
      const url = `${CLOUD_API_BASE_URL}/${phoneNumId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUD_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'reaction',
          reaction: {
            message_id: mensaje.whatsapp_message_id,
            emoji: emoji || ''
          }
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[Reaccion] Error Cloud API:', result);
        return NextResponse.json({ error: 'Error enviando reacción', details: result }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Para otras líneas, seguir usando n8n
    const WEBHOOK_ENVIO = process.env.N8N_WEBHOOK_ENVIOS_ROUTER_CRM || '';
    if (!WEBHOOK_ENVIO) {
      return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 });
    }

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
      return NextResponse.json({ error: 'Error enviando reacción', details: errorText }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Reaccion] Error interno:', error);
    return NextResponse.json({ error: 'Error interno', details: error.message }, { status: 500 });
  }
}
