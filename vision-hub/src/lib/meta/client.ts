/**
 * Cliente Meta Ads API para PSI Vision Hub
 * Trae datos de campañas, ad sets, ads e insights y los guarda en Supabase.
 * Graph API v21.0
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const getConfig = () => ({
  accessToken: process.env.META_ACCESS_TOKEN!,
  adAccountId: process.env.META_AD_ACCOUNT_ID!,
});

// --- HELPERS ---

async function metaGet(endpoint: string, params: Record<string, string> = {}) {
  const { accessToken } = getConfig();
  const url = new URL(`${META_BASE_URL}${endpoint}`);
  url.searchParams.set('access_token', accessToken);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response: Response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Meta API error: ${response.status} - ${JSON.stringify(error)}`);
  }
  return response.json();
}

async function metaGetAll(endpoint: string, params: Record<string, string> = {}) {
  let allData: any[] = [];
  const { accessToken } = getConfig();
  const urlObj = new URL(`${META_BASE_URL}${endpoint}`);
  urlObj.searchParams.set('access_token', accessToken);
  for (const [key, value] of Object.entries(params)) {
    urlObj.searchParams.set(key, value);
  }
  let nextUrl: string | null = urlObj.toString();
  while (nextUrl) {
    const response: Response = await fetch(nextUrl);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Meta API error: ${response.status} - ${JSON.stringify(error)}`);
    }
    const json = await response.json();
    allData = allData.concat(json.data || []);
    nextUrl = json.paging?.next || null;
  }
  return allData;
}

// --- SYNC CAMPAIGNS ---

export async function syncCampaigns() {
  const { adAccountId } = getConfig();
  const startTime = Date.now();
  let nuevos = 0, actualizados = 0;
  try {
    const campaigns = await metaGetAll(`/${adAccountId}/campaigns`, {
      fields: [
        'id', 'name', 'status', 'effective_status', 'objective',
        'buying_type', 'daily_budget', 'lifetime_budget', 'bid_strategy',
        'special_ad_categories', 'created_time', 'updated_time',
        'start_time', 'stop_time'
      ].join(','),
      limit: '100',
    });
    for (const c of campaigns) {
      const row = {
        id: c.id,
        account_id: adAccountId,
        name: c.name,
        status: c.status,
        effective_status: c.effective_status,
        objective: c.objective,
        buying_type: c.buying_type,
        daily_budget: c.daily_budget ? Number(c.daily_budget) : null,
        lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) : null,
        bid_strategy: c.bid_strategy || null,
        special_ad_categories: c.special_ad_categories || [],
        created_time: c.created_time,
        updated_time: c.updated_time,
        start_time: c.start_time || null,
        stop_time: c.stop_time || null,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase
        .from('meta_campaigns').select('id').eq('id', c.id).single();
      if (existing) {
        await supabase.from('meta_campaigns').update(row).eq('id', c.id);
        actualizados++;
      } else {
        await supabase.from('meta_campaigns').insert(row);
        nuevos++;
      }
    }
    await logSync('campaigns', 'success', campaigns.length, nuevos, actualizados, null, Date.now() - startTime);
    return { total: campaigns.length, nuevos, actualizados };
  } catch (error: any) {
    await logSync('campaigns', 'error', 0, 0, 0, error.message, Date.now() - startTime);
    throw error;
  }
}

// --- SYNC AD SETS ---

export async function syncAdSets() {
  const { adAccountId } = getConfig();
  const startTime = Date.now();
  let nuevos = 0, actualizados = 0;
  try {
    const adsets = await metaGetAll(`/${adAccountId}/adsets`, {
      fields: [
        'id', 'campaign_id', 'name', 'status', 'effective_status',
        'optimization_goal', 'billing_event', 'bid_amount',
        'daily_budget', 'lifetime_budget', 'targeting',
        'promoted_object', 'learning_phase_info',
        'created_time', 'updated_time', 'start_time', 'end_time'
      ].join(','),
      limit: '100',
    });
    for (const a of adsets) {
      const row = {
        id: a.id,
        campaign_id: a.campaign_id,
        account_id: adAccountId,
        name: a.name,
        status: a.status,
        effective_status: a.effective_status,
        optimization_goal: a.optimization_goal,
        billing_event: a.billing_event,
        bid_amount: a.bid_amount ? Number(a.bid_amount) : null,
        daily_budget: a.daily_budget ? Number(a.daily_budget) : null,
        lifetime_budget: a.lifetime_budget ? Number(a.lifetime_budget) : null,
        targeting: a.targeting || null,
        promoted_object: a.promoted_object || null,
        learning_phase_info: a.learning_phase_info || null,
        created_time: a.created_time,
        updated_time: a.updated_time,
        start_time: a.start_time || null,
        end_time: a.end_time || null,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase
        .from('meta_adsets').select('id').eq('id', a.id).single();
      if (existing) {
        await supabase.from('meta_adsets').update(row).eq('id', a.id);
        actualizados++;
      } else {
        await supabase.from('meta_adsets').insert(row);
        nuevos++;
      }
    }
    await logSync('adsets', 'success', adsets.length, nuevos, actualizados, null, Date.now() - startTime);
    return { total: adsets.length, nuevos, actualizados };
  } catch (error: any) {
    await logSync('adsets', 'error', 0, 0, 0, error.message, Date.now() - startTime);
    throw error;
  }
}

// --- SYNC ADS ---

export async function syncAds() {
  const { adAccountId } = getConfig();
  const startTime = Date.now();
  let nuevos = 0, actualizados = 0;
  try {
    const ads = await metaGetAll(`/${adAccountId}/ads`, {
      fields: [
        'id', 'adset_id', 'campaign_id', 'name', 'status',
        'effective_status',
        'created_time', 'updated_time'
      ].join(','),
      limit: '200',
    });
    for (const ad of ads) {
      const creative = ad.creative || {};
      const row = {
        id: ad.id,
        adset_id: ad.adset_id,
        campaign_id: ad.campaign_id,
        account_id: adAccountId,
        name: ad.name,
        status: ad.status,
        effective_status: ad.effective_status,
        creative_id: creative.id || null,
        creative_body: creative.body || null,
        creative_title: creative.title || null,
        creative_link_url: creative.link_url || null,
        creative_image_url: creative.image_url || creative.thumbnail_url || null,
        creative_video_url: creative.video_id ? `https://www.facebook.com/video/${creative.video_id}` : null,
        creative_type: creative.video_id ? 'VIDEO' : 'IMAGE',
        creative_call_to_action: creative.call_to_action_type || null,
        tracking_specs: ad.tracking_specs || null,
        created_time: ad.created_time,
        updated_time: ad.updated_time,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase
        .from('meta_ads').select('id').eq('id', ad.id).single();
      if (existing) {
        await supabase.from('meta_ads').update(row).eq('id', ad.id);
        actualizados++;
      } else {
        await supabase.from('meta_ads').insert(row);
        nuevos++;
      }
    }
    await logSync('ads', 'success', ads.length, nuevos, actualizados, null, Date.now() - startTime);
    return { total: ads.length, nuevos, actualizados };
  } catch (error: any) {
    await logSync('ads', 'error', 0, 0, 0, error.message, Date.now() - startTime);
    throw error;
  }
}

// --- SYNC INSIGHTS (metricas diarias) ---

export async function syncInsights(desde?: string, hasta?: string) {
  const { adAccountId } = getConfig();
  const startTime = Date.now();
  let nuevos = 0, actualizados = 0;

  const hoy = new Date();
  const hace7 = new Date(hoy);
  hace7.setDate(hace7.getDate() - 7);
  const dateStart = desde || hace7.toISOString().split('T')[0];
  const dateEnd = hasta || hoy.toISOString().split('T')[0];

  try {
    const insights = await metaGetAll(`/${adAccountId}/insights`, {
      fields: [
        'ad_id', 'ad_name', 'adset_id', 'campaign_id',
        'impressions', 'reach', 'frequency',
        'clicks', 'unique_clicks', 'ctr', 'unique_ctr',
        'spend', 'cpc', 'cpm', 'cpp', 'cost_per_unique_click',
        'actions', 'cost_per_action_type',
        'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking',
        'video_p25_watched_actions', 'video_p50_watched_actions',
        'video_p75_watched_actions', 'video_p100_watched_actions',
        'video_avg_time_watched_actions',
        'date_start', 'date_stop'
      ].join(','),
      level: 'ad',
      time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
      time_increment: '1',
      limit: '500',
    });

    for (const i of insights) {
      let messagingConversations = 0;
      let costPerConversation = 0;

      if (i.actions) {
        const msgAction = i.actions.find((a: any) =>
          a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
          a.action_type === 'messaging_conversation_started_7d'
        );
        if (msgAction) messagingConversations = Number(msgAction.value);
      }
      if (i.cost_per_action_type) {
        const msgCost = i.cost_per_action_type.find((a: any) =>
          a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
          a.action_type === 'messaging_conversation_started_7d'
        );
        if (msgCost) costPerConversation = Number(msgCost.value);
      }

      const videoMetric = (arr: any) => {
        if (!arr || !Array.isArray(arr)) return 0;
        const item = arr.find((a: any) => a.action_type === 'video_view');
        return item ? Number(item.value) : 0;
      };

      const row = {
        ad_id: i.ad_id,
        adset_id: i.adset_id,
        campaign_id: i.campaign_id,
        account_id: adAccountId,
        date_start: i.date_start,
        date_stop: i.date_stop,
        impressions: Number(i.impressions || 0),
        reach: Number(i.reach || 0),
        frequency: Number(i.frequency || 0),
        clicks: Number(i.clicks || 0),
        unique_clicks: Number(i.unique_clicks || 0),
        ctr: Number(i.ctr || 0),
        unique_ctr: Number(i.unique_ctr || 0),
        spend: Number(i.spend || 0),
        cpc: Number(i.cpc || 0),
        cpm: Number(i.cpm || 0),
        cpp: Number(i.cpp || 0),
        cost_per_unique_click: Number(i.cost_per_unique_click || 0),
        messaging_conversations_started: messagingConversations,
        cost_per_messaging_conversation: costPerConversation,
        actions: i.actions || null,
        cost_per_action_type: i.cost_per_action_type || null,
        quality_ranking: i.quality_ranking || null,
        engagement_rate_ranking: i.engagement_rate_ranking || null,
        conversion_rate_ranking: i.conversion_rate_ranking || null,
        video_p25_watched_actions: videoMetric(i.video_p25_watched_actions),
        video_p50_watched_actions: videoMetric(i.video_p50_watched_actions),
        video_p75_watched_actions: videoMetric(i.video_p75_watched_actions),
        video_p100_watched_actions: videoMetric(i.video_p100_watched_actions),
        video_avg_time_watched_actions: Number(i.video_avg_time_watched_actions || 0),
        currency: 'USD',
      };

      const { data: existing } = await supabase
        .from('meta_insights_daily')
        .select('id')
        .eq('ad_id', i.ad_id)
        .eq('date_start', i.date_start)
        .is('age', null)
        .is('gender', null)
        .is('country', null)
        .is('publisher_platform', null)
        .is('platform_position', null)
        .maybeSingle();

      if (existing) {
        await supabase.from('meta_insights_daily').update(row).eq('id', existing.id);
        actualizados++;
      } else {
        await supabase.from('meta_insights_daily').insert(row);
        nuevos++;
      }
    }

    await logSync('insights', 'success', insights.length, nuevos, actualizados, null, Date.now() - startTime, dateStart, dateEnd);
    return { total: insights.length, nuevos, actualizados, periodo: { desde: dateStart, hasta: dateEnd } };
  } catch (error: any) {
    await logSync('insights', 'error', 0, 0, 0, error.message, Date.now() - startTime, dateStart, dateEnd);
    throw error;
  }
}

// --- SYNC COMPLETO ---

export async function syncAll(desde?: string, hasta?: string) {
  return {
    campaigns: await syncCampaigns(),
    adsets: await syncAdSets(),
    ads: await syncAds(),
    insights: await syncInsights(desde, hasta),
  };
}

// --- LOG HELPER ---

async function logSync(
  tipo: string, status: string, procesados: number,
  nuevos: number, actualizados: number, error: string | null,
  duracion: number, fechaDesde?: string, fechaHasta?: string
) {
  await supabase.from('meta_sync_log').insert({
    tipo, status,
    registros_procesados: procesados,
    registros_nuevos: nuevos,
    registros_actualizados: actualizados,
    error_message: error,
    duracion_ms: duracion,
    fecha_datos_desde: fechaDesde || null,
    fecha_datos_hasta: fechaHasta || null,
  });
}
