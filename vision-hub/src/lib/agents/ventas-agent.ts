import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Tipos ───
interface InsightGenerado {
  tipo: 'alerta' | 'tendencia' | 'oportunidad' | 'recomendacion';
  severidad: 'critica' | 'alta' | 'media' | 'info';
  titulo: string;
  que_paso: string;
  por_que: string;
  que_hacer: string;
  datos_soporte: Record<string, any>;
}

interface DatosVentas {
  metricas: any;
  tendencias: any;
  cursos_detalle: any;
}

// ─── Recolectar datos ───
async function recolectarDatos(desde: string, hasta: string): Promise<DatosVentas> {
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

  if (metRes.error) throw new Error(`Error metricas: ${metRes.error.message}`);
  if (tendRes.error) throw new Error(`Error tendencias: ${tendRes.error.message}`);
  if (cursosRes.error) throw new Error(`Error cursos: ${cursosRes.error.message}`);

  return {
    metricas: metRes.data,
    tendencias: tendRes.data,
    cursos_detalle: cursosRes.data,
  };
}

// ─── Construir prompt ───
function construirPrompt(datos: DatosVentas, desde: string, hasta: string): string {
  return `Sos un analista de datos experto trabajando para PSI Asociación, una institución educativa de salud mental en Argentina. La directora es Nina. Tu trabajo es analizar datos de ventas (inscripciones a cursos) y generar insights accionables.

## CONTEXTO DEL NEGOCIO
- PSI vende cursos de formación en salud mental (AT = Acompañante Terapéutico, Niñez, Adicciones, Psicología, etc.)
- Cada curso tiene cohortes mensuales
- Los alumnos pagan cuotas mensuales
- "Vendido" = monto total de inscripciones. "Cobrado" = lo que efectivamente se pagó.
- Tasa de cobro baja (<60%) = problema de cobranza
- Morosos = alumnos que deben cuotas según su antigüedad
- Bajas = alumnos que abandonaron el curso
- Los datos vienen de inscripciones_psi (31,000+ registros históricos)

## DATOS DEL PERÍODO ANALIZADO (${desde} a ${hasta})

### Métricas generales:
${JSON.stringify(datos.metricas, null, 2)}

### Tendencias mensuales:
${JSON.stringify(datos.tendencias, null, 2)}

### Detalle por curso:
${JSON.stringify(datos.cursos_detalle, null, 2)}

## TU TAREA

Analizá los datos y generá entre 3 y 6 insights. Cada insight DEBE tener los 3 componentes que pidió Nina:
1. **que_paso**: El dato concreto, con números. Ej: "Las inscripciones cayeron un 23% respecto al período anterior"
2. **por_que**: Tu hipótesis de por qué está pasando. Basate en los datos, no inventes. Si no hay datos suficientes, decilo.
3. **que_hacer**: Acción concreta y priorizada que Nina puede ejecutar. No generalidades.

### Tipos de insight:
- **alerta**: Algo que requiere atención inmediata (caída de inscripciones, tasa de cobro baja, morosos creciendo)
- **tendencia**: Patrón que se mantiene en el tiempo (curso creciendo, estacionalidad)
- **oportunidad**: Algo que se podría aprovechar (curso con alta demanda, venta cruzada)
- **recomendacion**: Mejora operativa sugerida

### Severidad:
- **critica**: Requiere acción hoy (pérdida de ingresos activa, tasa cobro < 40%)
- **alta**: Requiere acción esta semana
- **media**: Para planificar
- **info**: Para conocimiento

### REGLAS:
- Hablá en español argentino, directo, sin tecnicismos innecesarios
- Sé específico: mencioná cursos por código, montos exactos, porcentajes
- No repitas lo obvio (si inscripciones = 500, no digas "hubo 500 inscripciones" como insight)
- Priorizá lo que Nina puede ACCIONAR
- Si la tasa de cobro es baja, calculá la brecha exacta en pesos
- Si un curso tiene muchos morosos, mencionalo
- Si hay datos de conversión (leads → inscriptos), analizalos
- Compará siempre con el período anterior cuando haya datos

Respondé SOLO con un JSON válido, sin markdown, sin backticks, sin explicación. El formato:

[
  {
    "tipo": "alerta|tendencia|oportunidad|recomendacion",
    "severidad": "critica|alta|media|info",
    "titulo": "Título corto y claro",
    "que_paso": "Dato concreto con números",
    "por_que": "Hipótesis basada en datos",
    "que_hacer": "Acción concreta para Nina",
    "datos_soporte": {"clave": "valor relevante"}
  }
]`;
}

// ─── Ejecutar agente ───
export async function ejecutarAgenteVentas(desde?: string, hasta?: string) {
  const hoy = new Date();
  const hace90dias = new Date(hoy);
  hace90dias.setDate(hace90dias.getDate() - 90);

  const fechaDesde = desde || hace90dias.toISOString().split('T')[0];
  const fechaHasta = hasta || hoy.toISOString().split('T')[0];

  // 1. Recolectar datos
  const datos = await recolectarDatos(fechaDesde, fechaHasta);

  // 2. Construir prompt
  const prompt = construirPrompt(datos, fechaDesde, fechaHasta);

  // 3. Llamar a Claude
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  // 4. Parsear respuesta
  const responseText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  let insights: InsightGenerado[];
  try {
    // Limpiar posibles backticks o texto extra
    const cleanJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    insights = JSON.parse(cleanJson);
  } catch (e) {
    console.error('Error parseando respuesta del agente:', responseText);
    throw new Error(`No se pudo parsear la respuesta de Claude: ${e}`);
  }

  if (!Array.isArray(insights) || insights.length === 0) {
    throw new Error('Claude no devolvió insights válidos');
  }

  // 5. Marcar insights anteriores como no vigentes
  await supabase
    .from('agent_insights')
    .update({ vigente: false })
    .eq('area', 'ventas')
    .eq('vigente', true);

  // 6. Guardar nuevos insights
  const insightsParaGuardar = insights.map((insight) => ({
    area: 'ventas',
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

  const { data: saved, error: saveError } = await supabase
    .from('agent_insights')
    .insert(insightsParaGuardar)
    .select();

  if (saveError) {
    throw new Error(`Error guardando insights: ${saveError.message}`);
  }

  return {
    success: true,
    insights_generados: saved?.length || 0,
    periodo: { desde: fechaDesde, hasta: fechaHasta },
    modelo: 'claude-haiku-4-5',
    tokens_usados: {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
    },
  };
}
