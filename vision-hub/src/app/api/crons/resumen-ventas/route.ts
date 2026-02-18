import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== 'Bearer ' + (process.env.CRON_SECRET || 'psi-cron-2026')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    console.log('[Cron Ventas] Iniciando resumen diario...');

    const hoy = new Date();
    const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0).toISOString();
    const finDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString();

    const { data: conversaciones, error: errConv } = await supabase
      .from('conversaciones')
      .select('id, telefono, created_at')
      .eq('area', 'ventas_api')
      .gte('created_at', inicioDelDia)
      .lte('created_at', finDelDia)
      .limit(100);

    if (errConv) throw errConv;

    if (!conversaciones || conversaciones.length === 0) {
      console.log('[Cron Ventas] No hay conversaciones hoy');
      return NextResponse.json({ success: true, message: 'Sin conversaciones hoy', procesadas: 0 });
    }

    const convIds = conversaciones.map(c => c.id);

    const { data: mensajes, error: errMsg } = await supabase
      .from('mensajes')
      .select('conversacion_id, contenido, tipo_remitente, created_at')
      .in('conversacion_id', convIds)
      .order('created_at', { ascending: true })
      .limit(2000);

    if (errMsg) throw errMsg;

    if (!mensajes || mensajes.length === 0) {
      return NextResponse.json({ success: true, message: 'Sin mensajes', procesadas: 0 });
    }

    const porConversacion: Record<string, string[]> = {};
    for (const m of mensajes) {
      if (!porConversacion[m.conversacion_id]) porConversacion[m.conversacion_id] = [];
      const remitente = m.tipo_remitente === 'contacto' ? 'Lead' : 'Vendedora';
      porConversacion[m.conversacion_id].push(remitente + ': ' + (m.contenido || '[archivo]'));
    }

    let textoConversaciones = '';
    let convIncluidas = 0;
    for (const [, msgs] of Object.entries(porConversacion)) {
      const bloque = '\n--- Conversación ' + (convIncluidas + 1) + ' ---\n' + msgs.join('\n');
      if (textoConversaciones.length + bloque.length > 8000) break;
      textoConversaciones += bloque;
      convIncluidas++;
    }

    console.log('[Cron Ventas] Analizando', convIncluidas, 'conversaciones');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: 'Sos un analista de ventas de PSI Asociación (organización educativa de salud mental en Argentina). Analizás conversaciones de leads que llegan por WhatsApp desde anuncios de Meta Ads. Respondé en español argentino, directo y accionable.',
      messages: [{
        role: 'user',
        content: 'Analizá estas ' + convIncluidas + ' conversaciones de hoy y generá un resumen con:\n1. Objeciones frecuentes\n2. Preguntas más comunes\n3. Cursos más consultados\n4. Patrones de respuesta de vendedoras\n5. Oportunidades de mejora\n\nConversaciones:\n' + textoConversaciones + '\n\nSé conciso. Máximo 500 palabras.'
      }],
    });

    const resumen = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    const fechaHoy = hoy.toISOString().split('T')[0];

    await supabase
      .from('pupi_conocimiento')
      .update({ activo: false })
      .eq('categoria', 'insights_ventas_dia')
      .like('titulo', '%' + fechaHoy + '%');

    await supabase.from('pupi_conocimiento').insert({
      categoria: 'insights_ventas_dia',
      titulo: 'Resumen Ventas API - ' + fechaHoy,
      contenido: resumen,
      fuente: 'sistema',
      activo: true,
    });

    console.log('[Cron Ventas] Resumen guardado:', resumen.length, 'chars');

    return NextResponse.json({
      success: true,
      conversaciones_procesadas: convIncluidas,
      mensajes_totales: mensajes.length,
      tokens: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    });
  } catch (error: any) {
    console.error('[Cron Ventas] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
