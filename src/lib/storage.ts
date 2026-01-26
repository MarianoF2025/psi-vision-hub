import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente admin para storage (server-side only)
const getAdminClient = () => {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
};

/**
 * Sube archivo y retorna signed URL (server-side)
 */
export async function uploadAndSign(
  path: string,
  file: Buffer | Blob,
  options?: { contentType?: string; expiresIn?: number }
): Promise<{ url: string | null; error: string | null }> {
  const admin = getAdminClient();
  const expiresIn = options?.expiresIn || 3600; // 1 hora default

  try {
    const uploadOptions: any = { cacheControl: '3600', upsert: false };
    if (options?.contentType) uploadOptions.contentType = options.contentType;

    const { error: uploadError } = await admin.storage
      .from('media')
      .upload(path, file, uploadOptions);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { url: null, error: uploadError.message };
    }

    const { data, error: signError } = await admin.storage
      .from('media')
      .createSignedUrl(path, expiresIn);

    if (signError || !data?.signedUrl) {
      return { url: null, error: signError?.message || 'Error firmando URL' };
    }

    return { url: data.signedUrl, error: null };
  } catch (err: any) {
    console.error('Storage error:', err);
    return { url: null, error: err.message };
  }
}

/**
 * Genera signed URL para archivo existente (server-side)
 */
export async function createSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const admin = getAdminClient();

  try {
    const { data, error } = await admin.storage
      .from('media')
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      console.error('Sign error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Storage sign error:', err);
    return null;
  }
}

/**
 * Extrae path desde URL de Supabase (pública o signed)
 */
export function extractPathFromSupabaseUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    // Patrones posibles:
    // Pública: /storage/v1/object/public/media/audios/xxx.ogg
    // Signed: /storage/v1/object/sign/media/audios/xxx.ogg?token=...
    const match = url.match(/\/media\/(.+?)(?:\?|$)/);
    if (match) return match[1];
    
    // Si ya es solo el path
    if (!url.startsWith('http')) return url;
    
    return null;
  } catch {
    return null;
  }
}
