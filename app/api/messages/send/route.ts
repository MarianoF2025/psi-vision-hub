import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { conversacion_id, mensaje, remitente } = body;

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
    // Los mensajes desde el CRM son enviados por agentes
    const insertData: any = {
      conversacion_id: conversacion_id,
      mensaje: mensaje,
      remitente_tipo: 'agente',
      remitente_nombre: user.email || remitente || 'Agente',
      timestamp: new Date().toISOString(),
    };

    // Intentar obtener el ID del usuario/agente si existe en contactos o perfiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profile) {
      insertData.remitente_id = profile.id;
    }

    const { data: message, error: messageError } = await supabase
      .from('mensajes')
      .insert(insertData)
      .select()
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json(
        { error: 'Error al crear mensaje' },
        { status: 500 }
      );
    }

    // Actualizar última actividad de la conversación
    await supabase
      .from('conversaciones')
      .update({
        ts_ultimo_mensaje: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversacion_id);

    // TODO: Integrar con Router WSP4 para envío real
    // Aquí se enviaría el mensaje al router de WhatsApp
    // await sendToRouter(conversation.contactos.phone, content);

    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (error) {
    console.error('Error in send message API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

