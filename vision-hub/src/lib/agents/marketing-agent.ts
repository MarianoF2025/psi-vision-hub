import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// SYSTEM PROMPT v4
// ============================================

const SYSTEM_PROMPT = `Sos el agente de marketing de PSI Asociación. Analizás datos de Meta Ads y generás insights para Nina, la directora.

Internamente pensás como media buyer experto. Pero escribís para Nina, que NO sabe de publicidad digital.

## PSI EN RESUMEN

PSI forma auxiliares en salud mental (cursos online: AT, Niñez, Psicodrama). Argentina + LATAM. Moneda: USD.

Público: NO profesionales. Dos perfiles:
1. Familiares desbordados (madres, padres, hijos que cuidan) que no saben cómo ayudar.
2. Personas buscando salida laboral en cuidado/acompañamiento.

Motor de ventas: anuncios de WhatsApp (lead hace clic → abre WhatsApp → vendedora atiende).
Comunidad: branding, no venta directa.
Estacionalidad: oct-ene fuerte, feb-mar transición, abr-may segundo período.

## BENCHMARKS PSI (anuncios de WhatsApp)
- Costo por consulta objetivo: $0.30 - $0.50
- Excelente: < $0.25
- Alerta: > $0.60
- Frecuencia saludable: < 2.5

## QUÉ ANALIZAR
1. Anuncios agotados (la gente los vio muchas veces, bajan los clics)
2. Anuncios ganadores que deberían tener más presupuesto
3. Anuncios gastando sin generar consultas
4. Publicidad desperdigada vs concentrada
5. Costo por consulta subiendo o bajando
6. Oportunidades: reactivar, probar ángulos nuevos, estacionalidad

## REGLAS DE OPTIMIZACIÓN (para tu análisis, NO uses estos términos con Nina)
- Meta necesita creatividades variadas (8-15 conceptos distintos).
- Pocas campañas, pocos grupos, muchos anuncios.
- Si un anuncio gastó el doble del objetivo sin resultado → cortarlo.
- Si un anuncio tiene 10+ consultas al costo objetivo → es ganador.
- Subir presupuesto de a poco (+20% cada 1-2 días).
- Frecuencia > 3.5 + clics cayendo = anuncio agotado.

## OUTPUT

Array JSON. Máximo 6 insights. SIN texto fuera del JSON. SIN backticks markdown.

{"tipo":"alerta|oportunidad|resumen","severidad":"critica|media|info","titulo":"corto","que_paso":"datos con números","por_que":"explicación","que_hacer":"acción concreta","datos_soporte":{"campaign_ids":[],"metricas":{}}}

LÍMITES: titulo ≤80 chars, que_paso ≤250 chars, por_que ≤200 chars, que_hacer ≤250 chars.

## REGLAS DE IDIOMA — LO MÁS IMPORTANTE

Escribís para Nina. Ella es inteligente pero no sabe de publicidad digital. Cada insight tiene que sonar como se lo explicarías a una amiga empresaria tomando un café.

REGLA 1: Nunca uses una sigla o término técnico solo. SIEMPRE poné la explicación en español al lado.
Ejemplos correctos:
- "El costo por consulta (lo que nos sale cada persona que nos escribe por WhatsApp) fue de $0.48"
- "La frecuencia (cantidad de veces que la misma persona vio nuestro anuncio) subió a 3.8"
- "Hay que concentrar los grupos de anuncios (en vez de tener 23 grupos desperdigados, dejar 2-3)"
- "Los 3 anuncios que mejor funcionaron están pausados desde enero"
- "Invertimos $1,404 dólares y nos escribieron 2,923 personas por WhatsApp"

Ejemplos INCORRECTOS (nunca hagas esto):
- "CPL $0.48" → MAL, Nina no sabe qué es CPL
- "Estructura ABO fragmentada" → MAL, Nina no sabe qué es ABO
- "Learning phase de 48h" → MAL
- "Winners de enero" → MAL, hablar en español
- "Funnel roto" → MAL

REGLA 2: Nunca pongas IDs de Meta (números largos como 120235305056940490) en titulo, que_paso, por_que ni que_hacer. Solo en datos_soporte.

REGLA 3: Nombrá los anuncios por su nombre visible: "el video reel 2", "la animación versión 2".

REGLA 4: Las acciones en que_hacer deben ser cosas que Nina pueda pedir o hacer: "Pedile a Ángel que reactive...", "Revisá con Sofía si...", "Esta semana hay que..."

REGLA 5: Tono cálido, directo, argentino. Nada de informes técnicos.`;

// ============================================
// RECOLECCIÓN DE DATOS
// ============================================

interface DatosMarketing {
  kpis: any;
  campanas: any;
  ads_performance: any;
  ads_trends: any;
  estructura: any;
  insights_previos: any[];
}

async function recolectarDatos(desde: string, hasta: string): Promise<DatosMarketing> {
  const hastaDate = new Date(hasta);
  const trendDesde = new Date(hastaDate);
  trendDesde.setDate(trendDesde.getDate() - 7);
  const trendDesdeStr = trendDesde.toISOString().split('T')[0];

  const [kpisRes, campanasRes, adsRes, trendsRes, estructuraRes, insightsPreviosRes] = await Promise.all([
    supabase.rpc('get_marketing_kpis', { fecha_desde: desde, fecha_hasta: hasta }),
    supabase.rpc('get_marketing_campanas', { fecha_desde: desde, fecha_hasta: hasta }),
    supabase.rpc('get_marketing_ads_performance', { fecha_desde: desde, fecha_hasta: hasta, limite: 15 }),
    supabase.rpc('get_marketing_ads_trends', { fecha_desde: trendDesdeStr, fecha_hasta: hasta }),
    supabase.rpc('get_marketing_estructura'),
    supabase
      .from('agent_insights')
      .select('titulo, tipo, severidad, que_paso, created_at')
      .eq('area', 'marketing')
      .eq('vigente', true)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    kpis: kpisRes.data || {},
    campanas: campanasRes.data || {},
    ads_performance: adsRes.data || {},
    ads_trends: trendsRes.data || {},
    estructura: estructuraRes.data || {},
    insights_previos: insightsPreviosRes.data || [],
  };
}

// ============================================
// PROMPT DE USUARIO
// ============================================

function construirUserPrompt(datos: DatosMarketing, desde: string, hasta: string): string {
  const hoy = new Date();
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  let previos = 'Ninguno.';
  if (datos.insights_previos.length > 0) {
    previos = datos.insights_previos.map((i) => `- [${i.severidad}] ${i.titulo}`).join('\n');
  }

  return `Hoy: ${dias[hoy.getDay()]} ${hoy.getDate()} de ${meses[hoy.getMonth()]} ${hoy.getFullYear()}.

Insights vigentes (no repetir):
${previos}

Datos del período ${desde} a ${hasta}:

KPIs:
${JSON.stringify(datos.kpis, null, 2)}

Campañas:
${JSON.stringify(datos.campanas, null, 2)}

Anuncios (top 15):
${JSON.stringify(datos.ads_performance, null, 2)}

Tendencias 7 días:
${JSON.stringify(datos.ads_trends, null, 2)}

Estructura:
${JSON.stringify(datos.estructura, null, 2)}

Generá los insights. Máximo 6. Compactos. Español argentino. Explicá cada término técnico entre paréntesis.`;
}

// ============================================
// POST-PROCESAMIENTO: limpiar jerga que se escape
// ============================================

function limpiarParaNina(texto: string): string {
  if (!texto) return '';

  let limpio = texto;

  // Sacar IDs de Meta
  limpio = limpio.replace(/\[?\d{15,}\]?/g, '').replace(/\s{2,}/g, ' ');

  // Reemplazar siglas sueltas (sin explicación al lado)
  const reemplazos: [RegExp, string][] = [
    [/\bCPL\b(?!\s*\()/g, 'costo por consulta'],
    [/\bCTR\b(?!\s*\()/g, 'porcentaje de clics'],
    [/\bCPC\b(?!\s*\()/g, 'costo por clic'],
    [/\bCPM\b(?!\s*\()/g, 'costo por mil impresiones'],
    [/\bROAS\b(?!\s*\()/g, 'retorno por dólar invertido'],
    [/\bCBO\b(?!\s*\()/g, 'campaña con presupuesto automático'],
    [/\bABO\b(?!\s*\()/g, 'campaña con presupuesto por grupo'],
    [/\bad sets?\b/gi, 'grupos de anuncios'],
    [/\blearning phase\b/gi, 'período de aprendizaje'],
    [/\bbudget bumps?\b/gi, 'aumento gradual de presupuesto'],
    [/\bbroad targeting\b/gi, 'audiencia amplia'],
    [/\bcreative fatigue\b/gi, 'agotamiento del anuncio'],
    [/\bwinners?\b/gi, 'anuncios ganadores'],
    [/\bspend\b/gi, 'inversión'],
    [/\bfunnel\b/gi, 'proceso de venta'],
    [/\bCTWA\b(?!\s*\()/g, 'anuncios de WhatsApp'],
    [/\bscaling\b/gi, 'escalar'],
    [/\btesting\b/gi, 'prueba'],
    [/\bAndromeda\b/gi, 'el algoritmo de Meta'],
    [/\bTRIM THE FAT\b/gi, 'recortar lo que no funciona'],
    [/\bOUTCOME_LEADS\b/g, 'campaña de captación'],
    [/\bOUTCOME_SALES\b/g, 'campaña de ventas'],
    [/\bfrequency\b/gi, 'frecuencia'],
  ];

  for (const [regex, reemplazo] of reemplazos) {
    limpio = limpio.replace(regex, reemplazo);
  }

  return limpio.trim();
}

// ============================================
// EJECUTAR
// ============================================

export async function ejecutarAgenteMarketing(desde?: string, hasta?: string) {
  const hoy = new Date();
  const hace30dias = new Date(hoy);
  hace30dias.setDate(hace30dias.getDate() - 30);

  const fechaDesde = desde || hace30dias.toISOString().split('T')[0];
  const fechaHasta = hasta || hoy.toISOString().split('T')[0];

  console.log(`[Marketing Agent] Ejecutando análisis ${fechaDesde} → ${fechaHasta}`);

  const datos = await recolectarDatos(fechaDesde, fechaHasta);
  console.log(`[Marketing Agent] Datos: ${datos.campanas?.campanas?.length || 0} campañas, ${datos.ads_performance?.ads?.length || 0} anuncios`);

  const userPrompt = construirUserPrompt(datos, fechaDesde, fechaHasta);

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const responseText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  let insights: any[];
  try {
    let cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    if (!cleanJson.endsWith(']')) {
      const lastComplete = cleanJson.lastIndexOf('}');
      if (lastComplete > 0) cleanJson = cleanJson.substring(0, lastComplete + 1) + ']';
    }
    insights = JSON.parse(cleanJson);
  } catch (e) {
    console.error('[Marketing Agent] Parse error. First 300:', responseText.substring(0, 300));
    throw new Error(`No se pudo parsear la respuesta del agente: ${e}`);
  }

  if (!Array.isArray(insights) || insights.length === 0) {
    throw new Error('El agente no generó insights válidos');
  }

  // Post-procesar: limpiar jerga y IDs
  insights = insights.map((ins: any) => ({
    ...ins,
    titulo: limpiarParaNina(ins.titulo),
    que_paso: limpiarParaNina(ins.que_paso),
    por_que: limpiarParaNina(ins.por_que),
    que_hacer: limpiarParaNina(ins.que_hacer),
  }));

  console.log(`[Marketing Agent] ${insights.length} insights generados y limpiados`);

  await supabase.from('agent_insights').update({ vigente: false }).eq('area', 'marketing').eq('vigente', true);

  const insightsParaGuardar = insights.map((insight: any) => ({
    area: 'marketing',
    tipo: insight.tipo || 'resumen',
    severidad: insight.severidad || 'info',
    titulo: insight.titulo,
    que_paso: insight.que_paso,
    por_que: insight.por_que,
    que_hacer: insight.que_hacer,
    datos_soporte: insight.datos_soporte || {},
    periodo_analizado: { desde: fechaDesde, hasta: fechaHasta },
    modelo: 'claude-haiku-4-5',
    vigente: true,
    expires_at: calcularExpiracion(insight.severidad),
  }));

  const { data: saved, error: saveError } = await supabase.from('agent_insights').insert(insightsParaGuardar).select();
  if (saveError) throw new Error(`Error guardando insights: ${saveError.message}`);

  console.log(`[Marketing Agent] ${saved?.length || 0} insights guardados`);

  return {
    success: true,
    insights_generados: saved?.length || 0,
    periodo: { desde: fechaDesde, hasta: fechaHasta },
    modelo: 'claude-haiku-4-5',
    tokens_usados: { input: message.usage.input_tokens, output: message.usage.output_tokens },
  };
}

function calcularExpiracion(severidad: string): string {
  const ahora = Date.now();
  switch (severidad) {
    case 'critica': return new Date(ahora + 24 * 60 * 60 * 1000).toISOString();
    case 'media': return new Date(ahora + 48 * 60 * 60 * 1000).toISOString();
    default: return new Date(ahora + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}
