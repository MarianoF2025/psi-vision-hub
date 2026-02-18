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
    console.log('[Cron Ecosistema] Buscando novedades...');

    const hoy = new Date();
    const mesActual = hoy.toLocaleString('en-US', { month: 'long' });
    const anio = hoy.getFullYear();

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: 'Sos un analista de marketing digital especializado en Meta Ads. Buscás novedades recientes del ecosistema Meta Ads, Andromeda y WhatsApp Business API. Respondé SOLO con JSON válido, sin backticks ni texto adicional. Si no hay novedades relevantes, respondé con un array vacío [].',
      messages: [{
        role: 'user',
        content: 'Buscá novedades recientes (últimas 2 semanas) sobre:\n1. Cambios en Meta Ads (funcionalidades, deprecaciones, API)\n2. Actualizaciones de Andromeda (motor de distribución)\n3. Cambios en WhatsApp Business API (ventanas, costos)\n4. Cambios de políticas de Meta\n\nTemas: Meta Ads changes ' + mesActual + ' ' + anio + ', Andromeda update, WhatsApp Business API changes\n\nPara cada novedad:\n- tema: "meta_ads" | "andromeda" | "whatsapp_api" | "politica_meta"\n- titulo: título corto\n- contenido: resumen 2-3 oraciones\n- relevancia_psi: cómo impacta a organización educativa que usa CTWA\n\nFormato: [{"tema":"...","titulo":"...","contenido":"...","relevancia_psi":"..."}]\nSi no hay novedades: []'
      }],
    });

    const textoRespuesta = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    let novedades: any[] = [];
    try {
      novedades = JSON.parse(textoRespuesta.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      if (!Array.isArray(novedades)) novedades = [];
    } catch {
      novedades = [];
    }

    if (novedades.length === 0) {
      console.log('[Cron Ecosistema] Sin novedades relevantes');
      return NextResponse.json({ success: true, message: 'Sin novedades', novedades: 0 });
    }

    // Marcar viejas como no vigentes (>14 días)
    const hace14Dias = new Date();
    hace14Dias.setDate(hace14Dias.getDate() - 14);
    await supabase
      .from('pupi_actualizaciones')
      .update({ vigente: false })
      .lt('created_at', hace14Dias.toISOString());

    let insertadas = 0;
    for (const novedad of novedades) {
      const { data: existente } = await supabase
        .from('pupi_actualizaciones')
        .select('id')
        .eq('titulo', novedad.titulo)
        .eq('vigente', true)
        .limit(1);

      if (existente && existente.length > 0) continue;

      const { error } = await supabase.from('pupi_actualizaciones').insert({
        tema: novedad.tema || 'meta_ads',
        titulo: novedad.titulo,
        contenido: novedad.contenido,
        url_fuente: novedad.url_fuente || '',
        relevancia_psi: novedad.relevancia_psi || '',
        vigente: true,
      });

      if (!error) insertadas++;
    }

    console.log('[Cron Ecosistema]', insertadas, 'novedades insertadas de', novedades.length);

    return NextResponse.json({
      success: true,
      novedades_encontradas: novedades.length,
      novedades_insertadas: insertadas,
      tokens: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    });
  } catch (error: any) {
    console.error('[Cron Ecosistema] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
