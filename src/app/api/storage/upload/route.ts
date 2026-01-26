import { NextRequest, NextResponse } from 'next/server';
import { uploadAndSign } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;

    if (!file || !path) {
      return NextResponse.json(
        { error: 'Se requiere file y path' },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { url, error } = await uploadAndSign(path, buffer, {
      contentType: file.type,
      expiresIn: 86400 // 24 horas
    });

    if (error || !url) {
      return NextResponse.json(
        { error: error || 'Error subiendo archivo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Error en /api/storage/upload:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
