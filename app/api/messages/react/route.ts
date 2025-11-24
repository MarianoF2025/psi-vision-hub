import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CLOUD_API_BASE_URL =
  process.env.CLOUD_API_BASE_URL || 'https://graph.facebook.com/v18.0';
const CLOUD_API_TOKEN = process.env.CLOUD_API_TOKEN;
const CLOUD_API_PHONE_NUMBER_ID = process.env.CLOUD_API_PHONE_NUMBER_ID;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { mensaje_id, emoji, action = 'add' } = body || {};

    if (!mensaje_id || !emoji) {
      return NextResponse.json(
        { error: 'mensaje_id y emoji son requeridos' },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: mensaje, error: mensajeError } = await supabase
      .from('mensajes')
      .select(
        `
          id,
          conversacion_id,
          whatsapp_message_id,
          conversaciones:conversaciones (
            telefono
          )
        `
      )
      .eq('id', mensaje_id)
      .single();

    if (mensajeError || !mensaje) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    if (!mensaje.whatsapp_message_id) {
      return NextResponse.json(
        { error: 'El mensaje no tiene whatsapp_message_id' },
        { status: 400 }
      );
    }

    const telefono = mensaje.conversaciones?.telefono;
    if (!telefono) {
      return NextResponse.json(
        { error: 'No se encontró teléfono para la conversación' },
        { status: 400 }
      );
    }

    if (!CLOUD_API_TOKEN || !CLOUD_API_PHONE_NUMBER_ID) {
      return NextResponse.json(
        { error: 'WhatsApp Cloud API no está configurada' },
        { status: 500 }
      );
    }

    const reactionEmoji =
      action === 'remove' ? '' : emoji;

    const whatsappResponse = await fetch(
      `${CLOUD_API_BASE_URL}/${CLOUD_API_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CLOUD_API_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: telefono,
          type: 'reaction',
          reaction: {
            message_id: mensaje.whatsapp_message_id,
            emoji: reactionEmoji,
          },
        }),
      }
    );

    if (!whatsappResponse.ok) {
      const errorBody = await whatsappResponse.text();
      return NextResponse.json(
        {
          error: 'Error al enviar reacción a WhatsApp',
          details: errorBody,
        },
        { status: whatsappResponse.status || 502 }
      );
    }

    if (action === 'remove') {
      const { error } = await supabase
        .from('mensaje_reacciones')
        .delete()
        .eq('mensaje_id', mensaje_id)
        .eq('usuario_id', user.id)
        .eq('emoji', emoji);

      if (error) {
        return NextResponse.json(
          { error: `Error al eliminar reacción: ${error.message}` },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabase.from('mensaje_reacciones').upsert(
        {
          mensaje_id,
          emoji,
          usuario_id: user.id,
          autor_tipo: 'usuario',
          autor_telefono: telefono,
        },
        { onConflict: 'mensaje_id,usuario_id,emoji' }
      );

      if (error) {
        return NextResponse.json(
          { error: `Error al guardar reacción: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en API de reacciones:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

