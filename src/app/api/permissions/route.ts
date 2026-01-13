import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  
  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_permissions')
      .select('*')
      .eq('email', email)
      .eq('activo', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ permissions: null });
      }
      throw error;
    }

    return NextResponse.json({ permissions: data });
  } catch (err) {
    console.error('Error fetching permissions:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
