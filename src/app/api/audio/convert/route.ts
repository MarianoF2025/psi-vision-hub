import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const inputPath = join(tmpdir(), `audio_input_${Date.now()}.m4a`);
  const outputPath = join(tmpdir(), `audio_output_${Date.now()}.ogg`);
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversacionId = formData.get('conversacion_id') as string;

    if (!file || !conversacionId) {
      return NextResponse.json({ error: 'Faltan file o conversacion_id' }, { status: 400 });
    }

    // Guardar archivo temporal
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    // Convertir a OGG Opus con ffmpeg
    const ffmpegCmd = `ffmpeg -i "${inputPath}" -c:a libopus -b:a 32k -vbr on -compression_level 10 -application voip "${outputPath}" -y`;
    await execAsync(ffmpegCmd);

    // Leer archivo convertido
    const convertedBuffer = await readFile(outputPath);

    // Subir a Supabase
    const timestamp = Date.now();
    const fileName = `${conversacionId}/${timestamp}.ogg`;
    
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, convertedBuffer, {
        contentType: 'audio/ogg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error subiendo a Supabase:', uploadError);
      return NextResponse.json({ error: 'Error subiendo archivo' }, { status: 500 });
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);

    // Limpiar archivos temporales
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return NextResponse.json({ 
      success: true, 
      url: urlData.publicUrl,
      format: 'ogg'
    });

  } catch (error) {
    console.error('Error convirtiendo audio:', error);
    // Limpiar archivos temporales en caso de error
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    return NextResponse.json({ error: 'Error convirtiendo audio' }, { status: 500 });
  }
}
