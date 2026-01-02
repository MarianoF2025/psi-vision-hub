import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PSI_API_URL = 'https://psi.planbsistemas.com.ar/api_alumnos.php';

// Normalizar teléfono a formato E.164
function normalizarTelefono(tel: string): string {
  if (!tel) return '';
  
  // Remover todo lo que no sea número
  let limpio = tel.replace(/\D/g, '');
  
  // Si empieza con 54 y tiene más de 10 dígitos, agregar +
  if (limpio.startsWith('54') && limpio.length >= 12) {
    return '+' + limpio;
  }
  
  // Si tiene 10-11 dígitos, asumir Argentina
  if (limpio.length >= 10 && limpio.length <= 11) {
    // Si empieza con 9, es celular sin código país
    if (limpio.startsWith('9')) {
      return '+54' + limpio;
    }
    // Si no empieza con 9, agregar 549
    return '+549' + limpio;
  }
  
  // Fallback: agregar + si no lo tiene
  return limpio.length > 0 ? '+' + limpio : '';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json().catch(() => ({}));
    const {
      fechaini = '2025-01-01',
      fechafin = new Date().toISOString().split('T')[0],
      solo_cursos = false
    } = body;

    // Registrar inicio de sync
    const { data: syncLog } = await supabase
      .from('sync_log')
      .insert({
        tipo: solo_cursos ? 'cursos' : 'inscripciones',
        fecha_inicio: fechaini,
        fecha_fin: fechafin,
        estado: 'ejecutando'
      })
      .select()
      .single();

    // Llamar API de PSI
    const url = `${PSI_API_URL}?fechaini=${fechaini}&fechafin=${fechafin}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error API PSI: ${response.status}`);
    }

    const data = await response.json();
    const alumnos = data.alumnos || [];

    let registrosProcesados = 0;
    let cursosNuevos = 0;
    let cursosActualizados = 0;
    let inscripcionesNuevas = 0;
    let inscripcionesActualizadas = 0;

    // 1. Extraer y sincronizar cursos únicos
    const cursosMap = new Map<string, string>();
    for (const alumno of alumnos) {
      for (const insc of alumno.inscripciones || []) {
        if (insc.curso && !cursosMap.has(insc.curso)) {
          cursosMap.set(insc.curso, insc.curso_nombre || insc.curso);
        }
      }
    }

    // Upsert cursos
    for (const [codigo, nombre] of cursosMap) {
      // Verificar si existe
      const { data: existente } = await supabase
        .from('cursos')
        .select('id, origen')
        .eq('codigo', codigo)
        .single();

      if (existente) {
        // Actualizar solo si es de origen PSI (no tocar manuales)
        if (existente.origen === 'psi') {
          await supabase
            .from('cursos')
            .update({
              psi_nombre: nombre,
              sincronizado_at: new Date().toISOString()
            })
            .eq('id', existente.id);
          cursosActualizados++;
        }
      } else {
        // Crear nuevo curso
        await supabase
          .from('cursos')
          .insert({
            codigo: codigo,
            nombre: nombre,
            psi_codigo: codigo,
            psi_nombre: nombre,
            origen: 'psi',
            activo: false,
            tipo_formacion: 'curso',
            sincronizado_at: new Date().toISOString()
          });
        cursosNuevos++;
      }
    }

    // 2. Sincronizar inscripciones (si no es solo_cursos)
    if (!solo_cursos) {
      for (const alumno of alumnos) {
        const telefonoNormalizado = normalizarTelefono(alumno.telefono || '');
        
        if (!telefonoNormalizado || telefonoNormalizado.length < 10) {
          continue;
        }

        for (const insc of alumno.inscripciones || []) {
          registrosProcesados++;

          const cuotas = insc.cuotas || [];
          const cuotasTotal = cuotas.filter((c: any) => c.numero < 100).length;
          const cuotasPagadas = cuotas.filter((c: any) => c.numero < 100 && c.pagada).length;
          const montoTotal = cuotas
            .filter((c: any) => c.numero < 100)
            .reduce((sum: number, c: any) => sum + (c.monto || 0), 0);
          const montoPagado = cuotas
            .filter((c: any) => c.numero < 100 && c.pagada)
            .reduce((sum: number, c: any) => sum + (c.monto || 0), 0);
          const ultimaCuotaPagada = cuotas
            .filter((c: any) => c.pagada && c.fecha_pago)
            .sort((a: any, b: any) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime())[0]?.fecha_pago || null;

          const { data: existente } = await supabase
            .from('inscripciones_psi')
            .select('id')
            .eq('telefono', telefonoNormalizado)
            .eq('curso_codigo', insc.curso)
            .single();

          if (existente) {
            await supabase
              .from('inscripciones_psi')
              .update({
                nombre: alumno.nombre,
                email: alumno.email,
                dni: alumno.dni,
                curso_nombre: insc.curso_nombre,
                fecha_inscripcion: insc.fecha_inscripcion,
                estado: insc.estado,
                cuotas_total: cuotasTotal,
                cuotas_pagadas: cuotasPagadas,
                monto_total: montoTotal,
                monto_pagado: montoPagado,
                ultima_cuota_pagada: ultimaCuotaPagada,
                sincronizado_at: new Date().toISOString()
              })
              .eq('id', existente.id);
            inscripcionesActualizadas++;
          } else {
            await supabase
              .from('inscripciones_psi')
              .insert({
                telefono: telefonoNormalizado,
                nombre: alumno.nombre,
                email: alumno.email,
                dni: alumno.dni,
                curso_codigo: insc.curso,
                curso_nombre: insc.curso_nombre,
                fecha_inscripcion: insc.fecha_inscripcion,
                estado: insc.estado,
                cuotas_total: cuotasTotal,
                cuotas_pagadas: cuotasPagadas,
                monto_total: montoTotal,
                monto_pagado: montoPagado,
                ultima_cuota_pagada: ultimaCuotaPagada
              });
            inscripcionesNuevas++;
          }
        }
      }
    }

    const duracion = Date.now() - startTime;

    if (syncLog) {
      await supabase
        .from('sync_log')
        .update({
          estado: 'completado',
          registros_procesados: registrosProcesados,
          registros_nuevos: solo_cursos ? cursosNuevos : inscripcionesNuevas,
          registros_actualizados: solo_cursos ? cursosActualizados : inscripcionesActualizadas,
          duracion_ms: duracion
        })
        .eq('id', syncLog.id);
    }

    return NextResponse.json({
      success: true,
      mensaje: 'Sincronización completada',
      estadisticas: {
        alumnos_api: alumnos.length,
        cursos: {
          nuevos: cursosNuevos,
          actualizados: cursosActualizados,
          total: cursosMap.size
        },
        inscripciones: {
          procesadas: registrosProcesados,
          nuevas: inscripcionesNuevas,
          actualizadas: inscripcionesActualizadas
        },
        duracion_ms: duracion
      }
    });

  } catch (error) {
    const duracion = Date.now() - startTime;
    console.error('Error en sincronización PSI:', error);

    await supabase
      .from('sync_log')
      .insert({
        tipo: 'error',
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
  const { data: ultimaSync } = await supabase
    .from('sync_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const { count: totalCursos } = await supabase
    .from('cursos')
    .select('*', { count: 'exact', head: true });

  const { count: cursosPsi } = await supabase
    .from('cursos')
    .select('*', { count: 'exact', head: true })
    .eq('origen', 'psi');

  const { count: totalInscripciones } = await supabase
    .from('inscripciones_psi')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    ultima_sincronizacion: ultimaSync?.[0] || null,
    historial: ultimaSync || [],
    totales: {
      cursos: totalCursos,
      cursos_psi: cursosPsi,
      inscripciones: totalInscripciones
    }
  });
}
