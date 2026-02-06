import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COMUNIDAD_API_URL = 'https://psi.planbsistemas.com.ar/api_alumnos.php?codigocur=comunidad';

// Normalizar teléfono a formato E.164
function normalizarTelefono(tel: string): string {
  if (!tel) return '';
  
  let limpio = tel.replace(/\D/g, '');
  
  if (limpio.startsWith('54') && limpio.length >= 12) {
    return '+' + limpio;
  }
  
  if (limpio.length >= 10 && limpio.length <= 11) {
    if (limpio.startsWith('9')) {
      return '+54' + limpio;
    }
    return '+549' + limpio;
  }
  
  return limpio.length > 0 ? '+' + limpio : '';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[SYNC COMUNIDAD] Iniciando sincronización...');
  
  try {
    // 1. Llamar API de Comunidad LC
    console.log('[SYNC COMUNIDAD] Fetching API...');
    const response = await fetch(COMUNIDAD_API_URL, {
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      throw new Error(`Error API Comunidad: ${response.status}`);
    }
    
    const data = await response.json();
    const alumnos = data.alumnos || [];
    console.log(`[SYNC COMUNIDAD] Recibidos ${alumnos.length} registros de API`);
    
    // 2. Preparar datos y DEDUPLICAR por email (el último gana)
    let registrosSinEmail = 0;
    const emailMap = new Map();
    
    for (const alumno of alumnos) {
      if (!alumno.email || !alumno.email.trim()) {
        registrosSinEmail++;
        continue;
      }
      
      const emailNorm = alumno.email.toLowerCase().trim();
      
      // Sobrescribe si ya existe (el último gana)
      emailMap.set(emailNorm, {
        email: emailNorm,
        telefono: normalizarTelefono(alumno.telefono || '') || null,
        nombre: alumno.nombre ? alumno.nombre.trim() : null,
        dni: alumno.dni ? alumno.dni.trim() : null,
        updated_at: new Date().toISOString()
      });
    }
    
    const registrosParaUpsert = Array.from(emailMap.values());
    console.log(`[SYNC COMUNIDAD] Preparados ${registrosParaUpsert.length} registros únicos para upsert (deduplicados de ${alumnos.length - registrosSinEmail})`);
    
    // 3. Contar registros existentes antes del upsert
    const { count: countAntes } = await supabase
      .from('comunidad_lc')
      .select('*', { count: 'exact', head: true });
    
    // 4. Batch upsert
    const { error: upsertError } = await supabase
      .from('comunidad_lc')
      .upsert(registrosParaUpsert, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      });
    
    if (upsertError) {
      throw new Error(`Error en upsert: ${upsertError.message}`);
    }
    
    // 5. Contar registros después del upsert
    const { count: countDespues } = await supabase
      .from('comunidad_lc')
      .select('*', { count: 'exact', head: true });
    
    const registrosNuevos = (countDespues || 0) - (countAntes || 0);
    const registrosActualizados = registrosParaUpsert.length - registrosNuevos;
    
    const duracion = Date.now() - startTime;
    console.log(`[SYNC COMUNIDAD] Completado en ${duracion}ms - Nuevos: ${registrosNuevos}, Actualizados: ${registrosActualizados}`);
    
    // 6. Registrar en sync_log
    await supabase
      .from('sync_log')
      .insert({
        tipo: 'comunidad_lc',
        estado: 'completado',
        registros_procesados: alumnos.length,
        registros_nuevos: registrosNuevos,
        registros_actualizados: registrosActualizados,
        duracion_ms: duracion
      });
    
    return NextResponse.json({
      success: true,
      mensaje: 'Sincronización Comunidad LC completada',
      estadisticas: {
        total_api: alumnos.length,
        sin_email: registrosSinEmail,
        duplicados_en_api: (alumnos.length - registrosSinEmail) - registrosParaUpsert.length,
        procesados_unicos: registrosParaUpsert.length,
        nuevos: registrosNuevos,
        actualizados: registrosActualizados,
        total_en_tabla: countDespues,
        duracion_ms: duracion
      }
    });
    
  } catch (error) {
    const duracion = Date.now() - startTime;
    console.error('[SYNC COMUNIDAD] Error:', error);
    
    await supabase
      .from('sync_log')
      .insert({
        tipo: 'comunidad_lc',
        estado: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido',
        duracion_ms: duracion
      });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data: ultimaSync } = await supabase
      .from('sync_log')
      .select('*')
      .eq('tipo', 'comunidad_lc')
      .order('created_at', { ascending: false })
      .limit(5);
    
    const { count: totalComunidad } = await supabase
      .from('comunidad_lc')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      ultima_sincronizacion: ultimaSync?.[0] || null,
      historial: ultimaSync || [],
      total_registros: totalComunidad
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
