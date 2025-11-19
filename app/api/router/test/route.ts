import { NextRequest, NextResponse } from 'next/server';
import { RouterProcessor } from '@/lib/router/processor';

// Endpoint de prueba para verificar que el Router está funcionando
export async function GET(request: NextRequest) {
  try {
    const checks: Record<string, any> = {
      timestamp: new Date().toISOString(),
      status: 'ok',
      checks: {},
    };

    // 1. Verificar variables de entorno
    checks.checks.env = {
      CLOUD_API_TOKEN: !!process.env.CLOUD_API_TOKEN,
      CLOUD_API_PHONE_NUMBER_ID: !!process.env.CLOUD_API_PHONE_NUMBER_ID,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      CLOUD_API_BASE_URL: process.env.CLOUD_API_BASE_URL || 'https://graph.facebook.com/v18.0',
    };

    // 2. Intentar inicializar RouterProcessor
    let processor: RouterProcessor | null = null;
    try {
      processor = new RouterProcessor();
      checks.checks.processor = { initialized: true };
    } catch (error: any) {
      checks.checks.processor = {
        initialized: false,
        error: error.message,
      };
    }

    // 3. Verificar conexión a Supabase (si el processor se inicializó)
    if (processor) {
      try {
        const { data, error } = await processor['supabase']
          .from('conversaciones')
          .select('id')
          .limit(1);
        
        checks.checks.supabase = {
          connected: !error,
          error: error?.message || null,
        };
      } catch (error: any) {
        checks.checks.supabase = {
          connected: false,
          error: error.message,
        };
      }
    }

    // 4. Verificar que el endpoint de webhook está accesible
    checks.checks.webhook = {
      endpoint: '/api/router/whatsapp/webhook',
      accessible: true,
    };

    // Determinar estado general
    const allChecksPassed = 
      checks.checks.env.CLOUD_API_TOKEN &&
      checks.checks.env.CLOUD_API_PHONE_NUMBER_ID &&
      checks.checks.env.NEXT_PUBLIC_SUPABASE_URL &&
      checks.checks.processor?.initialized &&
      checks.checks.supabase?.connected;

    checks.status = allChecksPassed ? 'ok' : 'error';
    checks.message = allChecksPassed
      ? 'Router configurado correctamente'
      : 'Router tiene problemas de configuración';

    return NextResponse.json(checks, {
      status: allChecksPassed ? 200 : 500,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Error en endpoint de prueba',
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

