import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PAYMENTS_API = process.env.PAYMENTS_API_URL || 'http://localhost:3005';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      provider, monto, moneda, descripcion, 
      contacto_id, cliente, dias_vencimiento,
      enviar_whatsapp = true 
    } = body;

    let contactoId = contacto_id;
    if (!contactoId && cliente?.telefono) {
      const telefono = cliente.telefono.startsWith('+') 
        ? cliente.telefono 
        : '+' + cliente.telefono.replace(/\D/g, '');
      
      const { data: existente } = await supabase
        .from('contactos')
        .select('id')
        .eq('telefono', telefono)
        .single();
      
      if (existente) {
        contactoId = existente.id;
      } else {
        const { data: nuevo } = await supabase
          .from('contactos')
          .insert({ telefono, nombre: cliente.nombre, origen: 'pago' })
          .select('id')
          .single();
        contactoId = nuevo?.id;
      }
    }

    const res = await fetch(PAYMENTS_API + '/api/pagos/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        monto,
        moneda: moneda || 'ARS',
        descripcion,
        contacto_id: contactoId,
        cliente: {
          nombre: cliente?.nombre || 'Cliente',
          telefono: cliente?.telefono,
          email: cliente?.email,
        },
        dias_vencimiento: dias_vencimiento || 7,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      return NextResponse.json({ success: false, error: data.error }, { status: 400 });
    }

    let mensajeEnviado = false;
    if (enviar_whatsapp && cliente?.telefono && data.pago?.link_pago) {
      try {
        const telefono = cliente.telefono.startsWith('+') 
          ? cliente.telefono 
          : '+' + cliente.telefono.replace(/\D/g, '');

        const { data: conv } = await supabase
          .from('conversaciones')
          .select('id, linea_origen, inbox_fijo, desconectado_wsp4')
          .eq('telefono', telefono)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (conv) {
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

          if (webhookUrl) {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                telefono,
                mensaje: data.mensaje_whatsapp,
                conversacion_id: conv.id,
              }),
            });
            mensajeEnviado = true;
          }
        }
      } catch (e) {
        console.error('Error enviando WhatsApp:', e);
      }
    }

    return NextResponse.json({ 
      success: true, 
      pago: data.pago,
      mensaje_enviado: mensajeEnviado,
    });
  } catch (error) {
    console.error('Error creando pago:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
