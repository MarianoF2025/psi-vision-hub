import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PAYMENTS_API = process.env.PAYMENTS_API_URL || 'http://localhost:3005';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pasar todos los query params al microservicio
    const params = new URLSearchParams();
    
    const estado = searchParams.get('estado');
    const provider = searchParams.get('provider');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const limit = searchParams.get('limit');
    const busqueda = searchParams.get('busqueda');
    
    if (estado && estado !== 'todos') params.append('estado', estado);
    if (provider && provider !== 'todos') params.append('provider', provider);
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    if (limit) params.append('limit', limit);
    
    const url = `${PAYMENTS_API}/api/pagos${params.toString() ? '?' + params.toString() : ''}`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const data = await res.json();

    if (!data.success) {
      return NextResponse.json({ success: false, error: data.error }, { status: 400 });
    }

    // Si hay búsqueda, filtrar en el frontend (el microservicio no tiene búsqueda por texto)
    let pagos = data.pagos || [];
    
    if (busqueda && busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase().trim();
      pagos = pagos.filter((p: any) => 
        p.descripcion?.toLowerCase().includes(busquedaLower) ||
        p.id?.toLowerCase().includes(busquedaLower) ||
        p.provider_payment_id?.toLowerCase().includes(busquedaLower)
      );
    }

    return NextResponse.json({
      success: true,
      pagos,
    });
  } catch (error) {
    console.error('Error listando pagos:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
