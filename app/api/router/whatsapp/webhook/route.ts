import { NextRequest, NextResponse } from 'next/server';
import { RouterProcessor } from '@/lib/router/processor';
import { WhatsAppMessage, WhatsAppMedia } from '@/lib/router/types';
import { parseAttributionFromReferral, parseUtmParams } from '@/lib/router/meta';

// Endpoint para recibir webhooks de WhatsApp (Cloud API o n8n)
export async function POST(request: NextRequest) {
  try {
    // Log headers para debugging
    const contentType = request.headers.get('content-type');
    const contentLength = request.headers.get('content-length');
    console.log(`Webhook recibido - Content-Type: ${contentType}, Content-Length: ${contentLength}`);
    
    // Leer el body como texto primero para debugging
    let bodyText: string;
    try {
      bodyText = await request.text();
    } catch (readError: any) {
      console.error('Error leyendo body:', readError);
      return NextResponse.json(
        { error: 'Error al leer el body del request', details: readError.message },
        { status: 400 }
      );
    }
    
    if (!bodyText || bodyText.trim().length === 0) {
      console.error('Webhook recibido con body vacío');
      console.error('Headers recibidos:', Object.fromEntries(request.headers.entries()));
      return NextResponse.json(
        { error: 'Body vacío', contentType, contentLength },
        { status: 400 }
      );
    }

    console.log(`Body recibido (${bodyText.length} caracteres):`, bodyText.substring(0, 200));

    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError: any) {
      console.error('Error parseando JSON:', parseError);
      console.error('Body recibido (primeros 500 chars):', bodyText.substring(0, 500));
      return NextResponse.json(
        { error: 'JSON inválido', details: parseError.message, bodyPreview: bodyText.substring(0, 100) },
        { status: 400 }
      );
    }

    console.log('📥 Webhook recibido (formato completo):', JSON.stringify(body, null, 2).substring(0, 1000));
    const processor = new RouterProcessor();

    // Detectar formato: estándar WhatsApp Cloud API o directo desde n8n
    let messagesToProcess: any[] = [];
    let metadata: any = {};

    // Formato 1: Estándar WhatsApp Cloud API webhook (entry -> changes -> value)
    if (body.entry && Array.isArray(body.entry)) {
      console.log('🔍 Detectado formato 1: WhatsApp Cloud API webhook (entry.changes.value)');
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
    // Formato 2: Directo desde n8n - formato estándar WhatsApp Cloud API (messages en root)
    else if (body.messages && Array.isArray(body.messages)) {
      console.log('🔍 Detectado formato 2: Directo desde n8n (messages en root)');
      metadata = body.metadata || {};
      messagesToProcess = body.messages;
      console.log(`📊 Encontrados ${messagesToProcess.length} mensajes para procesar`);
      console.log(`📋 Metadata:`, JSON.stringify(metadata, null, 2));
    }
    // Formato 3: Si viene un solo mensaje directamente (formato simplificado)
    else if (body.from && (body.message || body.text)) {
      console.log('🔍 Detectado formato 3: Mensaje simplificado (from + message/text)');
      messagesToProcess = [body];
      metadata = body.metadata || {};
    }
    // Formato 4: Formato directo de WhatsApp Cloud API sin wrapper (el mensaje está en root)
    else if (body.from && body.id && (body.text || body.type)) {
      console.log('🔍 Detectado formato 4: Mensaje directo de WhatsApp Cloud API');
      messagesToProcess = [body];
      metadata = {
        display_phone_number: body.to || body.metadata?.display_phone_number,
        phone_number_id: body.metadata?.phone_number_id,
      };
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
        console.log(`📨 Mensaje raw recibido:`, JSON.stringify(message, null, 2).substring(0, 500));
        console.log(`📋 Metadata recibida:`, JSON.stringify(metadata, null, 2).substring(0, 300));
        
        const normalized = normalizeWhatsAppMessage(message, metadata);
        console.log(`🔄 Mensaje normalizado:`, {
          from: normalized.from,
          message: normalized.message?.substring(0, 100),
          type: normalized.type,
          messageId: normalized.messageId,
        });
        
        if (!normalized.from) {
          console.error('❌ ERROR: Mensaje sin campo "from" después de normalización');
          console.error('   - Mensaje raw:', JSON.stringify(message, null, 2));
          console.error('   - Metadata:', JSON.stringify(metadata, null, 2));
          continue;
        }
        
        if (!normalized.message || normalized.message.trim().length === 0) {
          console.warn('⚠️ Mensaje sin contenido de texto, puede ser media o tipo especial');
        }
        
        console.log(`🔄 Procesando mensaje de ${normalized.from}: ${normalized.message?.substring(0, 50)}...`);
        const result = await processor.processMessage(normalized);
        
        if (!result.success) {
          console.error(`❌❌❌ ERROR procesando mensaje: ${result.message}`);
          console.error(`   - Conversación: ${result.conversationId || 'N/A'}`);
          console.error(`   - From: ${normalized.from}`);
          console.error(`   - Message: ${normalized.message?.substring(0, 100)}`);
        } else {
          console.log(`✅✅✅ Mensaje procesado exitosamente. Conversación: ${result.conversationId}`);
        }
        
        processedCount++;
      } catch (error: any) {
        console.error('❌❌❌ ERROR CRÍTICO procesando mensaje individual:', error);
        console.error('   - Mensaje:', JSON.stringify(message, null, 2).substring(0, 500));
        console.error('   - Stack:', error.stack);
        // Continuar con el siguiente mensaje pero registrar el error
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

