/**
 * Mapeo de áreas entre formato interno y formato de base de datos
 */

// Áreas internas del sistema (wsp4, admin, alumnos, ventas, comunidad, revisar)
export type AreaInterna = 'wsp4' | 'admin' | 'alumnos' | 'ventas' | 'comunidad' | 'revisar';

// Áreas de base de datos (administracion, alumnos, ventas, comunidad)
export type AreaBD = 'wsp4' | 'administracion' | 'alumnos' | 'ventas' | 'comunidad';

/**
 * Mapear área interna a formato de base de datos
 */
export function mapearAreaABD(areaInterna: AreaInterna): AreaBD {
  const mapeo: Record<AreaInterna, AreaBD> = {
    wsp4: 'wsp4',
    admin: 'administracion',
    alumnos: 'alumnos',
    ventas: 'ventas',
    comunidad: 'comunidad',
    revisar: 'administracion', // Revisar va a administración por defecto
  };

  return mapeo[areaInterna] || 'administracion';
}

/**
 * Mapear área de BD a formato interno
 */
export function mapearAreaDeBD(areaBD: AreaBD): AreaInterna {
  const mapeo: Record<AreaBD, AreaInterna> = {
    wsp4: 'wsp4',
    administracion: 'admin',
    alumnos: 'alumnos',
    ventas: 'ventas',
    comunidad: 'comunidad',
  };

  return mapeo[areaBD] || 'admin';
}

/**
 * Verificar si un área está habilitada para derivación
 */
export function esAreaHabilitada(area: AreaInterna): boolean {
  const areasHabilitadas: AreaInterna[] = ['admin', 'alumnos']; // Actualmente habilitadas
  return areasHabilitadas.includes(area);
}

/**
 * Obtener nombre amigable del área
 */
export function obtenerNombreArea(area: AreaInterna): string {
  const nombres: Record<AreaInterna, string> = {
    wsp4: 'Atención General',
    admin: 'Administración',
    alumnos: 'Alumnos',
    ventas: 'Inscripciones',
    comunidad: 'Comunidad',
    revisar: 'Revisar',
  };

  return nombres[area] || area;
}


