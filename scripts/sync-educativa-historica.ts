/**
 * Carga histórica Educativa SOAP → Supabase
 * Uso: SUPABASE_SERVICE_KEY=... npx tsx scripts/sync-educativa-historica.ts
 * 
 * Trae TODAS las cohortes (2018-2026). Ejecutar una sola vez.
 * El cron diario (sync-educativa.ts) solo trae >= 2025.
 */

import { createClient } from '@supabase/supabase-js';
import https from 'https';

const SUPABASE_URL = 'https://rbtczzjlvnymylkvcwdv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const EDUCATIVA_AUTH = Buffer.from('webservice:uXyVzXQPHK49').toString('base64');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
          reject(new Error(`SOAP Fault: ${data.match(/<faultstring>(.*?)<\/faultstring>/)?.[1] || 'unknown'}`));
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
    console.log(`  📚 Unidades grupo ${educativa_grupo_id}...`);
    const unidadesXml = await soapRequest('obtener_unidades_grupo',
      `<aula:id_grupo>${educativa_grupo_id}</aula:id_grupo>`);
    const unidades = parseUnidades(unidadesXml);
    const totalUnidades = unidades.filter(u => u.obligatorio).length;

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

    console.log(`  👥 Avances grupo ${educativa_grupo_id}...`);
    const avancesXml = await soapRequest('consultar_usuarios_con_avances',
      `<aula:id_grupo>${educativa_grupo_id}</aula:id_grupo>`);
    const usuarios = parseUsuariosConAvances(avancesXml);
    const alumnos = usuarios.filter(u => u.perfil === 'A');

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

    logEntry.finished_at = new Date().toISOString();
    console.log(`  ✅ ${curso_codigo}: ${alumnos.length} alumnos, ${totalUnidades} unidades`);

  } catch (err: any) {
    logEntry.status = 'error';
    logEntry.error_message = err.message;
    logEntry.finished_at = new Date().toISOString();
    console.error(`  ❌ ${curso_codigo}: ${err.message}`);
  }

  await supabase.from('educativa_sync_log').insert(logEntry);
  await new Promise(r => setTimeout(r, 800));
}

async function main() {
  console.log('🔄 Carga histórica Educativa SOAP → Supabase');
  console.log('═'.repeat(50));

  const { data: cohortes, error } = await supabase
    .from('cursos_cohortes')
    .select('educativa_codigo, curso_codigo, cohorte_anio, cohorte_mes, alumnos')
    .not('educativa_codigo', 'is', null)
    .order('cohorte_anio', { ascending: false })
    .order('cohorte_mes', { ascending: false });

  if (error || !cohortes) {
    console.error('Error obteniendo cohortes:', error);
    return;
  }

  // Filtrar los que ya sincronizamos (>= 2025) para no duplicar trabajo
  const yaSync = new Set<string>();
  const { data: existing } = await supabase
    .from('educativa_avances')
    .select('educativa_grupo_id')
    .limit(1000);
  if (existing) existing.forEach((e: any) => yaSync.add(String(e.educativa_grupo_id)));

  const pendientes = cohortes.filter(c => !yaSync.has(String(c.educativa_codigo)));
  console.log(`📋 ${cohortes.length} cohortes total, ${pendientes.length} pendientes de sincronizar\n`);

  let i = 0;
  for (const cohorte of pendientes) {
    i++;
    console.log(`\n[${i}/${pendientes.length}] 🔸 ${cohorte.curso_codigo} (${cohorte.cohorte_anio}-${String(cohorte.cohorte_mes).padStart(2, '0')}) - Grupo ${cohorte.educativa_codigo}`);
    await syncGrupo(cohorte.educativa_codigo, cohorte.curso_codigo);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('✅ Carga histórica completada');
}

main().catch(console.error);
