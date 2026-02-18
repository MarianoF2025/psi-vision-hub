/**
 * API Route para sincronizar datos de Meta Ads
 * 
 * POST /api/meta-sync          -> Sync completo
 * POST /api/meta-sync?tipo=X   -> Sync parcial (campaigns, adsets, ads, insights)
 * GET  /api/meta-sync          -> Ultimo estado de sincronizacion
 * 
 * Body opcional: { desde: "2025-01-01", hasta: "2025-01-31" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAll, syncCampaigns, syncAdSets, syncAds, syncInsights } from '@/lib/meta/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    if (!process.env.META_ACCESS_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales de Meta Ads no configuradas. Agrega META_ACCESS_TOKEN y META_AD_ACCOUNT_ID al .env.local'
      }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const tipo = request.nextUrl.searchParams.get('tipo');

    let resultado;
    switch (tipo) {
      case 'campaigns':
        resultado = await syncCampaigns();
        break;
      case 'adsets':
        resultado = await syncAdSets();
        break;
      case 'ads':
        resultado = await syncAds();
        break;
      case 'insights':
        resultado = await syncInsights(body.desde, body.hasta);
        break;
      default:
        resultado = await syncAll(body.desde, body.hasta);
    }

    return NextResponse.json({
      success: true,
      tipo: tipo || 'all',
      resultado,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error en meta-sync:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('meta_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      ultimo_sync: data?.[0] || null,
      historial: data || [],
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
