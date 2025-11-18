import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CLOUD_API_BASE_URL =
  process.env.CLOUD_API_BASE_URL || 'https://graph.facebook.com/v18.0';
const CLOUD_API_TOKEN = process.env.CLOUD_API_TOKEN;
const CLOUD_API_PHONE_NUMBER_ID = process.env.CLOUD_API_PHONE_NUMBER_ID;

// Endpoint para enviar mensajes a través del Router WSP4
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { to, message, conversationId } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'to y message son requeridos' },
        { status: 400 }
      );
    }

    if (!CLOUD_API_TOKEN || !CLOUD_API_PHONE_NUMBER_ID) {
      return NextResponse.json(
        { error: 'WhatsApp Cloud API no configurada' },
        { status: 500 }
      );
    }

    const sanitizedNumber = to.replace(/[^0-9]/g, '');

    const response = await fetch(
      `${CLOUD_API_BASE_URL}/${CLOUD_API_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CLOUD_API_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: sanitizedNumber,
          type: 'text',
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error WhatsApp Cloud API:', errorBody);
      return NextResponse.json(
        { error: 'Error al enviar mensaje a WhatsApp Cloud API' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const messageId = data.messages?.[0]?.id || data.id || '';

    // Guardar mensaje en la base de datos
    if (conversationId) {
      await supabase.from('mensajes').insert({
        conversacion_id: conversationId,
        mensaje: message,
        remitente_tipo: 'system',
        remitente_nombre: 'Sistema PSI',
        timestamp: new Date().toISOString(),
      });

      await supabase
        .from('conversaciones')
        .update({
          ts_ultimo_mensaje: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    }

    return NextResponse.json(
      {
        success: true,
        messageId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Error al enviar mensaje' },
      { status: 500 }
    );
  }
}

