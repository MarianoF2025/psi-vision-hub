import { NextRequest, NextResponse } from 'next/server';
import { RouterProcessor } from '@/lib/router/processor';
import { WhatsAppMessage, WhatsAppMedia } from '@/lib/router/types';
import { parseAttributionFromReferral, parseUtmParams } from '@/lib/router/meta';

// Endpoint para recibir webhooks de WhatsApp (Cloud API)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entries = body.entry || [];
    const processor = new RouterProcessor();

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value || {};
        const metadata = value.metadata || {};
        const messages = value.messages || [];

        for (const message of messages) {
          const normalized = normalizeWhatsAppMessage(message, metadata);
          if (!normalized.from) continue;
          await processor.processMessage(normalized);
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
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

