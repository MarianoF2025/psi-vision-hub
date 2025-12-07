import { NextRequest, NextResponse } from 'next/server';

const WEBHOOKS: Record<string, string> = {
  wsp4: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_CRM || '',
  ventas: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1 || '',
  alumnos: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS || '',
  admin: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION || '',
  comunidad: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD || '',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telefono, mensaje, conversacion_id, linea_origen, inbox_fijo, desconectado_wsp4, respuesta_a } = body;

    if (!telefono || !mensaje) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Determinar webhook: si está desconectado usa inbox_fijo, sino linea_origen
    let webhookKey = linea_origen || 'wsp4';
    if (desconectado_wsp4 && inbox_fijo) {
      webhookKey = inbox_fijo;
    }

    const webhookUrl = WEBHOOKS[webhookKey];
    if (!webhookUrl) {
      return NextResponse.json({ error: `Webhook no configurado para: ${webhookKey}` }, { status: 500 });
    }

    // Enviar al webhook de n8n
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefono,
        mensaje,
        conversacion_id,
        respuesta_a,
        origen: 'crm',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error en webhook:', errorText);
      return NextResponse.json({ error: 'Error enviando mensaje', details: errorText }, { status: 500 });
    }

    const result = await response.json().catch(() => ({ success: true }));
    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('Error en API enviar:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
