// ===========================================
// CONFIGURACIÓN DE MENÚS INTERACTIVOS - Router WSP4
// Versión 3.2.0 - Títulos cortos para WhatsApp
// ===========================================

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface InteractiveList {
  header?: string;
  body: string;
  footer?: string;
  buttonText: string;
  sections: ListSection[];
}

// ===========================================
// MENÚ PRINCIPAL
// ===========================================
export const MENU_PRINCIPAL_INTERACTIVO: InteractiveList = {
  header: '¡Hola! 👋',
  body: '¡Bienvenidos a Asociación PSI!\n\n¿En qué podemos ayudarte hoy?',
  footer: 'Elegí una opción del menú',
  buttonText: 'Ver áreas',
  sections: [
    {
      title: 'Áreas de atención',
      rows: [
        { id: 'area_admin', title: '🏛️ Administración', description: 'Pagos, facturas, certificados' },
        { id: 'area_alumnos', title: '🎓 Alumnos', description: 'Campus, clases, recursos' },
        { id: 'area_inscripciones', title: '📝 Inscripciones', description: 'Cursos, precios, promos' },
        { id: 'area_comunidad', title: '👥 Comunidad PSI', description: 'Vivos, grabaciones, eventos' },
        { id: 'area_otra', title: '💬 Otra consulta', description: 'Hablar con una persona' },
      ],
    },
  ],
};

// ===========================================
// SUBMENÚ ADMINISTRACIÓN
// ===========================================
export const SUBMENU_ADMIN_INTERACTIVO: InteractiveList = {
  header: '🏛️ Administración',
  body: '¿Qué necesitás?',
  footer: 'Elegí una opción',
  buttonText: 'Ver opciones',
  sections: [
    {
      title: 'Consultas',
      rows: [
        { id: 'admin_pagos', title: '💳 Pagos', description: 'Formas de pago disponibles' },
        { id: 'admin_cuota', title: '📊 Mi cuota', description: 'Consultas sobre cuotas' },
        { id: 'admin_facturas', title: '📄 Facturas', description: 'Solicitar factura' },
        { id: 'admin_certificados', title: '📜 Certificados', description: 'Solicitar documentos' },
        { id: 'admin_otro', title: '💬 Otra consulta', description: 'Hablar con una persona' },
        { id: 'volver', title: '⬅️ Volver', description: 'Menú principal' },
      ],
    },
  ],
};

// ===========================================
// SUBMENÚ ALUMNOS
// ===========================================
export const SUBMENU_ALUMNOS_INTERACTIVO: InteractiveList = {
  header: '🎓 Alumnos',
  body: '¿Qué necesitás?',
  footer: 'Elegí una opción',
  buttonText: 'Ver opciones',
  sections: [
    {
      title: 'Consultas',
      rows: [
        { id: 'alumnos_campus', title: '🖥️ Campus', description: 'Problemas de acceso' },
        { id: 'alumnos_clases', title: '📅 Clases', description: 'Horarios y cronograma' },
        { id: 'alumnos_recursos', title: '📚 Recursos', description: 'Material de estudio' },
        { id: 'alumnos_certificados', title: '🎓 Certificados', description: 'Solicitar certificados' },
        { id: 'alumnos_duda', title: '❓ Duda académica', description: 'Consultas sobre contenido' },
        { id: 'alumnos_otro', title: '💬 Otra consulta', description: 'Hablar con una persona' },
        { id: 'volver', title: '⬅️ Volver', description: 'Menú principal' },
      ],
    },
  ],
};

// ===========================================
// SUBMENÚ INSCRIPCIONES
// ===========================================
export const SUBMENU_INSCRIPCIONES_INTERACTIVO: InteractiveList = {
  header: '📝 Inscripciones',
  body: '¿Qué te interesa?',
  footer: 'Elegí una opción',
  buttonText: 'Ver opciones',
  sections: [
    {
      title: 'Consultas',
      rows: [
        { id: 'inscripciones_cursos', title: '📚 Info de cursos', description: 'Contenido y duración' },
        { id: 'inscripciones_precios', title: '💰 Precios y promos', description: 'Formas de pago' },
        { id: 'inscripciones_fechas', title: '📅 Fechas de inicio', description: 'Próximas cohortes' },
        { id: 'inscripciones_requisitos', title: '📋 Requisitos', description: 'Para inscribirte' },
        { id: 'inscripciones_inscribir', title: '✅ Quiero inscribirme', description: 'Comenzar inscripción' },
        { id: 'inscripciones_otro', title: '💬 Otra consulta', description: 'Hablar con una persona' },
        { id: 'volver', title: '⬅️ Volver', description: 'Menú principal' },
      ],
    },
  ],
};

// ===========================================
// SUBMENÚ COMUNIDAD
// ===========================================
export const SUBMENU_COMUNIDAD_INTERACTIVO: InteractiveList = {
  header: '👥 Comunidad PSI',
  body: '¿Qué necesitás?',
  footer: 'Elegí una opción',
  buttonText: 'Ver opciones',
  sections: [
    {
      title: 'Comunidad y Vivos',
      rows: [
        { id: 'comunidad_acceso', title: '🔑 Acceso', description: 'Ingreso / suscripción' },
        { id: 'comunidad_calendario', title: '📅 Calendario', description: 'Próximos eventos' },
        { id: 'comunidad_transmision', title: '📺 Ver en vivo', description: 'Ingreso a transmisión' },
        { id: 'comunidad_grabaciones', title: '🎬 Grabaciones', description: 'Repeticiones de vivos' },
        { id: 'comunidad_recursos', title: '📚 Recursos', description: 'Material de comunidad' },
        { id: 'comunidad_tecnico', title: '🔧 Soporte técnico', description: 'No me abre / no veo' },
        { id: 'volver', title: '⬅️ Volver', description: 'Menú principal' },
      ],
    },
  ],
};

// ===========================================
// MAPEO DE IDS A ACCIONES
// ===========================================
export interface AccionMenu {
  tipo: 'submenu' | 'derivar' | 'volver';
  submenu?: string;
  area?: string;
  subetiqueta?: string;
  mensaje_contexto?: string;
}

export const ACCIONES_MENU: Record<string, AccionMenu> = {
  // Menú principal
  'area_admin': { tipo: 'submenu', submenu: 'admin' },
  'area_alumnos': { tipo: 'submenu', submenu: 'alumnos' },
  'area_inscripciones': { tipo: 'submenu', submenu: 'inscripciones' },
  'area_comunidad': { tipo: 'submenu', submenu: 'comunidad' },
  'area_otra': { tipo: 'derivar', area: 'administracion', subetiqueta: 'otra_consulta', mensaje_contexto: 'Otra consulta' },

  // Submenú Administración
  'admin_pagos': { tipo: 'derivar', area: 'administracion', subetiqueta: 'pagos', mensaje_contexto: 'Pagos y medios de pago' },
  'admin_cuota': { tipo: 'derivar', area: 'administracion', subetiqueta: 'cuota', mensaje_contexto: 'Problemas con la cuota' },
  'admin_facturas': { tipo: 'derivar', area: 'administracion', subetiqueta: 'facturas', mensaje_contexto: 'Facturas / Comprobantes' },
  'admin_certificados': { tipo: 'derivar', area: 'administracion', subetiqueta: 'certificados', mensaje_contexto: 'Certificados / Constancias' },
  'admin_otro': { tipo: 'derivar', area: 'administracion', subetiqueta: 'otro', mensaje_contexto: 'Otra consulta administrativa' },

  // Submenú Alumnos
  'alumnos_campus': { tipo: 'derivar', area: 'alumnos', subetiqueta: 'campus', mensaje_contexto: 'Acceso al campus' },
  'alumnos_clases': { tipo: 'derivar', area: 'alumnos', subetiqueta: 'clases', mensaje_contexto: 'Clases y cronograma' },
  'alumnos_recursos': { tipo: 'derivar', area: 'alumnos', subetiqueta: 'recursos', mensaje_contexto: 'Recursos y descargas' },
  'alumnos_certificados': { tipo: 'derivar', area: 'alumnos', subetiqueta: 'certificados', mensaje_contexto: 'Certificados académicos' },
  'alumnos_duda': { tipo: 'derivar', area: 'alumnos', subetiqueta: 'duda', mensaje_contexto: 'Duda académica' },
  'alumnos_otro': { tipo: 'derivar', area: 'alumnos', subetiqueta: 'otro', mensaje_contexto: 'Otra consulta de alumnos' },

  // Submenú Inscripciones (deriva a Ventas)
  'inscripciones_cursos': { tipo: 'derivar', area: 'ventas', subetiqueta: 'cursos', mensaje_contexto: 'Info de cursos' },
  'inscripciones_precios': { tipo: 'derivar', area: 'ventas', subetiqueta: 'precios', mensaje_contexto: 'Precios y promos' },
  'inscripciones_fechas': { tipo: 'derivar', area: 'ventas', subetiqueta: 'fechas', mensaje_contexto: 'Fechas de inicio' },
  'inscripciones_requisitos': { tipo: 'derivar', area: 'ventas', subetiqueta: 'requisitos', mensaje_contexto: 'Requisitos de inscripción' },
  'inscripciones_inscribir': { tipo: 'derivar', area: 'ventas', subetiqueta: 'inscribir', mensaje_contexto: 'Quiero inscribirme' },
  'inscripciones_otro': { tipo: 'derivar', area: 'ventas', subetiqueta: 'otro', mensaje_contexto: 'Otra consulta de inscripción' },

  // Submenú Comunidad
  'comunidad_acceso': { tipo: 'derivar', area: 'comunidad', subetiqueta: 'acceso', mensaje_contexto: 'Acceso a Comunidad PSI' },
  'comunidad_calendario': { tipo: 'derivar', area: 'comunidad', subetiqueta: 'calendario', mensaje_contexto: 'Calendario de vivos' },
  'comunidad_transmision': { tipo: 'derivar', area: 'comunidad', subetiqueta: 'transmision', mensaje_contexto: 'Ingreso a transmisión' },
  'comunidad_grabaciones': { tipo: 'derivar', area: 'comunidad', subetiqueta: 'grabaciones', mensaje_contexto: 'Grabaciones / Repeticiones' },
  'comunidad_recursos': { tipo: 'derivar', area: 'comunidad', subetiqueta: 'recursos', mensaje_contexto: 'Recursos y materiales' },
  'comunidad_tecnico': { tipo: 'derivar', area: 'comunidad', subetiqueta: 'tecnico', mensaje_contexto: 'Problemas técnicos' },

  // Volver
  'volver': { tipo: 'volver' },
};

// ===========================================
// FUNCIONES
// ===========================================
export function obtenerMenuInteractivo(menuId: string): InteractiveList | null {
  const menus: Record<string, InteractiveList> = {
    'principal': MENU_PRINCIPAL_INTERACTIVO,
    'admin': SUBMENU_ADMIN_INTERACTIVO,
    'alumnos': SUBMENU_ALUMNOS_INTERACTIVO,
    'inscripciones': SUBMENU_INSCRIPCIONES_INTERACTIVO,
    'comunidad': SUBMENU_COMUNIDAD_INTERACTIVO,
  };
  return menus[menuId] || null;
}

export function obtenerAccion(id: string): AccionMenu | null {
  return ACCIONES_MENU[id] || null;
}
