import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { pago_id } = await request.json();

    const { data: pago, error } = await supabase
      .from('pagos')
      .select('*, contacto:contactos(nombre, telefono)')
      .eq('id', pago_id)
      .single();

    if (error || !pago) {
      return NextResponse.json({ success: false, error: 'Pago no encontrado' }, { status: 404 });
    }

    if (!pago.link_pago || !pago.contacto?.telefono) {
      return NextResponse.json({ success: false, error: 'Faltan datos para reenviar' }, { status: 400 });
    }

    const telefono = pago.contacto.telefono;

    const { data: conv } = await supabase
      .from('conversaciones')
      .select('id, linea_origen, inbox_fijo, desconectado_wsp4')
      .eq('telefono', telefono)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!conv) {
      return NextResponse.json({ success: false, error: 'No hay conversacion con este contacto' }, { status: 400 });
    }

    const montoFormateado = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: pago.moneda,
      minimumFractionDigits: 0,
    }).format(pago.monto);

    const mensaje = 'Recordatorio de Pago\n\nHola ' + (pago.contacto.nombre || '') + '! Te reenviamos el link de pago:\n\n' + pago.descripcion + '\nMonto: ' + montoFormateado + '\n\n' + pago.link_pago + '\n\nGracias!';

    const webhooks: Record<string, string> = {
      wsp4: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_CRM || '',
      ventas: process.env.N8N_WEBHOOK_ENVIO_VENTAS || '',
      ventas_api: process.env.N8N_WEBHOOK_ENVIO_VENTAS_API || '',
      admin: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION || '',
      alumnos: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS || '',
      comunidad: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD || '',
    };

    const linea = conv.desconectado_wsp4 && conv.inbox_fijo 
      ? conv.inbox_fijo 
      : conv.linea_origen || 'wsp4';
    
    const webhookUrl = webhooks[linea] || webhooks.wsp4;

    if (!webhookUrl) {
      return NextResponse.json({ success: false, error: 'Webhook no configurado' }, { status: 500 });
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono, mensaje, conversacion_id: conv.id }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reenviando:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
