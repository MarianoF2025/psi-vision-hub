import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { WhatsAppMedia } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CLOUD_API_BASE_URL =
  process.env.CLOUD_API_BASE_URL || 'https://graph.facebook.com/v18.0';
const CLOUD_API_TOKEN = process.env.CLOUD_API_TOKEN;
const CLOUD_API_PHONE_NUMBER_ID = process.env.CLOUD_API_PHONE_NUMBER_ID;

const BUCKET_AUDIOS =
  process.env.SUPABASE_STORAGE_BUCKET_AUDIOS || 'audios';
const BUCKET_DOCUMENTOS =
  process.env.SUPABASE_STORAGE_BUCKET_DOCUMENTOS || 'documentos';

function getBucketForMimeType(mimeType?: string) {
  if (!mimeType) return BUCKET_DOCUMENTOS;
  if (mimeType.startsWith('audio')) return BUCKET_AUDIOS;
  return BUCKET_DOCUMENTOS;
}

export async function downloadWhatsAppMedia(mediaId: string) {
  if (!CLOUD_API_TOKEN) {
    throw new Error('CLOUD_API_TOKEN no configurado');
  }

  const metadataRes = await fetch(
    `${CLOUD_API_BASE_URL}/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${CLOUD_API_TOKEN}` },
    }
  );
  if (!metadataRes.ok) {
    throw new Error('Error obteniendo metadata de media de WhatsApp');
  }
  const metadata = await metadataRes.json();

  const urlRes = await fetch(metadata.url, {
    headers: { Authorization: `Bearer ${CLOUD_API_TOKEN}` },
  });
  if (!urlRes.ok) {
    throw new Error('Error descargando media de WhatsApp');
  }

  const arrayBuffer = await urlRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    mimeType: metadata.mime_type,
    sha256: metadata.sha256,
    fileSize: buffer.length,
    fileName: metadata.id,
  };
}

export async function uploadMediaToSupabase(
  conversationId: string,
  mediaId: string,
  media: {
    buffer: Buffer;
    mimeType?: string;
    fileSize?: number;
    fileName?: string;
  }
) {
  const bucket = getBucketForMimeType(media.mimeType);
  const extension = guessExtension(media.mimeType);
  const filePath = `conversations/${conversationId}/${mediaId}${extension}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, media.buffer, {
      upsert: true,
      contentType: media.mimeType || 'application/octet-stream',
    });

  if (error) {
    throw error;
  }

  const { data: publicUrl } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return {
    path: data.path,
    bucket,
    publicUrl: publicUrl.publicUrl,
  };
}

export async function generateThumbnail(
  buffer: Buffer,
  mimeType?: string
): Promise<string | undefined> {
  try {
    if (!mimeType || !mimeType.startsWith('image')) return;
    const resized = await sharp(buffer).resize(320).jpeg({ quality: 70 }).toBuffer();
    return `data:image/jpeg;base64,${resized.toString('base64')}`;
  } catch (error) {
    console.warn('Error generating thumbnail', error);
    return;
  }
}

export async function transcribeAudio(publicUrl: string): Promise<string | undefined> {
  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openAIKey) return;

  try {
    const res = await fetch(publicUrl);
    const blob = await res.blob();
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'gpt-4o-mini-transcribe');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      console.warn('Error transcribiendo audio');
      return;
    }

    const data = await response.json();
    return data.text as string;
  } catch (error) {
    console.error('Error transcribiendo audio', error);
    return;
  }
}

function guessExtension(mimeType?: string) {
  if (!mimeType) return '';
  if (mimeType === 'audio/ogg') return '.ogg';
  if (mimeType === 'audio/mpeg') return '.mp3';
  if (mimeType === 'audio/webm') return '.webm';
  if (mimeType.startsWith('image/')) return '.jpg';
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType.includes('msword')) return '.doc';
  if (mimeType.includes('spreadsheet')) return '.xls';
  if (mimeType === 'video/mp4') return '.mp4';
  return '';
}

