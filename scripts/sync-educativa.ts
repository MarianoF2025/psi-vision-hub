/**
 * Sincronización Educativa SOAP → Supabase
 * Uso: npx tsx /opt/psi-vision-hub/scripts/sync-educativa.ts
 *
 * Sincroniza:
 * - Avances de alumnos (consultar_usuarios_con_avances)
 * - Estructura de unidades (obtener_unidades_grupo)
 * - Uso del aula por alumno (consultar_tiempo_estimado_uso_aula)
 * - Avance por unidad por alumno (obtener_avance_usuario_unidad)
 * Para todas las cohortes activas (2025+)
 */

import { createClient } from '@supabase/supabase-js';
import https from 'https';

// Config
const SUPABASE_URL = 'https://rbtczzjlvnymylkvcwdv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const EDUCATIVA_URL = 'https://psi.educativa.org/soap/';
const EDUCATIVA_AUTH = Buffer.from('webservice:uXyVzXQPHK49').toString('base64');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── SOAP Helper ───
function soapRequest(method: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:aula="urn:Educativa/Aula/">
  <soap:Body>
    <aula:${method}>${body}</aula:${method}>
  </soap:Body>
</soap:Envelope>`;

    const options = {
      hostname: 'psi.educativa.org',
      path: '/soap/',
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Authorization': `Basic ${EDUCATIVA_AUTH}`,
        'SOAPAction': `"urn:Educativa/Aula#${method}"`,
        'Content-Length': Buffer.byteLength(xml),
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.includes('faultstring')) {
          const fault = data.match(/<faultstring>(.*?)<\/faultstring>/)?.[1] || 'unknown';
          // No rechazar en faults conocidos de usuario inexistente
          if (fault.includes('UsuarioInexistente')) {
            resolve('');
          } else {
            reject(new Error(`SOAP Fault: ${fault.substring(0, 200)}`));
          }
        } else {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.write(xml);
    req.end();
  });
}

// ─── XML Parsers ───
function parseUsuariosConAvances(xml: string) {
  const usuarios: any[] = [];
  const userBlocks = xml.split('<usuarios>').slice(1);
  for (const block of userBlocks) {
    const get = (tag: string) => block.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] || '';
    const grupoBlock = block.match(/<grupos>(.*?)<\/grupos>/s)?.[1] || '';
    const getGrupo = (tag: string) => grupoBlock.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] || '';
    usuarios.push({
      id_usuario: get('id_usuario'),
      nombre: get('nombre'),
      apellido: get('apellido'),
      email: get('email'),
      perfil: getGrupo('perfil'),
      fecha_alta: getGrupo('fecha_alta') || null,
      avance: parseInt(getGrupo('avance') || '0', 10),
    });
  }
  return usuarios;
}

function parseUnidades(xml: string) {
  const unidades: any[] = [];
  const blocks = xml.split('<unidades>').slice(1);
  for (const block of blocks) {
    const get = (tag: string) => block.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] || '';
    unidades.push({
      id_unidad: parseInt(get('id_unidad'), 10),
      nombre: get('nombre'),
      obligatorio: get('obligatorio') === 'true',
      estado: get('estado') === 'true',
    });
  }
  return unidades;
}

function parseUsoAula(xml: string) {
  const registros: any[] = [];
  const blocks = xml.split('<tiempo_est_uso>').slice(1);
  for (const block of blocks) {
    const get = (tag: string) => block.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] || '';
    const username = get('username');
    if (!username || username === '_anonimo') continue;
    registros.push({
      id_usuario: username,
      tiempo_estimado_uso: get('tiempo_estimado_uso') || '00:00',
      fecha_primer_interaccion: get('fecha_primer_interaccion') || null,
      fecha_ultima_interaccion: get('fecha_ultima_interaccion') || null,
      cantidad_interacciones: parseInt(get('cantidad_interacciones') || '0', 10),
    });
  }
  return registros;
}

function parseAvanceUsuarioUnidad(xml: string) {
  const unidades: any[] = [];
  const blocks = xml.split('<unidades>').slice(1);
  for (const block of blocks) {
    const get = (tag: string) => block.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] || '';
    unidades.push({
      id_unidad: parseInt(get('id_unidad'), 10),
      avance: parseInt(get('avance') || '0', 10),
    });
  }
  return unidades;
}

// ─── Sync Functions ───
async function syncGrupo(educativa_grupo_id: number, curso_codigo: string) {
  const logEntry = {
    educativa_grupo_id,
    curso_codigo,
    alumnos_sincronizados: 0,
    unidades_sincronizadas: 0,
    status: 'ok' as string,
    error_message: null as string | null,
    started_at: new Date().toISOString(),
    finished_at: null as string | null,
  };

  try {
    // 1. Obtener unidades
    console.log(`  📚 Obteniendo unidades grupo ${educativa_grupo_id}...`);
    const unidadesXml = await soapRequest('obtener_unidades_grupo',
      `<aula:id_grupo>${educativa_grupo_id}</aula:id_grupo>`);
    const unidades = parseUnidades(unidadesXml);
    const totalUnidades = unidades.filter(u => u.obligatorio).length;
    console.log(`     ${unidades.length} unidades (${totalUnidades} obligatorias)`);

    if (unidades.length > 0) {
      const { error: uErr } = await supabase
        .from('educativa_unidades')
        .upsert(
          unidades.map(u => ({
            educativa_grupo_id,
            id_unidad: u.id_unidad,
            nombre: u.nombre,
            obligatorio: u.obligatorio,
            estado: u.estado,
            sync_at: new Date().toISOString(),
          })),
          { onConflict: 'educativa_grupo_id,id_unidad' }
        );
      if (uErr) console.error(`     ⚠️ Error unidades:`, uErr.message);
      logEntry.unidades_sincronizadas = unidades.length;
    }

    // 2. Obtener avances de usuarios
    console.log(`  👥 Obteniendo avances grupo ${educativa_grupo_id}...`);
    const avancesXml = await soapRequest('consultar_usuarios_con_avances',
      `<aula:id_grupo>${educativa_grupo_id}</aula:id_grupo>`);
    const usuarios = parseUsuariosConAvances(avancesXml);
    const alumnos = usuarios.filter(u => u.perfil === 'A');
    console.log(`     ${usuarios.length} usuarios total, ${alumnos.length} alumnos`);

    if (alumnos.length > 0) {
      const { error: aErr } = await supabase
        .from('educativa_avances')
        .upsert(
          alumnos.map(a => ({
            educativa_grupo_id,
            curso_codigo,
            id_usuario: a.id_usuario,
            nombre: a.nombre,
            apellido: a.apellido,
            email: a.email,
            perfil: a.perfil,
            fecha_alta: a.fecha_alta,
            avance: a.avance,
            total_unidades: totalUnidades,
            sync_at: new Date().toISOString(),
          })),
          { onConflict: 'educativa_grupo_id,id_usuario' }
        );
      if (aErr) console.error(`     ⚠️ Error avances:`, aErr.message);
      logEntry.alumnos_sincronizados = alumnos.length;
    }

    // 3. Obtener uso del aula (masivo por curso)
    console.log(`  🕐 Obteniendo uso del aula grupo ${educativa_grupo_id}...`);
    try {
      const usoXml = await soapRequest('consultar_tiempo_estimado_uso_aula',
        `<aula:id_curso>${educativa_grupo_id}</aula:id_curso><aula:perfil>A</aula:perfil>`);
      const usoRegistros = parseUsoAula(usoXml);
      console.log(`     ${usoRegistros.length} registros de uso`);

      if (usoRegistros.length > 0) {
        // Upsert en lotes de 100
        for (let i = 0; i < usoRegistros.length; i += 100) {
          const lote = usoRegistros.slice(i, i + 100);
          const { error: usErr } = await supabase
            .from('educativa_uso_aula')
            .upsert(
              lote.map(r => ({
                educativa_grupo_id,
                id_usuario: r.id_usuario,
                tiempo_estimado_uso: r.tiempo_estimado_uso,
                fecha_primer_interaccion: r.fecha_primer_interaccion || null,
                fecha_ultima_interaccion: r.fecha_ultima_interaccion || null,
                cantidad_interacciones: r.cantidad_interacciones,
                sync_at: new Date().toISOString(),
              })),
              { onConflict: 'educativa_grupo_id,id_usuario' }
            );
          if (usErr) console.error(`     ⚠️ Error uso aula lote:`, usErr.message);
        }
      }
    } catch (usoErr: any) {
      console.error(`     ⚠️ Error uso aula (no critico):`, usoErr.message?.substring(0, 100));
    }

    // 4. Obtener avance por unidad por alumno
    console.log(`  📊 Obteniendo avance por unidad (${alumnos.length} alumnos)...`);
    let avanceUnidadCount = 0;
    const BATCH_SIZE_UNIDAD = 50;
    
    for (let i = 0; i < alumnos.length; i += BATCH_SIZE_UNIDAD) {
      const loteAlumnos = alumnos.slice(i, i + BATCH_SIZE_UNIDAD);
      const allAvancesUnidad: any[] = [];

      for (const alumno of loteAlumnos) {
        try {
          const avUnidadXml = await soapRequest('obtener_avance_usuario_unidad',
            `<aula:id_grupo>${educativa_grupo_id}</aula:id_grupo><aula:id_usuario>${alumno.id_usuario}</aula:id_usuario>`);
          
          if (avUnidadXml) {
            const unidadesAvance = parseAvanceUsuarioUnidad(avUnidadXml);
            for (const u of unidadesAvance) {
              allAvancesUnidad.push({
                educativa_grupo_id,
                id_usuario: alumno.id_usuario,
                id_unidad: u.id_unidad,
                avance: u.avance,
                sync_at: new Date().toISOString(),
              });
            }
            avanceUnidadCount++;
          }
        } catch (avErr: any) {
          // Silenciar errores individuales de usuario
        }
        // Micro delay entre llamadas individuales
        await new Promise(r => setTimeout(r, 200));
      }

      // Upsert del lote
      if (allAvancesUnidad.length > 0) {
        const { error: auErr } = await supabase
          .from('educativa_avances_unidad')
          .upsert(allAvancesUnidad, { onConflict: 'educativa_grupo_id,id_usuario,id_unidad' });
        if (auErr) console.error(`     ⚠️ Error avance unidad:`, auErr.message);
      }
    }
    console.log(`     ${avanceUnidadCount} alumnos con avance por unidad`);

    logEntry.finished_at = new Date().toISOString();
    console.log(`  ✅ ${curso_codigo}: ${alumnos.length} alumnos, ${totalUnidades} unidades`);

  } catch (err: any) {
    logEntry.status = 'error';
    logEntry.error_message = err.message;
    logEntry.finished_at = new Date().toISOString();
    console.error(`  ❌ ${curso_codigo}: ${err.message}`);
  }

  // Guardar log
  await supabase.from('educativa_sync_log').insert(logEntry);

  // Guardar snapshot diario
  if (logEntry.status === "ok" && logEntry.alumnos_sincronizados > 0) {
    const { data: avancesHoy } = await supabase
      .from("educativa_avances")
      .select("educativa_grupo_id, id_usuario, avance, avance_pct")
      .eq("educativa_grupo_id", educativa_grupo_id);
    if (avancesHoy && avancesHoy.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("educativa_avances_historial").upsert(
        avancesHoy.map((a: any) => ({
          educativa_grupo_id: a.educativa_grupo_id,
          id_usuario: a.id_usuario,
          avance: a.avance,
          avance_pct: a.avance_pct,
          snapshot_date: today,
        })),
        { onConflict: "educativa_grupo_id,id_usuario,snapshot_date" }
      );
    }
  }

  // Delay entre grupos
  await new Promise(r => setTimeout(r, 1000));
}


// ─── Auto-detect nuevos grupos en Educativa ───
const MESES: Record<string, number> = {
  'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
  'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
};

function parseGruposEducativa(xml: string) {
  const grupos: { id: number; nombre: string; estado: boolean }[] = [];
  const blocks = xml.split('<grupos>').slice(1);
  for (const block of blocks) {
    const get = (tag: string) => block.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] || '';
    grupos.push({
      id: parseInt(get('id'), 10),
      nombre: get('nombre'),
      estado: get('estado') === 'true',
    });
  }
  return grupos;
}

function parseMesAnio(nombre: string): { mes: number; anio: number } | null {
  const match = nombre.match(/[-–]\s*(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+(\d{4})/i);
  if (!match) return null;
  const mes = MESES[match[1].toLowerCase()];
  const anio = parseInt(match[2], 10);
  if (!mes || !anio) return null;
  return { mes, anio };
}

function getNombreBase(nombre: string): string {
  return nombre
    .replace(/\s*[-–]\s*(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+\d{4}\s*$/i, '')
    .replace(/\s*[-–]\s*ON\s*DEMAND\s*$/i, '')
    .trim();
}

async function syncNuevosGrupos() {
  console.log('🔍 Buscando nuevos grupos en Educativa...');

  const gruposXml = await soapRequest('consultar_grupos', '');
  const gruposEducativa = parseGruposEducativa(gruposXml);
  console.log(`   ${gruposEducativa.length} grupos en Educativa`);

  const { data: existentes } = await supabase
    .from('cursos_cohortes')
    .select('educativa_codigo');
  const idsExistentes = new Set((existentes || []).map((e: any) => String(e.educativa_codigo)));

  const nuevos = gruposEducativa.filter(g => !idsExistentes.has(String(g.id)));
  if (nuevos.length === 0) {
    console.log('   ✅ No hay grupos nuevos\n');
    return;
  }
  console.log(`   🆕 ${nuevos.length} grupos nuevos detectados`);

  const { data: referencia } = await supabase
    .from('cursos_cohortes')
    .select('curso_codigo, nombre')
    .gte('cohorte_anio', 2024);

  const mapeoBase: Record<string, string> = {};
  for (const ref of (referencia || [])) {
    const base = getNombreBase(ref.nombre);
    if (base && ref.curso_codigo) {
      mapeoBase[base.toLowerCase()] = ref.curso_codigo;
    }
  }

  let insertados = 0;
  let sinMapeo = 0;
  for (const grupo of nuevos) {
    const fechaParsed = parseMesAnio(grupo.nombre);
    const nombreBase = getNombreBase(grupo.nombre);
    const cursoCodeMatch = mapeoBase[nombreBase.toLowerCase()];

    if (!cursoCodeMatch) {
      console.log(`   ⚠️ Sin mapeo: [${grupo.id}] "${grupo.nombre}" (base: "${nombreBase}")`);
      sinMapeo++;
      continue;
    }

    if (!fechaParsed) {
      console.log(`   ⚠️ Sin fecha: [${grupo.id}] "${grupo.nombre}" → ${cursoCodeMatch}`);
      continue;
    }

    const { error: insErr } = await supabase
      .from('cursos_cohortes')
      .insert({
        educativa_codigo: String(grupo.id),
        curso_codigo: cursoCodeMatch,
        nombre: grupo.nombre,
        alumnos: 0,
        cohorte_anio: fechaParsed.anio,
        cohorte_mes: fechaParsed.mes,
      });

    if (insErr) {
      console.error(`   ❌ Error insertando [${grupo.id}]:`, insErr.message);
    } else {
      console.log(`   ✅ Nuevo: [${grupo.id}] "${grupo.nombre}" → ${cursoCodeMatch} (${fechaParsed.anio}-${String(fechaParsed.mes).padStart(2, '0')})`);
      insertados++;
    }
  }

  console.log(`   📊 Resultado: ${insertados} insertados, ${sinMapeo} sin mapeo\n`);
}

// ─── Main ───
async function main() {
  console.log('🔄 Sincronización Educativa SOAP → Supabase');
  console.log('═'.repeat(50));

  // Paso 0: Detectar y agregar grupos nuevos
  try {
    await syncNuevosGrupos();
  } catch (err: any) {
    console.error('⚠️ Error detectando nuevos grupos (no crítico):', err.message);
  }

  const { data: cohortes, error } = await supabase
    .from('cursos_cohortes')
    .select('educativa_codigo, curso_codigo, cohorte_anio, cohorte_mes, alumnos')
    .gte('cohorte_anio', 2023)
    .not('educativa_codigo', 'is', null)
    .order('cohorte_anio', { ascending: false })
    .order('cohorte_mes', { ascending: false });

  if (error || !cohortes) {
    console.error('Error obteniendo cohortes:', error);
    return;
  }

  console.log(`📋 ${cohortes.length} cohortes a sincronizar\n`);

  for (const cohorte of cohortes) {
    console.log(`\n🔸 ${cohorte.curso_codigo} (${cohorte.cohorte_anio}-${String(cohorte.cohorte_mes).padStart(2, '0')}) - Grupo ${cohorte.educativa_codigo}`);
    await syncGrupo(cohorte.educativa_codigo, cohorte.curso_codigo);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('✅ Sincronización completada');
}

main().catch(console.error);
