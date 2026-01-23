import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Listar mensajes programados
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversacion_id = searchParams.get('conversacion_id');
    const estado = searchParams.get('estado');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('mensajes_programados')
      .select('*')
      .order('programado_para', { ascending: true })
      .limit(limit);

    if (conversacion_id) {
      query = query.eq('conversacion_id', conversacion_id);
    }

    if (estado) {
      query = query.eq('estado', estado);
    } else {
      // Por defecto, solo pendientes
      query = query.eq('estado', 'pendiente');
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error al obtener mensajes programados:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener mensajes programados' },
      { status: 500 }
    );
  }
}

// POST: Crear mensaje programado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      conversacion_id,
      contacto_id,
      telefono,
      nombre_contacto,
      mensaje,
      media_url,
      media_type,
      media_filename,
      linea_envio,
      instancia_evolution,
      programado_para,
      creado_por,
      creado_por_nombre,
    } = body;

    // Validaciones
    if (!telefono) {
      return NextResponse.json({ error: 'Teléfono es requerido' }, { status: 400 });
    }
    if (!linea_envio || !instancia_evolution) {
      return NextResponse.json({ error: 'Línea de envío es requerida' }, { status: 400 });
    }
    if (!programado_para) {
      return NextResponse.json({ error: 'Fecha programada es requerida' }, { status: 400 });
    }
    if (!mensaje && !media_url) {
      return NextResponse.json({ error: 'Mensaje o archivo es requerido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('mensajes_programados')
      .insert({
        conversacion_id,
        contacto_id,
        telefono,
        nombre_contacto,
        mensaje,
        media_url,
        media_type,
        media_filename,
        linea_envio,
        instancia_evolution,
        programado_para,
        estado: 'pendiente',
        creado_por,
        creado_por_nombre,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, message: 'Mensaje programado exitosamente' });
  } catch (error: any) {
    console.error('Error al programar mensaje:', error);
    return NextResponse.json(
      { error: error.message || 'Error al programar mensaje' },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar mensaje programado (cancelar, editar)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    // Si se está cancelando, agregar timestamp
    if (updates.estado === 'cancelado') {
      updates.cancelado_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('mensajes_programados')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error al actualizar mensaje programado:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar mensaje programado' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar mensaje programado
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('mensajes_programados')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Mensaje eliminado' });
  } catch (error: any) {
    console.error('Error al eliminar mensaje programado:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar mensaje programado' },
      { status: 500 }
    );
  }
}
