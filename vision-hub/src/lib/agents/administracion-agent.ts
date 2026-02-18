import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface InsightGenerado {
  tipo: 'alerta' | 'tendencia' | 'oportunidad' | 'recomendacion';
  severidad: 'critica' | 'alta' | 'media' | 'info';
  titulo: string;
  que_paso: string;
  por_que: string;
  que_hacer: string;
  datos_soporte: Record<string, any>;
}

interface DatosAdmin {
  facturacion: any;
  morosidad: any;
  cursos_cobro: any;
  tendencias: any;
}

async function recolectarDatos(desde: string, hasta: string): Promise<DatosAdmin> {
  const [metRes, tendRes, cursosRes] = await Promise.all([
    supabase.rpc('get_ventas_metricas', {
      p_fecha_desde: desde,
      p_fecha_hasta: hasta,
    }),
    supabase.rpc('get_ventas_tendencias', {
      p_fecha_desde: desde,
      p_fecha_hasta: hasta,
      p_agrupacion: 'mes',
    }),
    supabase.rpc('get_ventas_cursos_detalle', {
      p_fecha_desde: desde,
      p_fecha_hasta: hasta,
    }),
  ]);

  // Datos de morosidad directo de la tabla
  const { data: morosos } = await supabase
    .from('inscripciones_psi')
    .select('curso_codigo, cuotas_total, cuotas_pagadas, monto_total, monto_pagado, estado')
    .eq('estado', 'activo')
    .gt('cuotas_total', 0)
    .gte('fecha_inscripcion', desde)
    .lte('fecha_inscripcion', hasta);

  const morosidadPorCurso: Record<string, { total: number; morosos: number; brecha: number }> = {};
  if (morosos) {
    for (const m of morosos) {
      if (!morosidadPorCurso[m.curso_codigo]) {
        morosidadPorCurso[m.curso_codigo] = { total: 0, morosos: 0, brecha: 0 };
      }
      morosidadPorCurso[m.curso_codigo].total++;
      if (m.cuotas_pagadas < m.cuotas_total) {
        morosidadPorCurso[m.curso_codigo].morosos++;
        morosidadPorCurso[m.curso_codigo].brecha += (m.monto_total - m.monto_pagado);
      }
    }
  }

  return {
    facturacion: metRes.data || {},
    morosidad: morosidadPorCurso,
    cursos_cobro: cursosRes.data || [],
    tendencias: tendRes.data || [],
  };
}

function construirPrompt(datos: DatosAdmin, desde: string, hasta: string): string {
  const hoy = new Date();
  const diaSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][hoy.getDay()];
  const diaNum = hoy.getDate();
  const mesNombre = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][hoy.getMonth()];

  return `Sos un analista financiero y administrativo experto trabajando para PSI Asociación, una institución educativa de salud mental en Argentina. La directora es Nina. Hoy es ${diaSemana} ${diaNum} de ${mesNombre} de ${hoy.getFullYear()}.

## CONTEXTO DEL NEGOCIO
- PSI vende cursos de formación en salud mental
- Los alumnos pagan cuotas mensuales
- "Vendido" (monto_total) = precio completo del curso al inscribirse
- "Cobrado" (monto_pagado) = lo que efectivamente pagaron hasta hoy
- Tasa de cobro = cobrado / vendido × 100. Debajo de 60% es crítico.
- Moroso = alumno activo que tiene cuotas_pagadas < cuotas_total
- Brecha = vendido - cobrado = plata que falta cobrar
- Los registros con monto_total = 0 son errores del sistema (coinciden con "finalizados"), se excluyen del análisis
- Moneda: pesos argentinos (ARS)

## DATOS DEL PERÍODO (${desde} a ${hasta})

### Facturación general:
${JSON.stringify(datos.facturacion, null, 2)}

### Morosidad por curso (solo activos con cuotas):
${JSON.stringify(datos.morosidad, null, 2)}

### Detalle por curso:
${JSON.stringify(datos.cursos_cobro, null, 2)}

### Tendencias mensuales:
${JSON.stringify(datos.tendencias, null, 2)}

## TU TAREA

Generá entre 3 y 5 insights FINANCIEROS/ADMINISTRATIVOS. Cada insight DEBE tener:
1. **que_paso**: Dato concreto con montos en pesos
2. **por_que**: Hipótesis basada en datos
3. **que_hacer**: Acción concreta para Nina

### Qué analizar:
- **Tasa de cobro**: ¿Cuánto vendimos vs cuánto cobramos? ¿Está mejorando o empeorando?
- **Brecha de cobro**: ¿Cuántos pesos faltan cobrar? ¿En qué cursos está concentrada?
- **Morosos por curso**: ¿Qué cursos tienen más morosos? ¿Cuántos deben 1 cuota vs 2+ cuotas?
- **Tendencia de facturación**: ¿Los ingresos mensuales suben o bajan?
- **Cursos más rentables vs menos rentables**: Relación entre inscripciones, monto vendido y cobrado
- **Alertas de cobro**: Cursos donde la brecha crece, meses con caída fuerte

### Contexto temporal:
- Si es principio de mes: alertar sobre cuotas que se vencen
- Si es fin de mes: cerrar el mes con resumen de facturación
- Siempre comparar con el mes/período anterior

### REGLAS:
- Español argentino, directo
- Montos siempre en pesos con formato (ej: $4.035.200)
- Sé específico: cursos, montos exactos, cantidad de morosos
- Priorizá la brecha de cobro — es la plata que PSI ya vendió pero no cobró
- Si la tasa de cobro general es < 40%, es CRÍTICO

Respondé SOLO con JSON válido, sin markdown, sin backticks:

[
  {
    "tipo": "alerta|tendencia|oportunidad|recomendacion",
    "severidad": "critica|alta|media|info",
    "titulo": "Título corto",
    "que_paso": "Dato concreto",
    "por_que": "Hipótesis",
    "que_hacer": "Acción concreta",
    "datos_soporte": {}
  }
]`;
}

export async function ejecutarAgenteAdmin(desde?: string, hasta?: string) {
  const hoy = new Date();
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1);

  const fechaDesde = desde || inicioAnio.toISOString().split('T')[0];
  const fechaHasta = hasta || hoy.toISOString().split('T')[0];

  const datos = await recolectarDatos(fechaDesde, fechaHasta);
  const prompt = construirPrompt(datos, fechaDesde, fechaHasta);

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  let insights: InsightGenerado[];
  try {
    const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    insights = JSON.parse(cleanJson);
  } catch (e) {
    console.error('Error parseando respuesta admin:', responseText);
    throw new Error(`No se pudo parsear la respuesta: ${e}`);
  }

  if (!Array.isArray(insights) || insights.length === 0) {
    throw new Error('No se generaron insights válidos');
  }

  await supabase.from('agent_insights').update({ vigente: false }).eq('area', 'administracion').eq('vigente', true);

  const insightsParaGuardar = insights.map((insight) => ({
    area: 'administracion',
    tipo: insight.tipo,
    severidad: insight.severidad,
    titulo: insight.titulo,
    que_paso: insight.que_paso,
    por_que: insight.por_que,
    que_hacer: insight.que_hacer,
    datos_soporte: insight.datos_soporte || {},
    periodo_analizado: { desde: fechaDesde, hasta: fechaHasta },
    modelo: 'claude-haiku-4-5',
    vigente: true,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }));

  const { data: saved, error: saveError } = await supabase.from('agent_insights').insert(insightsParaGuardar).select();
  if (saveError) throw new Error(`Error guardando: ${saveError.message}`);

  return {
    success: true,
    insights_generados: saved?.length || 0,
    periodo: { desde: fechaDesde, hasta: fechaHasta },
    modelo: 'claude-haiku-4-5',
    tokens_usados: { input: message.usage.input_tokens, output: message.usage.output_tokens },
  };
}
