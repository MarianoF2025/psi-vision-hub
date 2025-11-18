import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Endpoint para obtener estado de una conversación
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const conversationId = params.id;

    const { data: conversation, error } = await supabase
      .from('conversaciones')
      .select(`
        *,
        contactos (
          id,
          telefono,
          nombre
        )
      `)
      .eq('id', conversationId)
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    // Obtener último mensaje
    const { data: lastMessage } = await supabase
      .from('mensajes')
      .select('*')
      .eq('conversacion_id', conversationId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      conversation: {
        ...conversation,
        lastMessage: lastMessage || null,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error getting conversation:', error);
    return NextResponse.json(
      { error: 'Error al obtener conversación' },
      { status: 500 }
    );
  }
}

