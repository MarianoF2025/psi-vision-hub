import { NextRequest, NextResponse } from 'next/server';
import { RouterProcessor } from '@/lib/router/processor';
import { WhatsAppMessage, WhatsAppMedia } from '@/lib/router/types';
import { parseAttributionFromReferral, parseUtmParams } from '@/lib/router/meta';

// Endpoint para recibir webhooks de WhatsApp (Cloud API o n8n)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const processor = new RouterProcessor();

    // Detectar formato: estándar WhatsApp Cloud API o directo desde n8n
    let messagesToProcess: any[] = [];
    let metadata: any = {};

    // Formato 1: Estándar WhatsApp Cloud API (entry -> changes -> value)
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};
          metadata = value.metadata || {};
          const messages = value.messages || [];
          messagesToProcess.push(...messages);
        }
      }
    }
    // Formato 2: Directo desde n8n (messages o statuses en root)
    else if (body.messages && Array.isArray(body.messages)) {
      metadata = body.metadata || {};
      messagesToProcess = body.messages;
    }
    // Formato 3: Si viene un solo mensaje directamente
    else if (body.from && body.message) {
      messagesToProcess = [body];
      metadata = body.metadata || {};
    }

    // Si no hay mensajes para procesar (solo statuses), retornar éxito
    if (messagesToProcess.length === 0) {
      console.log('Webhook recibido sin mensajes (solo statuses o formato desconocido)');
      return NextResponse.json({ success: true, message: 'No messages to process' }, { status: 200 });
    }

    // Procesar mensajes
    let processedCount = 0;
    for (const message of messagesToProcess) {
      // Ignorar statuses (delivered, read, etc.) - solo procesar mensajes reales
      if (message.status || message.type === 'status') {
        continue;
      }

      try {
        const normalized = normalizeWhatsAppMessage(message, metadata);
        if (!normalized.from) {
          console.warn('Mensaje sin campo "from", ignorando:', message.id || message);
          continue;
        }
        
        console.log(`Procesando mensaje de ${normalized.from}: ${normalized.message?.substring(0, 50)}...`);
        const result = await processor.processMessage(normalized);
        
        if (!result.success) {
          console.error('Error procesando mensaje:', result.message);
        } else {
          console.log(`Mensaje procesado exitosamente. Conversación: ${result.conversationId}`);
        }
        
        processedCount++;
      } catch (error) {
        console.error('Error procesando mensaje individual:', error);
        // Continuar con el siguiente mensaje
      }
    }

    console.log(`Webhook procesado: ${processedCount} mensaje(s) de ${messagesToProcess.length} recibido(s)`);
    return NextResponse.json({ success: true, processed: processedCount }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error al procesar webhook' },
      { status: 500 }
    );
  }
}

// GET para verificación del webhook (WhatsApp Cloud API)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return NextResponse.json(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function normalizeWhatsAppMessage(message: any, metadata: any): WhatsAppMessage {
  const base: WhatsAppMessage = {
    from: message.from,
    to: metadata?.display_phone_number || metadata?.phone_number_id || '',
    message:
      message.text?.body ||
      message.button?.text ||
      message.interactive?.list_reply?.title ||
      message.interactive?.button_reply?.title ||
      message.audio?.caption ||
      message.image?.caption ||
      '[Contenido]',
    messageId: message.id,
    timestamp: message.timestamp
      ? new Date(parseInt(message.timestamp, 10) * 1000).toISOString()
      : new Date().toISOString(),
    type: message.type,
    media: extractMedia(message),
    attribution: parseAttributionFromReferral(
      message.referral || message.context?.referral
    ),
    referral: message.referral || message.context?.referral,
    raw: message,
  };

  // Enriquecer con datos de links (UTM)
  const linkWithUtm = message?.context?.metadata?.referer
    ? message.context.metadata.referer
    : undefined;
  if (linkWithUtm) {
    base.attribution = {
      ...base.attribution,
      ...parseUtmParams(linkWithUtm),
    };
  }

  return base;
}

function extractMedia(message: any): WhatsAppMedia | undefined {
  switch (message.type) {
    case 'image':
      return {
        id: message.image?.id,
        mimeType: message.image?.mime_type,
        caption: message.image?.caption,
        sha256: message.image?.sha256,
      };
    case 'audio':
      return {
        id: message.audio?.id,
        mimeType: message.audio?.mime_type,
        sha256: message.audio?.sha256,
        duration: message.audio?.duration,
      };
    case 'video':
      return {
        id: message.video?.id,
        mimeType: message.video?.mime_type,
        caption: message.video?.caption,
        sha256: message.video?.sha256,
      };
    case 'document':
      return {
        id: message.document?.id,
        mimeType: message.document?.mime_type,
        fileName: message.document?.filename,
        caption: message.document?.caption,
        sha256: message.document?.sha256,
      };
    case 'sticker':
      return {
        id: message.sticker?.id,
        mimeType: message.sticker?.mime_type,
        sha256: message.sticker?.sha256,
      };
    default:
      return undefined;
  }
}

