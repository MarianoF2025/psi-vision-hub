// ============================================
// PUPI — API ROUTE
// POST: chat conversacional
// GET: morning briefing
// PSI Vision Hub — Febrero 2026
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, MORNING_BRIEFING_PROMPT } from '@/lib/pupi/system-prompt';
import {
  cargarContextoCompleto,
  guardarConversacion,
  guardarDecision,
  guardarAprendizaje,
} from '@/lib/pupi/context-builder';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODELO = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;
const TEMPERATURA = 0.7;

// ============================================
// PARSEO DE BLOQUES ESPECIALES
// ============================================

interface DecisionDetectada {
  decision: string;
  contexto: string;
  resultado_esperado: string;
  fecha_seguimiento: string;
}

interface AprendizajeDetectado {
  tipo: 'correccion' | 'preferencia' | 'regla_negocio' | 'feedback';
  contenido: string;
  contexto: string;
}

function extraerDecisiones(texto: string): { textoLimpio: string; decisiones: DecisionDetectada[] } {
  const decisiones: DecisionDetectada[] = [];
  const regex = /\[DECISION_DETECTADA\]([\s\S]*?)\[\/DECISION_DETECTADA\]/g;

  let match;
  while ((match = regex.exec(texto)) !== null) {
    const bloque = match[1];
    const decision: Partial<DecisionDetectada> = {};

    const lineas = bloque.split('\n').filter(l => l.trim());
    for (const linea of lineas) {
      const [key, ...valueParts] = linea.split(':');
      const value = valueParts.join(':').trim();
      const k = key.trim().toLowerCase();

      if (k === 'decision') decision.decision = value;
      else if (k === 'contexto') decision.contexto = value;
      else if (k === 'resultado_esperado') decision.resultado_esperado = value;
      else if (k === 'fecha_seguimiento') decision.fecha_seguimiento = value;
    }

    if (decision.decision) {
      // Si no hay fecha de seguimiento, poner 5 días después
      if (!decision.fecha_seguimiento) {
        const d = new Date();
        d.setDate(d.getDate() + 5);
        decision.fecha_seguimiento = d.toISOString();
      }
      decisiones.push(decision as DecisionDetectada);
    }
  }

  const textoLimpio = texto.replace(regex, '').trim();
  return { textoLimpio, decisiones };
}

function extraerAprendizajes(texto: string): { textoLimpio: string; aprendizajes: AprendizajeDetectado[] } {
  const aprendizajes: AprendizajeDetectado[] = [];
  const regex = /\[APRENDIZAJE_DETECTADO\]([\s\S]*?)\[\/APRENDIZAJE_DETECTADO\]/g;

  let match;
  while ((match = regex.exec(texto)) !== null) {
    const bloque = match[1];
    const aprendizaje: Partial<AprendizajeDetectado> = {};

    const lineas = bloque.split('\n').filter(l => l.trim());
    for (const linea of lineas) {
      const [key, ...valueParts] = linea.split(':');
      const value = valueParts.join(':').trim();
      const k = key.trim().toLowerCase();

      if (k === 'tipo') aprendizaje.tipo = value as AprendizajeDetectado['tipo'];
      else if (k === 'contenido') aprendizaje.contenido = value;
      else if (k === 'contexto') aprendizaje.contexto = value;
    }

    if (aprendizaje.contenido) {
      aprendizajes.push({
        tipo: aprendizaje.tipo || 'feedback',
        contenido: aprendizaje.contenido,
        contexto: aprendizaje.contexto || '',
      });
    }
  }

  const textoLimpio = texto.replace(regex, '').trim();
  return { textoLimpio, aprendizajes };
}

// ============================================
// POST — Chat conversacional
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mensajes, usuario } = body;

    if (!mensajes || !Array.isArray(mensajes) || mensajes.length === 0) {
      return NextResponse.json({ error: 'Se requiere array de mensajes' }, { status: 400 });
    }

    const userEmail = usuario || 'nina@psi.com.ar';

    console.log(`[Pupy API] POST - ${mensajes.length} mensajes de ${userEmail}`);

    // 1. Cargar contexto completo en paralelo
    const contexto = await cargarContextoCompleto(userEmail);

    // 2. Construir system prompt dinámico
    const systemPrompt = buildSystemPrompt({
      insightsAgentes: contexto.insightsAgentes,
      datosMarketing: contexto.datosMarketing,
      datosVentas: contexto.datosVentas,
      datosAlumnos: contexto.datosAlumnos,
      memoriaConversaciones: contexto.memoriaConversaciones,
      aprendizajes: contexto.aprendizajes,
      decisionesPendientes: contexto.decisionesPendientes,
      knowledgeBase: contexto.knowledgeBase,
      actualizacionesExternas: contexto.actualizacionesExternas,
      resumenVentasApi: contexto.resumenVentasApi,
    });

    // 3. Preparar mensajes para Claude (con soporte multimodal)
    const claudeMessages = mensajes.map((m: any) => {
      const role = m.rol === 'user' ? 'user' as const : 'assistant' as const;

      // Si tiene contenido multimodal (imágenes/PDFs), armar bloques
      if (m.contenido_multimodal && Array.isArray(m.contenido_multimodal) && m.contenido_multimodal.length > 0) {
        const content: any[] = [];

        for (const parte of m.contenido_multimodal) {
          if (parte.type === 'image') {
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: parte.source.media_type,
                data: parte.source.data,
              }
            });
          } else if (parte.type === 'document') {
            content.push({
              type: 'document',
              source: {
                type: 'base64',
                media_type: parte.source.media_type,
                data: parte.source.data,
              }
            });
          } else if (parte.type === 'text') {
            content.push({ type: 'text', text: parte.text });
          }
        }

        // Si no hay texto en las partes multimodal pero sí en contenido, agregarlo
        if (m.contenido && !m.contenido_multimodal.some((p: any) => p.type === 'text')) {
          content.push({ type: 'text', text: m.contenido });
        }

        // Si solo hay archivos sin texto, agregar instrucción
        if (!content.some((c: any) => c.type === 'text')) {
          content.push({ type: 'text', text: 'Analizá este archivo.' });
        }

        return { role, content };
      }

      // Mensaje de texto simple
      return { role, content: m.contenido };
    });

    // 4. Llamar Claude Sonnet
    console.log(`[Pupy API] Llamando Claude Sonnet (${claudeMessages.length} mensajes, system prompt: ${Math.round(systemPrompt.length / 1000)}k chars)`);

    const response = await anthropic.messages.create({
      model: MODELO,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURA,
      system: systemPrompt,
      messages: claudeMessages,
    });

    let respuestaTexto = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    console.log(`[Pupy API] Respuesta recibida (${respuestaTexto.length} chars, ${response.usage.input_tokens} in / ${response.usage.output_tokens} out)`);

    // 5. Extraer y procesar decisiones y aprendizajes
    const { textoLimpio: sinDecisiones, decisiones } = extraerDecisiones(respuestaTexto);
    const { textoLimpio: textoFinal, aprendizajes } = extraerAprendizajes(sinDecisiones);

    // 6. Guardar decisiones y aprendizajes en background (no bloquear respuesta)
    if (decisiones.length > 0) {
      console.log(`[Pupy API] ${decisiones.length} decisiones detectadas`);
      for (const d of decisiones) {
        guardarDecision(d.decision, d.contexto, d.resultado_esperado, d.fecha_seguimiento).catch(console.error);
      }
    }

    if (aprendizajes.length > 0) {
      console.log(`[Pupy API] ${aprendizajes.length} aprendizajes detectados`);
      for (const a of aprendizajes) {
        guardarAprendizaje(a.tipo, a.contenido, a.contexto).catch(console.error);
      }
    }

    return NextResponse.json({
      success: true,
      respuesta: textoFinal,
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      decisiones_detectadas: decisiones.length,
      aprendizajes_detectados: aprendizajes.length,
    });
  } catch (error: any) {
    console.error('[Pupy API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

// ============================================
// GET — Morning Briefing
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usuario = searchParams.get('usuario') || 'nina@psi.com.ar';
    const modo = searchParams.get('modo');

    // ========== MODO HISTORIAL ==========
    if (modo === 'historial') {
      const limit = parseInt(searchParams.get('limit') || '20');
      console.log('[Pupy API] GET historial para', usuario);

      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await sb
        .from('pupi_conversaciones')
        .select('id, titulo, resumen, created_at')
        .eq('usuario', usuario)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return NextResponse.json({ success: true, conversaciones: data || [] });
    }

    // ========== MODO CARGAR CONVERSACIÓN ==========
    if (modo === 'cargar') {
      const convId = searchParams.get('id');
      if (!convId) {
        return NextResponse.json({ error: 'Se requiere id de conversación' }, { status: 400 });
      }

      console.log('[Pupy API] GET cargar conversación', convId);

      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await sb
        .from('pupi_conversaciones')
        .select('id, titulo, mensajes, created_at')
        .eq('id', convId)
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, conversacion: data });
    }

    // ========== MODO MORNING BRIEFING (default) ==========
    console.log('[Pupy API] GET Morning Briefing para', usuario);

    const contexto = await cargarContextoCompleto(usuario);

    const systemPrompt = buildSystemPrompt({
      insightsAgentes: contexto.insightsAgentes,
      datosMarketing: contexto.datosMarketing,
      datosVentas: contexto.datosVentas,
      datosAlumnos: contexto.datosAlumnos,
      memoriaConversaciones: contexto.memoriaConversaciones,
      aprendizajes: contexto.aprendizajes,
      decisionesPendientes: contexto.decisionesPendientes,
      knowledgeBase: contexto.knowledgeBase,
      actualizacionesExternas: contexto.actualizacionesExternas,
      resumenVentasApi: contexto.resumenVentasApi,
    });

    const hoy = new Date();
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    let userMessage = MORNING_BRIEFING_PROMPT + '\n\n';
    userMessage += 'Hoy es ' + dias[hoy.getDay()] + ' ' + hoy.getDate() + ' de ' + meses[hoy.getMonth()] + ' ' + hoy.getFullYear() + '.\n';

    if (contexto.ultimaConversacion) {
      const ultima = new Date(contexto.ultimaConversacion);
      const diffMs = hoy.getTime() - ultima.getTime();
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      userMessage += 'La última vez que hablamos fue hace ' + diffDias + ' día' + (diffDias !== 1 ? 's' : '') + '.\n';
    } else {
      userMessage += 'Esta es la primera vez que hablamos.\n';
    }

    console.log('[Pupy API] Generando morning briefing');

    const response = await anthropic.messages.create({
      model: MODELO,
      max_tokens: 2048,
      temperature: TEMPERATURA,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const briefing = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    console.log('[Pupy API] Morning briefing generado');

    return NextResponse.json({
      success: true,
      briefing,
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    });
  } catch (error: any) {
    console.error('[Pupy API] Error GET:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT — Guardar conversación al cerrar
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { mensajes, usuario } = body;

    if (!mensajes || mensajes.length < 2) {
      return NextResponse.json({ success: true, message: 'Conversación muy corta, no se guarda' });
    }

    const userEmail = usuario || 'nina@psi.com.ar';

    console.log(`[Pupy API] PUT - Guardando conversación (${mensajes.length} mensajes)`);

    // Generar título y resumen con Claude Haiku (rápido y barato)
    const resumenResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: 'Generás títulos y resúmenes de conversaciones en español argentino. Respondé SOLO con JSON válido, sin backticks ni texto adicional.',
      messages: [{
        role: 'user',
        content: `Generá un título corto (máx 60 chars) y un resumen (máx 200 chars) de esta conversación:\n\n${mensajes.map((m: any) => `${m.rol}: ${m.contenido}`).join('\n').substring(0, 3000)}\n\nFormato: {"titulo": "...", "resumen": "..."}`
      }],
    });

    const resumenTexto = resumenResponse.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    let titulo = 'Conversación con Nina';
    let resumen = '';

    try {
      const parsed = JSON.parse(resumenTexto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      titulo = parsed.titulo || titulo;
      resumen = parsed.resumen || '';
    } catch {
      console.warn('[Pupy API] No se pudo parsear resumen, usando default');
    }

    // Guardar
    const mensajesFormateados = mensajes.map((m: any) => ({
      rol: m.rol,
      contenido: m.contenido,
      timestamp: m.timestamp || new Date().toISOString(),
    }));

    await guardarConversacion(userEmail, mensajesFormateados, titulo, resumen);

    return NextResponse.json({
      success: true,
      titulo,
      resumen,
    });
  } catch (error: any) {
    console.error('[Pupy API] Error guardando conversación:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
