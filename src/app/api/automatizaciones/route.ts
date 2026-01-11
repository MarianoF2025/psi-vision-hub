import { NextRequest, NextResponse } from 'next/server';

const API_URL = 'http://localhost:3003';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    // Reenviar todos los query params excepto 'path'
    const forwardParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'path') {
        forwardParams.append(key, value);
      }
    });
    
    const queryString = forwardParams.toString();
    const fullUrl = queryString 
      ? `${API_URL}/api/${path}?${queryString}` 
      : `${API_URL}/api/${path}`;
    
    const res = await fetch(fullUrl, {
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxy automatizaciones:', error);
    return NextResponse.json({ success: false, error: 'Error conectando con servicio' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const body = await request.json();
    
    const res = await fetch(`${API_URL}/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxy automatizaciones POST:', error);
    return NextResponse.json({ success: false, error: 'Error conectando con servicio' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const body = await request.json();
    
    const res = await fetch(`${API_URL}/api/${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxy automatizaciones PUT:', error);
    return NextResponse.json({ success: false, error: 'Error conectando con servicio' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    const res = await fetch(`${API_URL}/api/${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxy automatizaciones PATCH:', error);
    return NextResponse.json({ success: false, error: 'Error conectando con servicio' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    const res = await fetch(`${API_URL}/api/${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxy automatizaciones DELETE:', error);
    return NextResponse.json({ success: false, error: 'Error conectando con servicio' }, { status: 500 });
  }
}
