import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// CONFIGURACIÓN CLOUD API (WSP4)
// ============================================
const CLOUD_API_TOKEN = process.env.CLOUD_API_TOKEN || '';
const CLOUD_API_PHONE_NUMBER_ID = process.env.CLOUD_API_PHONE_NUMBER_ID || '';
const CLOUD_API_VENTAS_PHONE_NUMBER_ID = process.env.CLOUD_API_VENTAS_PHONE_NUMBER_ID || '';
const CLOUD_API_BASE_URL = process.env.CLOUD_API_BASE_URL || 'https://graph.facebook.com/v21.0';

// ============================================
// WEBHOOKS N8N (para líneas que aún usan n8n)
// ============================================
const N8N_WEBHOOKS: Record<string, string> = {
  administracion: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION || '',
  alumnos: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS || '',
  comunidad: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD || '',
  ventas: process.env.N8N_WEBHOOK_ENVIO_VENTAS || '',
  ventas_api: process.env.N8N_WEBHOOK_ENVIO_VENTAS_API || '',
  ventas_1: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1 || '',
  ventas_2: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_2 || '',
  ventas_3: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_3 || '',
};

const LINEAS_CLOUD_API = ['wsp4', 'ventas_api'];

function getPhoneNumberId(linea: string): string {
  if (linea === 'ventas_api') return CLOUD_API_VENTAS_PHONE_NUMBER_ID;
  return CLOUD_API_PHONE_NUMBER_ID;
}

async function enviarCloudAPI(
  phoneNumberId: string,
  tipo: string,
  telefono: string,
  mensaje: string,
  mediaUrl?: string,
  mediaType?: string,
  whatsappContextId?: string | null,
  emoji?: string,
  whatsappMessageId?: string
): Promise<{ success: boolean; whatsapp_message_id?: string; error?: string }> {
  
  const phoneNumber = telefono.replace(/\D/g, '');
  const url = `${CLOUD_API_BASE_URL}/${phoneNumberId}/messages`;
  
  let body: any;

  switch (tipo) {
    case 'text':
      body = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: mensaje }
      };
      if (whatsappContextId) {
        body.context = { message_id: whatsappContextId };
      }
      break;
    case 'image':
      body = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'image',
        image: { link: mediaUrl, caption: mensaje || undefined }
      };
      break;
    case 'audio':
      body = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'audio',
        audio: { link: mediaUrl }
      };
      break;
    case 'video':
      body = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'video',
        video: { link: mediaUrl, caption: mensaje || undefined }
      };
      break;
    case 'document':
      body = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'document',
        document: { link: mediaUrl, caption: mensaje || undefined }
      };
      break;
    case 'reaction':
      body = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'reaction',
        reaction: { message_id: whatsappMessageId, emoji: emoji || '' }
      };
      break;
    default:
      body = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: mensaje }
      };
      if (whatsappContextId) {
        body.context = { message_id: whatsappContextId };
      }
  }

  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUD_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok && result.messages?.[0]?.id) {
        return { success: true, whatsapp_message_id: result.messages[0].id };
      }

      lastError = JSON.stringify(result.error || result);
      console.error(`[ENVIO-CLOUD] Intento ${attempt} falló:`, lastError);

      if (response.status === 429 && attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 2000));
        continue;
      }
      if (response.status >= 400 && response.status < 500) break;

    } catch (err: any) {
      lastError = err.message || 'Error de red';
      console.error(`[ENVIO-CLOUD] Intento ${attempt} error:`, lastError);
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }

  return { success: false, error: lastError };
}

async function guardarMensaje(params: {
  conversacion_id: string;
  mensaje: string;
  tipo: string;
  agente_id?: string;
  agente_nombre?: string;
  whatsapp_message_id?: string;
  whatsapp_context_id?: string | null;
  media_url?: string;
  media_type?: string;
  duracion?: number;
}): Promise<string | null> {
  
  const timestamp = new Date().toISOString();
  
  const displayMessage = params.mensaje || (
    params.tipo === 'audio' ? '[Audio enviado]' :
    params.tipo === 'image' ? '[Imagen enviada]' :
    params.tipo === 'video' ? '[Video enviado]' :
    params.tipo === 'document' ? '[Documento enviado]' :
    ''
  );

  const metadata = JSON.stringify({
    source: 'crm',
    user_id: params.agente_id || null,
    user_name: params.agente_nombre || 'Agente CRM',
    message_type: params.tipo,
    media_url: params.media_url || null,
    media_type: params.media_type || null,
    has_media: !!params.media_url,
  });

  const { data: mensajeData, error: mensajeError } = await supabase
    .from('mensajes')
    .insert({
      conversacion_id: params.conversacion_id,
      remitente_id: params.agente_id || null,
      remitente_nombre: params.agente_nombre || 'Agente CRM',
      remitente_tipo: 'agente',
      mensaje: displayMessage,
      timestamp,
      direccion: 'saliente',
      tipo: params.tipo === 'text' ? 'text' : params.tipo,
      leido: false,
      enviado: true,
      whatsapp_message_id: params.whatsapp_message_id || null,
      whatsapp_context_id: params.whatsapp_context_id || null,
      media_url: params.media_url || null,
      media_type: params.media_type || null,
      duracion: params.duracion || null,
      metadata,
    })
    .select('id')
    .single();

  if (mensajeError) {
    console.error('[ENVIO] Error guardando mensaje:', mensajeError);
    return null;
  }

  await supabase
    .from('conversaciones')
    .update({
      ultimo_mensaje: displayMessage,
      ultimo_mensaje_at: timestamp,
      ts_ultimo_mensaje: timestamp,
    })
    .eq('id', params.conversacion_id);

  return mensajeData?.id || null;
}

async function enviarViaN8N(
  webhookUrl: string,
  payload: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    const result = await response.json().catch(() => ({ success: true }));
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

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
      desconectado_ventas_api,
      respuesta_a,
      media_url,
      media_type,
      duracion,
      agente_id,
      agente_nombre,
      tipo_mensaje,
      emoji,
      whatsapp_message_id,
    } = body;

    if (!telefono || (!mensaje && !emoji)) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    let lineaEnvio = linea_origen || 'wsp4';
    if (desconectado_wsp4 && inbox_fijo) lineaEnvio = inbox_fijo;
    if (desconectado_ventas_api && inbox_fijo) lineaEnvio = inbox_fijo;

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

    const tipoMensaje = tipo_mensaje || media_type || 'text';

    // ============================================
    // CLOUD API DIRECTO (WSP4)
    // ============================================
    if (LINEAS_CLOUD_API.includes(lineaEnvio)) {
      console.log(`[ENVIO] Cloud API directo → ${lineaEnvio} → ${telefono}`);

      const envioResult = await enviarCloudAPI(getPhoneNumberId(lineaEnvio),
        tipoMensaje, telefono, mensaje, media_url, media_type,
        whatsapp_context_id, emoji, whatsapp_message_id
      );

      if (!envioResult.success) {
        console.error('[ENVIO] Error Cloud API:', envioResult.error);
        return NextResponse.json(
          { error: 'Error enviando mensaje', details: envioResult.error },
          { status: 500 }
        );
      }

      let mensajeId: string | null = null;
      if (tipoMensaje !== 'reaction') {
        mensajeId = await guardarMensaje({
          conversacion_id, mensaje, tipo: tipoMensaje,
          agente_id, agente_nombre,
          whatsapp_message_id: envioResult.whatsapp_message_id,
          whatsapp_context_id, media_url, media_type, duracion,
        });
      }

      return NextResponse.json({
        success: true,
        mensaje_id: mensajeId,
        whatsapp_message_id: envioResult.whatsapp_message_id,
      });
    }

    // ============================================
    // N8N (Evolution API — otras líneas)
    // ============================================
    const webhookUrl = N8N_WEBHOOKS[lineaEnvio];
    if (!webhookUrl) {
      return NextResponse.json(
        { error: `Webhook no configurado para línea: ${lineaEnvio}` },
        { status: 500 }
      );
    }

    console.log(`[ENVIO] n8n → ${lineaEnvio} → ${telefono}`);

    const n8nResult = await enviarViaN8N(webhookUrl, {
      telefono, mensaje, conversacion_id, respuesta_a,
      whatsapp_context_id, media_url, media_type, duracion,
      origen: 'crm', timestamp: new Date().toISOString(),
      agente_id, agente_nombre,
    });

    if (!n8nResult.success) {
      return NextResponse.json(
        { error: 'Error enviando mensaje', details: n8nResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: n8nResult.data,
      mensaje_id: n8nResult.data?.message_id,
    });

  } catch (error: any) {
    console.error('[ENVIO] Error general:', error);
    return NextResponse.json({ error: 'Error interno', details: error.message }, { status: 500 });
  }
}
