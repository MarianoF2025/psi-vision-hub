import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (q.length < 2) {
      return NextResponse.json({ contactos: [] });
    }

    const { data, error } = await supabase
      .from('contactos')
      .select('id, telefono, nombre, email')
      .or(`nombre.ilike.%${q}%,telefono.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10);

    if (error) {
      console.error('Error buscando contactos:', error);
      return NextResponse.json({ contactos: [] });
    }

    return NextResponse.json({ contactos: data || [] });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    return NextResponse.json({ contactos: [] });
  }
}
