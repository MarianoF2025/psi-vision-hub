/**
 * Sincronización Vimeo → Supabase
 * Uso: SUPABASE_SERVICE_KEY='...' npx tsx /opt/psi-vision-hub/scripts/sync-vimeo.ts
 *
 * Sincroniza carpetas (cursos) y videos con plays
 * Guarda snapshot diario de plays para calcular delta
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rbtczzjlvnymylkvcwdv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const VIMEO_TOKEN = '78d57089024b35cf6e93faab60573307';
const VIMEO_USER = '114977444';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function vimeoGet(path: string): Promise<any> {
  const url = path.startsWith('http') ? path : `https://api.vimeo.com${path}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `bearer ${VIMEO_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Vimeo ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log('🚀 Sync Vimeo iniciando...');
  const startedAt = new Date().toISOString();
  let totalFolders = 0;
  let totalVideos = 0;

  try {
    // 1. Sincronizar carpetas (paginado)
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const data = await vimeoGet(
        `/users/${VIMEO_USER}/projects?per_page=100&page=${page}&fields=uri,name,created_time,modified_time,metadata.connections.videos.total`
      );

      const folders = data.data || [];
      for (const f of folders) {
        const projectId = f.uri.split('/').pop();
        const { error } = await supabase.from('vimeo_folders').upsert({
          vimeo_project_id: projectId,
          name: f.name,
          created_time: f.created_time,
          modified_time: f.modified_time,
          total_videos: f.metadata?.connections?.videos?.total || 0,
          sync_at: new Date().toISOString()
        }, { onConflict: 'vimeo_project_id' });

        if (error) console.error(`  ⚠ Folder ${f.name}: ${error.message}`);
        else totalFolders++;
      }

      hasMore = !!data.paging?.next;
      page++;
      await delay(500);
    }
    console.log(`📁 ${totalFolders} carpetas sincronizadas`);

    // 2. Sincronizar videos (por carpeta, solo las que tienen videos)
    const { data: folders } = await supabase
      .from('vimeo_folders')
      .select('vimeo_project_id, name')
      .gt('total_videos', 0);

    for (const folder of (folders || [])) {
      let vPage = 1;
      let vHasMore = true;

      while (vHasMore) {
        const vData = await vimeoGet(
          `/users/${VIMEO_USER}/projects/${folder.vimeo_project_id}/videos?per_page=100&page=${vPage}&fields=uri,name,duration,stats,created_time`
        );

        const videos = vData.data || [];
        for (const v of videos) {
          const videoId = v.uri.split('/').pop();
          const plays = v.stats?.plays || 0;

          // Upsert video
          const { error } = await supabase.from('vimeo_videos').upsert({
            vimeo_video_id: videoId,
            vimeo_project_id: folder.vimeo_project_id,
            name: v.name,
            duration_seconds: v.duration,
            plays: plays,
            created_time: v.created_time,
            sync_at: new Date().toISOString()
          }, { onConflict: 'vimeo_video_id' });

          if (error) console.error(`    ⚠ Video ${v.name}: ${error.message}`);
          else totalVideos++;

          // Snapshot diario de plays
          await supabase.from('vimeo_plays_historial').upsert({
            vimeo_video_id: videoId,
            plays: plays,
            snapshot_date: new Date().toISOString().split('T')[0]
          }, { onConflict: 'vimeo_video_id,snapshot_date' });
        }

        vHasMore = !!vData.paging?.next;
        vPage++;
        await delay(300);
      }
    }
    console.log(`🎬 ${totalVideos} videos sincronizados`);

    // Log
    await supabase.from('zoom_vimeo_sync_log').insert({
      source: 'vimeo',
      videos_synced: totalVideos,
      folders_synced: totalFolders,
      status: 'ok',
      started_at: startedAt,
      finished_at: new Date().toISOString()
    });

    console.log(`\n✅ Sync Vimeo completada: ${totalFolders} carpetas, ${totalVideos} videos`);

  } catch (e: any) {
    console.error('❌ Error:', e.message);
    await supabase.from('zoom_vimeo_sync_log').insert({
      source: 'vimeo',
      status: 'error',
      error_message: e.message,
      started_at: startedAt,
      finished_at: new Date().toISOString()
    });
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
