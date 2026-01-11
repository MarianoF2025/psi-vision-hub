import { NextRequest, NextResponse } from 'next/server';

const EVOLUTION_URL = 'https://evolution.psivisionhub.com';
const EVOLUTION_API_KEY = '467F4E2CD85F-403E-8813-527F820B70B1';
const INSTANCE_NAME = 'EME Automations';

async function evolutionRequest(endpoint: string, method: string = 'GET', body?: any) {
  const url = `${EVOLUTION_URL}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'apikey': EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || `Evolution API error: ${response.status}`);
  }
  
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const { action, simulacion, ...params } = await request.json();
    
    // ===== MODO SIMULACIÓN =====
    if (simulacion) {
      console.log(`[SIMULACIÓN] Action: ${action}`, params);
      
      switch (action) {
        case 'createGroup': {
          const fakeJid = `120363${Date.now()}@g.us`;
          console.log(`[SIMULACIÓN] Grupo creado: ${params.subject} -> ${fakeJid}`);
          return NextResponse.json({
            id: fakeJid,
            subject: params.subject,
            simulado: true,
          });
        }
        
        case 'getInviteCode': {
          const fakeCode = `SIMUL${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
          const fakeLink = `https://chat.whatsapp.com/${fakeCode}`;
          console.log(`[SIMULACIÓN] Link generado: ${fakeLink}`);
          return NextResponse.json({
            inviteUrl: fakeLink,
            code: fakeCode,
            simulado: true,
          });
        }
        
        case 'sendText': {
          const fakeMessageId = `SIMUL_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          console.log(`[SIMULACIÓN] Mensaje enviado a ${params.number}: "${params.text.substring(0, 50)}..."`);
          await new Promise(resolve => setTimeout(resolve, 300));
          return NextResponse.json({
            key: { id: fakeMessageId },
            status: 'PENDING',
            simulado: true,
          });
        }
        
        case 'revokeInviteCode': {
          console.log(`[SIMULACIÓN] Link revocado para grupo: ${params.groupJid}`);
          return NextResponse.json({
            success: true,
            simulado: true,
          });
        }
        
        default:
          return NextResponse.json({ error: 'Acción no válida', simulado: true }, { status: 400 });
      }
    }
    
    // ===== MODO REAL =====
    switch (action) {
      case 'createGroup': {
        const { subject, description } = params;
        const result = await evolutionRequest(
          `/group/create/${INSTANCE_NAME}`,
          'POST',
          {
            subject,
            description: description || '',
            participants: [],
          }
        );
        return NextResponse.json(result);
      }
      
      case 'getInviteCode': {
        const { groupJid } = params;
        const result = await evolutionRequest(
          `/group/inviteCode/${INSTANCE_NAME}?groupJid=${encodeURIComponent(groupJid)}`,
          'GET'
        );
        return NextResponse.json(result);
      }
      
      case 'sendText': {
        const { number, text } = params;
        const result = await evolutionRequest(
          `/message/sendText/${INSTANCE_NAME}`,
          'POST',
          {
            number,
            text,
          }
        );
        return NextResponse.json(result);
      }
      
      case 'revokeInviteCode': {
        const { groupJid } = params;
        const result = await evolutionRequest(
          `/group/revokeInviteCode/${INSTANCE_NAME}`,
          'PUT',
          { groupJid }
        );
        return NextResponse.json(result);
      }
      
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Evolution API error:', error);
    return NextResponse.json(
      { error: error.message || 'Error en Evolution API' },
      { status: 500 }
    );
  }
}
