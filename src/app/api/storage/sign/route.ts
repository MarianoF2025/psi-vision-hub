import { NextRequest, NextResponse } from 'next/server';
import { createSignedUrl, extractPathFromSupabaseUrl } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { url, path, expiresIn = 3600 } = await request.json();

    // Puede recibir URL completa o path directo
    let filePath = path;
    if (url && !path) {
      filePath = extractPathFromSupabaseUrl(url);
    }

    if (!filePath) {
      return NextResponse.json(
        { error: 'Se requiere url o path' },
        { status: 400 }
      );
    }

    const signedUrl = await createSignedUrl(filePath, expiresIn);

    if (!signedUrl) {
      return NextResponse.json(
        { error: 'Error generando URL firmada' },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl });
  } catch (error: any) {
    console.error('Error en /api/storage/sign:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
