import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { usuario_id, usuario_email, usuario_nombre, tipo, fecha } = body;

    if (!usuario_id || !usuario_email || !tipo) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    await supabase.from('agentes_sesiones').insert({
      usuario_id,
      usuario_email,
      usuario_nombre,
      tipo,
      fecha: fecha || new Date().toISOString().split('T')[0],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SessionTracker API] Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
