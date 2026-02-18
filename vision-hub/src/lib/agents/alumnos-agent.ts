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

interface DatosAlumnos {
  metricas: any;
  tendencias: any;
  cursos_ranking: any;
  cohortes_activas: any;
}

async function recolectarDatos(desde: string, hasta: string): Promise<DatosAlumnos> {
  const [metRes, tendRes, cursosRes, cohortesRes] = await Promise.all([
    supabase.rpc('get_alumnos_metricas_v2', {
      p_fecha_desde: desde,
      p_fecha_hasta: hasta,
    }),
    supabase.rpc('get_alumnos_tendencias', {
      p_fecha_desde: desde,
      p_fecha_hasta: hasta,
      p_agrupar_por: 'mes',
    }),
    supabase.rpc('get_cursos_ranking', {
      p_fecha_desde: desde,
      p_fecha_hasta: hasta,
      p_limite: 20,
    }),
    supabase
      .from('cursos_cohortes')
      .select('*')
      .gte('cohorte_anio', parseInt(desde.split('-')[0]))
      .order('cohorte_anio', { ascending: false })
      .order('cohorte_mes', { ascending: false }),
  ]);

  if (metRes.error) throw new Error(`Error metricas: ${metRes.error.message}`);
  if (tendRes.error) throw new Error(`Error tendencias: ${tendRes.error.message}`);
  if (cursosRes.error) throw new Error(`Error cursos: ${cursosRes.error.message}`);

  return {
    metricas: metRes.data,
    tendencias: tendRes.data,
    cursos_ranking: cursosRes.data,
    cohortes_activas: cohortesRes.data || [],
  };
}

function construirPrompt(datos: DatosAlumnos, desde: string, hasta: string): string {
  const hoy = new Date();
  const diaSemana = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"][hoy.getDay()];
  const diaNum = hoy.getDate();
  const mesNombre = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][hoy.getMonth()];

  return `Sos un analista académico experto trabajando para PSI Asociación, una institución educativa de salud mental en Argentina. La directora es Nina. Tu trabajo es analizar datos de alumnos y generar insights accionables enfocados en retención, finalización y salud académica.

## CONTEXTO DEL NEGOCIO
- PSI ofrece cursos de formación en salud mental (AT = Acompañante Terapéutico, Niñez, Adicciones, Psicología Social, Arteterapia, etc.)
- Cada curso tiene cohortes que abren en meses específicos (Enero, Abril, Agosto típicamente)
- Los alumnos tienen 3 estados posibles:
  - "activo": cursando actualmente
  - "finalizado": completó el curso (egresado)
  - "baja": abandonó el curso
- Tasa de finalización = finalizados / (finalizados + bajas) × 100. Una tasa < 50% es preocupante.
- Los datos de inscripciones vienen de inscripciones_psi (31,000+ registros históricos)
- Este dashboard es 100% ACADÉMICO. NO analices datos financieros, cuotas ni morosidad.

## DATOS DEL PERÍODO ANALIZADO (${desde} a ${hasta})

### Métricas generales (con comparación vs período anterior):
${JSON.stringify(datos.metricas, null, 2)}

### Tendencias mensuales:
${JSON.stringify(datos.tendencias, null, 2)}

### Ranking de cursos (solo cursos con cohortes activas):
${JSON.stringify(datos.cursos_ranking, null, 2)}

### Cohortes registradas:
${JSON.stringify(datos.cohortes_activas?.slice(0, 30), null, 2)}

## TU TAREA

Analizá los datos y generá entre 3 y 6 insights ACADÉMICOS. Cada insight DEBE tener los 3 componentes que pidió Nina:
1. **que_paso**: El dato concreto, con números. Ej: "La tasa de finalización del curso AT cayó del 62% al 48% en las últimas 3 cohortes"
2. **por_que**: Tu hipótesis de por qué está pasando. Basate en los datos, no inventes. Si no hay datos suficientes, decilo.
3. **que_hacer**: Acción concreta y priorizada que Nina puede ejecutar. No generalidades.

### Qué analizar:
- **Retención y abandono**: ¿Qué cursos tienen más bajas? ¿La tasa de finalización está subiendo o bajando? ¿Hay algún curso con abandono alarmante?
- **Patrones por cohorte**: ¿Las cohortes recientes tienen mejor o peor retención que las anteriores? ¿Algún mes de inicio tiene peor retención?
- **Cursos en riesgo**: ¿Hay cursos con muchos activos pero tasa de finalización baja? Esos alumnos podrían necesitar intervención.
- **Cursos estrella**: ¿Cuáles tienen mejor tasa de finalización? ¿Qué se puede aprender de ellos?
- **Tendencias de inscripción**: ¿Las inscripciones están creciendo o cayendo? ¿Hay estacionalidad?
- **Oportunidades de venta cruzada**: Egresados de un curso que podrían interesarse en otro relacionado.

### Tipos de insight:
- **alerta**: Curso con abandono disparado, caída fuerte de inscripciones, cohorte en riesgo
- **tendencia**: Patrón sostenido (mejora/deterioro de retención, estacionalidad)
- **oportunidad**: Egresados para venta cruzada, curso con demanda creciente
- **recomendacion**: Intervención preventiva, ajuste operativo

### Severidad:
- **critica**: Tasa finalización < 40% en curso activo, caída > 30% en inscripciones
- **alta**: Tasa finalización < 50%, abandono creciente
- **media**: Para planificar (optimización, venta cruzada)
- **info**: Para conocimiento (tendencia positiva, dato interesante)

### REGLAS:
- Hablá en español argentino, directo, sin tecnicismos innecesarios
- Sé específico: mencioná cursos por código, números exactos, porcentajes
- NO analices datos financieros (montos, cuotas, morosidad) — eso va en otro dashboard
- Priorizá lo que Nina puede ACCIONAR para mejorar la experiencia académica
- Compará siempre con el período anterior cuando haya datos
- Si ves oportunidad de venta cruzada entre cursos, mencionala
- Si un curso tiene 0 bajas, destacalo como caso de éxito

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

export async function ejecutarAgenteAlumnos(desde?: string, hasta?: string) {
  const hoy = new Date();
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1);

  const fechaDesde = desde || inicioAnio.toISOString().split('T')[0];
  const fechaHasta = hasta || hoy.toISOString().split('T')[0];

  const datos = await recolectarDatos(fechaDesde, fechaHasta);

  const prompt = construirPrompt(datos, fechaDesde, fechaHasta);

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  const responseText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  let insights: InsightGenerado[];
  try {
    const cleanJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    insights = JSON.parse(cleanJson);
  } catch (e) {
    console.error('Error parseando respuesta del agente alumnos:', responseText);
    throw new Error(`No se pudo parsear la respuesta de Claude: ${e}`);
  }

  if (!Array.isArray(insights) || insights.length === 0) {
    throw new Error('Claude no devolvió insights válidos');
  }

  // Marcar insights anteriores como no vigentes
  await supabase
    .from('agent_insights')
    .update({ vigente: false })
    .eq('area', 'alumnos')
    .eq('vigente', true);

  // Guardar nuevos
  const insightsParaGuardar = insights.map((insight) => ({
    area: 'alumnos',
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
