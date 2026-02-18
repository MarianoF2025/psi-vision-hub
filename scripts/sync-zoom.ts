/**
 * Sincronización Zoom → Supabase
 * Uso: SUPABASE_SERVICE_KEY='...' npx tsx /opt/psi-vision-hub/scripts/sync-zoom.ts
 *
 * Sincroniza meetings y participantes de 3 cuentas Zoom
 * Report API: meetings pasadas con detalle de asistencia
 * Auto-mapea topics nuevos a cursos_cohortes por fuzzy matching
 */
import { createClient } from '@supabase/supabase-js';

// Config
const SUPABASE_URL = 'https://rbtczzjlvnymylkvcwdv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ZOOM_ACCOUNTS = [
  {
    name: 'nina',
    account_id: 'RFEKxKyHSuquAVBp6OeQjg',
    client_id: 'iCbhm5a4RbuEh_LxTk0cpQ',
    client_secret: 'tN0TjRMkJ8k7aqxdkW2Pmv2wxaBmawjL',
    user_id: 'DwFr6jsXSw-IgZ2FrWrEOw'
  },
  {
    name: 'ninadulcich',
    account_id: 'RFEKxKyHSuquAVBp6OeQjg',
    client_id: 'iCbhm5a4RbuEh_LxTk0cpQ',
    client_secret: 'tN0TjRMkJ8k7aqxdkW2Pmv2wxaBmawjL',
    user_id: 'j-Rbx-dBTf-iTyqf2prlPg'
  },
  {
    name: 'maru',
    account_id: 'T6KimQ_nRh-rCGujvllUSg',
    client_id: 'UMWZNTwgQHO89RNl05aeXw',
    client_secret: 'Pe7XGrRwVBBvFefg3sjHPEpg5YvSlB0j',
    user_id: 'kz23DutKTa2umiCn3sqo5Q'
  }
];

// ─── Helpers ───

async function getZoomToken(account: typeof ZOOM_ACCOUNTS[0]): Promise<string> {
  const auth = Buffer.from(`${account.client_id}:${account.client_secret}`).toString('base64');
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${account.account_id}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token error (${account.name}): ${JSON.stringify(data)}`);
  return data.access_token;
}

async function zoomGet(token: string, path: string): Promise<any> {
  const res = await fetch(`https://api.zoom.us/v2${path}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoom API ${res.status}: ${text}`);
  }
  return res.json();
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Sync Logic ───

async function syncAccount(account: typeof ZOOM_ACCOUNTS[0]) {
  console.log(`\n━━━ Zoom ${account.name} ━━━`);

  const token = await getZoomToken(account);
  console.log(`✅ Token obtenido`);

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  let totalMeetings = 0;
  let totalParticipants = 0;
  let nextPageToken = '';

  do {
    const pageParam = nextPageToken ? `&next_page_token=${nextPageToken}` : '';
    const data = await zoomGet(token,
      `/report/users/${account.user_id}/meetings?from=${fromStr}&to=${toStr}&page_size=30${pageParam}`
    );

    const meetings = data.meetings || [];
    nextPageToken = data.next_page_token || '';

    for (const m of meetings) {
      const { error: meetErr } = await supabase.from('zoom_meetings').upsert({
        zoom_uuid: m.uuid,
        zoom_meeting_id: m.id,
        zoom_account: account.name,
        host_email: m.user_email,
        topic: m.topic,
        start_time: m.start_time,
        end_time: m.end_time,
        duration_minutes: m.duration,
        total_minutes: m.total_minutes,
        participants_count: m.participants_count,
        sync_at: new Date().toISOString()
      }, { onConflict: 'zoom_uuid' });

      if (meetErr) {
        console.error(`  ❌ Meeting ${m.topic}: ${meetErr.message}`);
        continue;
      }
      totalMeetings++;

      let partToken = '';
      do {
        const partParam = partToken ? `&next_page_token=${partToken}` : '';
        const uuid = encodeURIComponent(encodeURIComponent(m.uuid));

        try {
          const partData = await zoomGet(token,
            `/report/meetings/${uuid}/participants?page_size=100${partParam}`
          );

          const participants = partData.participants || [];
          partToken = partData.next_page_token || '';

          for (const p of participants) {
            if (p.status === 'in_waiting_room') continue;

            const { error: partErr } = await supabase.from('zoom_participants').insert({
              zoom_uuid: m.uuid,
              participant_name: p.name || '',
              participant_email: (p.user_email || '').toLowerCase().trim(),
              join_time: p.join_time,
              leave_time: p.leave_time,
              duration_seconds: p.duration,
              status: p.status,
              sync_at: new Date().toISOString()
            });

            if (partErr) {
              if (!partErr.message.includes('duplicate')) {
                console.error(`    ⚠ Participante: ${partErr.message}`);
              }
            } else {
              totalParticipants++;
            }
          }
        } catch (e: any) {
          console.error(`  ⚠ Participantes ${m.topic}: ${e.message}`);
          partToken = '';
        }

        await delay(300);
      } while (partToken);

      await delay(500);
    }
  } while (nextPageToken);

  console.log(`  📊 ${totalMeetings} meetings, ${totalParticipants} participantes`);
  return { meetings: totalMeetings, participants: totalParticipants };
}

// ─── Auto-map Zoom Topics → cursos_cohortes ───

const MESES_ZOOM: Record<string, number> = {
  'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
  'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
};

const STOPWORDS = new Set(['de', 'en', 'el', 'la', 'y', 'las', 'los', 'del', 'e', 'para', 'con', 'como', 'que', 'por', 'un', 'una', 'al', 'su']);

function parseMesAnioTopic(topic: string): { mes: number; anio: number; base: string } | null {
  const match = topic.match(/\s*-?\s*(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+(\d{4})\s*$/i);
  if (!match) return null;
  const mes = MESES_ZOOM[match[1].toLowerCase()];
  const anio = parseInt(match[2], 10);
  if (!mes || !anio) return null;
  const base = topic.replace(/\s*-?\s*(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+\d{4}\s*$/i, '').trim();
  return { mes, anio, base };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[():,.\-–]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function limpiarBaseCohorte(nombre: string): string {
  return nombre
    .replace(/\s*-\s*(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+\d{4}\s*$/i, '')
    .replace(/^(Curso de Especialización en|Especialización en|Curso)\s+/i, '')
    .trim();
}

function calcularScore(topicTokens: string[], cohorteTokens: string[]): number {
  if (topicTokens.length === 0) return 0;
  let matches = 0;
  for (const tw of topicTokens) {
    const twNorm = tw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const found = cohorteTokens.some(cw => {
      const cwNorm = cw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return cwNorm.includes(twNorm) || twNorm.includes(cwNorm);
    });
    if (found) matches++;
  }
  return matches / topicTokens.length;
}

async function autoMapZoomTopics() {
  console.log('\n🔗 Auto-mapeando topics de Zoom a cohortes...');

  // 1. Topics únicos recientes
  const { data: allTopics } = await supabase
    .from('zoom_meetings')
    .select('topic')
    .gte('start_time', '2025-01-01');

  if (!allTopics || allTopics.length === 0) {
    console.log('   No hay meetings recientes');
    return;
  }

  const topicsUnicos = [...new Set(allTopics.map((t: any) => t.topic))];

  // 2. Topics ya mapeados
  const { data: cohortesMapeadas } = await supabase
    .from('cursos_cohortes')
    .select('zoom_topic')
    .not('zoom_topic', 'is', null);
  const topicsMapeados = new Set((cohortesMapeadas || []).map((c: any) => c.zoom_topic));

  // 3. Filtrar: sin mapear + tienen Mes Año (son cursos)
  const sinMapear: { topic: string; parsed: { mes: number; anio: number; base: string } }[] = [];
  for (const topic of topicsUnicos) {
    if (topicsMapeados.has(topic)) continue;
    const parsed = parseMesAnioTopic(topic);
    if (!parsed) continue;
    sinMapear.push({ topic, parsed });
  }

  if (sinMapear.length === 0) {
    console.log('   ✅ Todos los topics de cursos están mapeados\n');
    return;
  }

  console.log(`   📋 ${sinMapear.length} topics sin mapear`);

  // 4. Cohortes sin zoom_topic (2025+)
  const { data: cohortesSinZoom } = await supabase
    .from('cursos_cohortes')
    .select('educativa_codigo, curso_codigo, nombre, cohorte_anio, cohorte_mes')
    .is('zoom_topic', null)
    .gte('cohorte_anio', 2025);

  if (!cohortesSinZoom || cohortesSinZoom.length === 0) {
    for (const t of sinMapear) {
      console.log(`   ⚠️ Sin candidatas: "${t.topic}"`);
    }
    return;
  }

  let mapeados = 0;
  let sinMatch = 0;

  for (const { topic, parsed } of sinMapear) {
    // Buscar cohortes del mismo mes/año sin zoom_topic
    const candidatas = cohortesSinZoom.filter(
      (c: any) => c.cohorte_anio === parsed.anio && c.cohorte_mes === parsed.mes
    );

    if (candidatas.length === 0) {
      console.log(`   ⚠️ Sin candidatas ${parsed.anio}-${String(parsed.mes).padStart(2, '0')}: "${topic}"`);
      sinMatch++;
      continue;
    }

    // Una sola candidata → match directo
    if (candidatas.length === 1) {
      const { error } = await supabase
        .from('cursos_cohortes')
        .update({ zoom_topic: topic })
        .eq('educativa_codigo', candidatas[0].educativa_codigo);

      if (!error) {
        console.log(`   ✅ Match único: "${topic}" → ${candidatas[0].curso_codigo}`);
        mapeados++;
        const idx = cohortesSinZoom.findIndex((c: any) => c.educativa_codigo === candidatas[0].educativa_codigo);
        if (idx >= 0) cohortesSinZoom.splice(idx, 1);
      }
      continue;
    }

    // Fuzzy matching
    const topicTokens = tokenize(parsed.base);

    const scores = candidatas.map((c: any) => {
      const baseCohorte = limpiarBaseCohorte(c.nombre);
      const cohorteTokens = tokenize(baseCohorte);
      const score = calcularScore(topicTokens, cohorteTokens);
      return { cohorte: c, score };
    }).sort((a, b) => b.score - a.score);

    const mejor = scores[0];
    const segundo = scores.length > 1 ? scores[1] : { score: 0 };

    // Match si: score > 50% Y diferencia con segundo > 20%
    if (mejor.score > 0.5 && (mejor.score - segundo.score) > 0.2) {
      const { error } = await supabase
        .from('cursos_cohortes')
        .update({ zoom_topic: topic })
        .eq('educativa_codigo', mejor.cohorte.educativa_codigo);

      if (!error) {
        console.log(`   ✅ Fuzzy (${Math.round(mejor.score * 100)}%): "${topic}" → ${mejor.cohorte.curso_codigo}`);
        mapeados++;
        const idx = cohortesSinZoom.findIndex((c: any) => c.educativa_codigo === mejor.cohorte.educativa_codigo);
        if (idx >= 0) cohortesSinZoom.splice(idx, 1);
      }
    } else {
      const detalle = scores.slice(0, 3).map(s => `${s.cohorte.curso_codigo}(${Math.round(s.score * 100)}%)`).join(', ');
      console.log(`   ⚠️ Ambiguo: "${topic}" → ${detalle}`);
      sinMatch++;
    }
  }

  console.log(`   📊 Resultado: ${mapeados} mapeados, ${sinMatch} pendientes manual\n`);
}

// ─── Main ───

async function main() {
  console.log('🚀 Sync Zoom iniciando...');
  const startedAt = new Date().toISOString();

  let totalM = 0, totalP = 0;
  let status = 'ok';
  let errorMsg = '';

  for (const account of ZOOM_ACCOUNTS) {
    try {
      const result = await syncAccount(account);
      totalM += result.meetings;
      totalP += result.participants;
    } catch (e: any) {
      console.error(`❌ Error cuenta ${account.name}: ${e.message}`);
      status = 'error';
      errorMsg += `${account.name}: ${e.message}; `;
    }
  }

  // Auto-map topics después de sincronizar
  try {
    await autoMapZoomTopics();
  } catch (e: any) {
    console.error('⚠️ Error auto-map topics (no crítico):', e.message);
  }

  // Log
  await supabase.from('zoom_vimeo_sync_log').insert({
    source: 'zoom',
    meetings_synced: totalM,
    participants_synced: totalP,
    status,
    error_message: errorMsg || null,
    started_at: startedAt,
    finished_at: new Date().toISOString()
  });

  console.log(`\n✅ Sync Zoom completada: ${totalM} meetings, ${totalP} participantes`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
