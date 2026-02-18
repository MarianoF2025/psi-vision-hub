import { NextRequest, NextResponse } from 'next/server';
import { ejecutarAgenteAlumnos } from '@/lib/agents/alumnos-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { desde, hasta } = body;
    const resultado = await ejecutarAgenteAlumnos(desde, hasta);
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('Error en agente de alumnos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del agente' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('agent_insights')
      .select('*')
      .eq('area', 'alumnos')
      .eq('vigente', true)
      .order('severidad', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, insights: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
