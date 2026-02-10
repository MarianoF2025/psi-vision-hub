import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usuario_id, tipo, fecha } = body;

    if (!usuario_id || !tipo) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    if (tipo === 'desconexion') {
      await supabase.rpc('cerrar_sesion', {
        p_usuario_id: usuario_id,
        p_fecha: fecha || new Date().toISOString().split('T')[0],
      });

      return NextResponse.json({ success: true, accion: 'sesion_cerrada' });
    }

    return NextResponse.json({ error: 'Tipo no soportado via beacon' }, { status: 400 });
  } catch (error) {
    console.error('[SessionTracker API] Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
