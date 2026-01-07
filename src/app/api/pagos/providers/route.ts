import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PAYMENTS_API = process.env.PAYMENTS_API_URL || 'http://localhost:3005';

export async function GET() {
  try {
    const res = await fetch(PAYMENTS_API + '/api/providers', {
      cache: 'no-store'
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ success: false, providers: [] });
  }
}
