import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      conversacion_id,
      mensaje,
      remitente,
      mensaje_respuesta_id,
      reenviado,
      mensaje_original_id,
    } = body;

    if (!conversacion_id || !mensaje) {
      return NextResponse.json(
        { error: 'conversacion_id y mensaje son requeridos' },
        { status: 400 }
      );
    }

    // Obtener información de la conversación
    const { data: conversation, error: convError } = await supabase
      .from('conversaciones')
      .select('contacto_id, telefono, contactos(telefono)')
      .eq('id', conversacion_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    // Obtener usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Crear mensaje en la base de datos
    const messageData: any = {
      conversacion_id: conversacion_id,
      mensaje: mensaje,
      remitente: remitente || user.email || 'system',
      timestamp: new Date().toISOString(),
    };

    // Si hay un mensaje al que responder, agregar referencia
    if (mensaje_respuesta_id) {
      messageData.mensaje_respuesta_id = mensaje_respuesta_id;
    }

    if (typeof reenviado === 'boolean') {
      messageData.reenviado = reenviado;
    }

    if (mensaje_original_id) {
      messageData.mensaje_original_id = mensaje_original_id;
    }

    const { data: message, error: messageError } = await supabase
      .from('mensajes')
      .insert(messageData)
      .select()
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json(
        { error: 'Error al crear mensaje' },
        { status: 500 }
      );
    }

    // Registrar relación de respuesta en tabla dedicada
    if (mensaje_respuesta_id) {
      try {
        await supabase.from('mensajes_respuestas').insert({
          mensaje_id: message.id,
          mensaje_respuesta_id,
        });
      } catch (replyError) {
        console.warn('Error registrando relación de respuesta:', replyError);
      }
    }

    // Actualizar última actividad de la conversación
    await supabase
      .from('conversaciones')
      .update({
        ts_ultimo_mensaje: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversacion_id);

    // Integrar con Router Centralwap para envío real por WhatsApp
    const routerUrl = process.env.CENTRALWAP_ROUTER_URL || process.env.NEXT_PUBLIC_CENTRALWAP_ROUTER_URL || 'http://localhost:3002';
    const telefono = conversation.telefono || conversation.contactos?.telefono;

    if (!telefono) {
      console.error('No se encontró teléfono en la conversación');
      return NextResponse.json(
        { error: 'No se encontró teléfono en la conversación' },
        { status: 400 }
      );
    }

    try {
      // Llamar al Router para enviar el mensaje por WhatsApp
      const routerResponse = await fetch(`${routerUrl}/api/centralwap/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `crm_${Date.now()}_${message.id.substring(0, 8)}`,
        },
        body: JSON.stringify({
          telefono: telefono,
          mensaje: mensaje,
          conversacion_id: conversacion_id,
          remitente: remitente || user.email || 'system',
          reenviado: !!reenviado,
        }),
      });

      if (!routerResponse.ok) {
        const errorData = await routerResponse.json().catch(() => ({}));
        console.error('Error al enviar mensaje al Router:', errorData);
        
        // Actualizar mensaje con estado de error
        await supabase
          .from('mensajes')
          .update({
            estado: 'error',
            metadata: {
              ...messageData.metadata,
              error: errorData.error || 'Error al enviar al Router',
              error_timestamp: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', message.id);

        return NextResponse.json(
          { 
            success: false, 
            error: errorData.error || 'Error al enviar mensaje al Router',
            message 
          },
          { status: routerResponse.status || 500 }
        );
      }

      const routerResult = await routerResponse.json();

      // Actualizar mensaje con message_id y estado de éxito
      await supabase
        .from('mensajes')
        .update({
          estado: 'sent',
          metadata: {
            ...messageData.metadata,
            whatsapp_message_id: routerResult.message_id,
            sent_at: new Date().toISOString(),
            router_request_id: routerResult.request_id,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', message.id);

      return NextResponse.json({ 
        success: true, 
        message: {
          ...message,
          whatsapp_message_id: routerResult.message_id,
          estado: 'sent',
        }
      }, { status: 200 });

    } catch (routerError: any) {
      console.error('Error al comunicarse con el Router:', routerError);
      
      // Actualizar mensaje con estado de error
      await supabase
        .from('mensajes')
        .update({
          estado: 'error',
          metadata: {
            ...messageData.metadata,
            error: routerError.message || 'Error de conexión con el Router',
            error_timestamp: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', message.id);

      return NextResponse.json(
        { 
          success: false,
          error: 'Error al comunicarse con el Router de WhatsApp',
          message 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in send message API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

