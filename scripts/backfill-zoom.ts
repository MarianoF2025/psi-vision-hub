/**
 * Backfill Zoom → Supabase
 * Trae histórico mes a mes (hasta 12 meses atrás)
 * Uso: SUPABASE_SERVICE_KEY='...' npx tsx /opt/psi-vision-hub/scripts/backfill-zoom.ts
 */
import { createClient } from '@supabase/supabase-js';

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

async function getZoomToken(account: typeof ZOOM_ACCOUNTS[0]): Promise<string> {
  const auth = Buffer.from(`${account.client_id}:${account.client_secret}`).toString('base64');
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${account.account_id}`,
    { method: 'POST', headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
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

// Generar rangos mensuales desde startDate hasta endDate
function getMonthlyRanges(startDate: string, endDate: string): Array<{ from: string; to: string }> {
  const ranges: Array<{ from: string; to: string }> = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let current = new Date(start);
  while (current < end) {
    const rangeFrom = current.toISOString().split('T')[0];
    // Fin del mes o endDate, lo que sea menor
    const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0); // último día del mes
    const rangeTo = nextMonth < end ? nextMonth.toISOString().split('T')[0] : end.toISOString().split('T')[0];

    ranges.push({ from: rangeFrom, to: rangeTo });

    // Avanzar al primer día del mes siguiente
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  return ranges;
}

async function syncAccountRange(account: typeof ZOOM_ACCOUNTS[0], from: string, to: string, token: string) {
  let totalMeetings = 0;
  let totalParticipants = 0;
  let nextPageToken = '';

  do {
    const pageParam = nextPageToken ? `&next_page_token=${nextPageToken}` : '';
    const data = await zoomGet(token,
      `/report/users/${account.user_id}/meetings?from=${from}&to=${to}&page_size=30${pageParam}`
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
        console.error(`    ❌ Meeting ${m.topic}: ${meetErr.message}`);
        continue;
      }
      totalMeetings++;

      // Participantes
      let partToken = '';
      do {
        const partParam = partToken ? `&next_page_token=${partToken}` : '';
        const uuid = encodeURIComponent(encodeURIComponent(m.uuid));
        try {
          const partData = await zoomGet(token, `/report/meetings/${uuid}/participants?page_size=100${partParam}`);
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
                console.error(`      ⚠ Participante: ${partErr.message}`);
              }
            } else {
              totalParticipants++;
            }
          }
        } catch (e: any) {
          // 404 = meeting too old for participant data, skip
          if (e.message.includes('404')) {
            partToken = '';
          } else {
            console.error(`    ⚠ Participantes ${m.topic}: ${e.message}`);
            partToken = '';
          }
        }
        await delay(300);
      } while (partToken);

      await delay(500);
    }
  } while (nextPageToken);

  return { meetings: totalMeetings, participants: totalParticipants };
}

async function main() {
  console.log('🚀 Backfill Zoom iniciando...');
  console.log('   Rango: 2025-02-13 → 2026-01-12 (lo que falta)\n');

  const ranges = getMonthlyRanges('2025-02-13', '2026-01-12');
  console.log(`   ${ranges.length} meses a procesar\n`);

  let grandTotalM = 0;
  let grandTotalP = 0;

  for (const account of ZOOM_ACCOUNTS) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Cuenta: ${account.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Token nuevo por cuenta (dura 1 hora, suficiente para el backfill)
    const token = await getZoomToken(account);
    console.log(`  ✅ Token obtenido\n`);

    for (const range of ranges) {
      process.stdout.write(`  📅 ${range.from} → ${range.to} ... `);
      try {
        const result = await syncAccountRange(account, range.from, range.to, token);
        console.log(`${result.meetings} meetings, ${result.participants} participantes`);
        grandTotalM += result.meetings;
        grandTotalP += result.participants;
      } catch (e: any) {
        console.log(`❌ ${e.message}`);
      }
      await delay(1000); // Pausa entre meses
    }
  }

  // Log
  await supabase.from('zoom_vimeo_sync_log').insert({
    source: 'zoom-backfill',
    meetings_synced: grandTotalM,
    participants_synced: grandTotalP,
    status: 'ok',
    error_message: null,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString()
  });

  console.log(`\n✅ Backfill completado: ${grandTotalM} meetings, ${grandTotalP} participantes`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
