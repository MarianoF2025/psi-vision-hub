import { createClient } from '@supabase/supabase-js';
import { AttributionData } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function extractLinks(text: string): string[] {
  if (!text) return [];
  const regex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(regex);
  return matches || [];
}

export function parseUtmParams(url: string) {
  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
      landing_page: parsed.origin + parsed.pathname,
    };
  } catch {
    return {};
  }
}

export function parseAttributionFromReferral(referral: any): AttributionData {
  if (!referral) return {};
  return {
    campaign_id: referral.campaign_id,
    adset_id: referral.adset_id,
    ad_id: referral.ad_id,
    utm_source: referral.source,
    utm_medium: referral.medium,
    utm_campaign: referral.campaign,
    landing_page: referral.body,
    referral_url: referral.ref,
  };
}

export async function saveAttributionData(
  conversationId: string,
  attribution: AttributionData
) {
  if (!attribution || Object.keys(attribution).length === 0) return;

  await supabase.from('attribution_data').insert({
    conversation_id: conversationId,
    ...attribution,
    created_at: new Date().toISOString(),
  });
}

