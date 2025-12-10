import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Webhook para enviar reacciones (puede ser el mismo o uno dedicado)
const WEBHOOK_REACCION = process.env.N8N_WEBHOOK_REACCION || process.env.N8N_WEBHOOK_ENVIOS_ROUTER_CRM || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mensaje_id, emoji, telefono } = body;

    if (!mensaje_id || !emoji || !telefono) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Obtener el whatsapp_message_id del mensaje
    const { data: mensaje, error: msgError } = await supabase
      .from('mensajes')
      .select('whatsapp_message_id, conversacion_id')
      .eq('id', mensaje_id)
      .single();

    if (msgError || !mensaje?.whatsapp_message_id) {
      return NextResponse.json({ 
        error: 'No se encontro el mensaje o no tiene ID de WhatsApp',
        details: msgError?.message 
      }, { status: 404 });
    }

    // Enviar reaccion a n8n
    const response = await fetch(WEBHOOK_REACCION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      console.error('Error enviando reaccion:', errorText);
      return NextResponse.json({ error: 'Error enviando reaccion', details: errorText }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en API reaccion:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
