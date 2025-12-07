// ===========================================
// CONFIGURACIÓN DE MENÚS - Router WSP4
// Versión 2.0.0 - Con códigos de 2 dígitos
// ===========================================
import { Area } from '../types/database';

// Estructura de opción de menú
export interface MenuOption {
  opcion: string;          // "1", "2", "11", "22", etc.
  texto: string;           // Texto que se muestra
  area?: Area;             // Área de destino (si deriva)
  subetiqueta?: string;    // Subetiqueta para el área
  submenu?: string;        // ID del submenú (si tiene)
  requiere_proxy: boolean; // Si requiere proxy después de derivar
  mensaje_cierre?: string; // Mensaje al derivar
}

// Estructura de menú completo
export interface Menu {
  id: string;
  titulo: string;
  opciones: MenuOption[];
  mensaje_volver?: string;
}

// ===========================================
// MENÚ PRINCIPAL
// ===========================================
export const MENU_PRINCIPAL: Menu = {
  id: 'principal',
  titulo: '¡Bienvenidos a Asociación PSI! 👋\n\nPara ayudarte mejor, elegí el área con un número:',
  opciones: [
    {
      opcion: '1',
      texto: 'Administración',
      submenu: 'admin',
      requiere_proxy: false,
    },
    {
      opcion: '2',
      texto: 'Alumnos',
      submenu: 'alumnos',
      requiere_proxy: false,
    },
    {
      opcion: '3',
      texto: 'Inscripciones',
      submenu: 'ventas',
      requiere_proxy: false,
    },
    {
      opcion: '4',
      texto: 'Comunidad PSI y En Vivo',
      submenu: 'comunidad',
      requiere_proxy: false,
    },
    {
      opcion: '5',
      texto: 'Otra consulta',
      area: 'admin',
      subetiqueta: 'otra_consulta',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Administración*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
  ],
  mensaje_volver: '💬 Escribí MENU para volver a este menú',
};

// ===========================================
// SUBMENÚ ADMINISTRACIÓN
// ===========================================
export const SUBMENU_ADMIN: Menu = {
  id: 'admin',
  titulo: '🟨 *Administración*',
  opciones: [
    {
      opcion: '11',
      texto: 'Pagos y medios de pago',
      area: 'admin',
      subetiqueta: 'pagos',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Administración*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '12',
      texto: 'Problemas con la cuota',
      area: 'admin',
      subetiqueta: 'cuota',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Administración*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '13',
      texto: 'Facturas / Comprobantes',
      area: 'admin',
      subetiqueta: 'facturas',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Administración*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '14',
      texto: 'Certificados / Constancias',
      area: 'admin',
      subetiqueta: 'certificados',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Administración*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '15',
      texto: 'Otra (hablar con persona)',
      area: 'admin',
      subetiqueta: 'otro',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Administración*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
  ],
  mensaje_volver: '💬 Escribí VOLVER para menú principal',
};

// ===========================================
// SUBMENÚ ALUMNOS
// ===========================================
export const SUBMENU_ALUMNOS: Menu = {
  id: 'alumnos',
  titulo: '🟧 *Alumnos*',
  opciones: [
    {
      opcion: '21',
      texto: 'Acceso al campus',
      area: 'alumnos',
      subetiqueta: 'campus',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Alumnos*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '22',
      texto: 'Clases y cronograma',
      area: 'alumnos',
      subetiqueta: 'clases',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Alumnos*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '23',
      texto: 'Recursos y descargas',
      area: 'alumnos',
      subetiqueta: 'recursos',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Alumnos*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '24',
      texto: 'Certificados académicos',
      area: 'alumnos',
      subetiqueta: 'certificados',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Alumnos*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '25',
      texto: 'Duda académica',
      area: 'alumnos',
      subetiqueta: 'duda',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Alumnos*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '26',
      texto: 'Otra (hablar con persona)',
      area: 'alumnos',
      subetiqueta: 'otro',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Alumnos*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
  ],
  mensaje_volver: '💬 Escribí VOLVER para menú principal',
};

// ===========================================
// SUBMENÚ VENTAS (INSCRIPCIONES)
// ===========================================
export const SUBMENU_VENTAS: Menu = {
  id: 'ventas',
  titulo: '🟪 *Inscripciones*',
  opciones: [
    {
      opcion: '31',
      texto: 'Cursos vigentes',
      area: 'ventas',
      subetiqueta: 'vigentes',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Inscripciones*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '32',
      texto: 'Inscripción a un curso',
      area: 'ventas',
      subetiqueta: 'inscripcion',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Inscripciones*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '33',
      texto: 'Formas de pago',
      area: 'ventas',
      subetiqueta: 'pagos',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Inscripciones*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '34',
      texto: 'Modalidades',
      area: 'ventas',
      subetiqueta: 'modalidades',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Inscripciones*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '35',
      texto: 'Promos / Becas',
      area: 'ventas',
      subetiqueta: 'promos',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Inscripciones*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '36',
      texto: 'Hablar con asesora',
      area: 'ventas',
      subetiqueta: 'asesora',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Inscripciones*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
  ],
  mensaje_volver: '💬 Escribí VOLVER para menú principal',
};

// ===========================================
// SUBMENÚ COMUNIDAD
// ===========================================
export const SUBMENU_COMUNIDAD: Menu = {
  id: 'comunidad',
  titulo: '🟦 *Comunidad PSI y En Vivo*',
  opciones: [
    {
      opcion: '41',
      texto: 'Acceso a Comunidad PSI (ingreso / suscripción)',
      area: 'comunidad',
      subetiqueta: 'acceso',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Comunidad PSI*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '42',
      texto: 'Calendario de vivos y eventos',
      area: 'comunidad',
      subetiqueta: 'calendario',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Comunidad PSI*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '43',
      texto: 'Ingreso a transmisión en vivo',
      area: 'comunidad',
      subetiqueta: 'transmision',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Comunidad PSI*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '44',
      texto: 'Grabaciones / Repeticiones de vivos',
      area: 'comunidad',
      subetiqueta: 'grabaciones',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Comunidad PSI*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '45',
      texto: 'Recursos y materiales de Comunidad',
      area: 'comunidad',
      subetiqueta: 'recursos',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Comunidad PSI*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
    {
      opcion: '46',
      texto: 'Problemas técnicos (no me abre / no veo / no se escucha)',
      area: 'comunidad',
      subetiqueta: 'tecnico',
      requiere_proxy: true,
      mensaje_cierre: '✅ Tu consulta fue derivada a *Comunidad PSI*. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
    },
  ],
  mensaje_volver: '💬 Escribí VOLVER para menú principal',
};

// ===========================================
// MAPA DE MENÚS
// ===========================================
export const MENUS: Record<string, Menu> = {
  principal: MENU_PRINCIPAL,
  admin: SUBMENU_ADMIN,
  alumnos: SUBMENU_ALUMNOS,
  ventas: SUBMENU_VENTAS,
  comunidad: SUBMENU_COMUNIDAD,
};

// ===========================================
// FUNCIONES AUXILIARES
// ===========================================

/**
 * Generar texto del menú para enviar por WhatsApp
 */
export function generarTextoMenu(menu: Menu): string {
  let texto = menu.titulo + '\n\n';
  
  menu.opciones.forEach(opt => {
    // Si la opción tiene más de 1 dígito, mostrar como "XX) Texto"
    // Si tiene 1 dígito, mostrar como "X) Texto" o con emoji
    if (opt.opcion.length === 2) {
      texto += `${opt.opcion}) ${opt.texto}\n`;
    } else {
      texto += `${opt.opcion}️⃣ ${opt.texto}\n`;
    }
  });
  
  if (menu.mensaje_volver) {
    texto += `\n${menu.mensaje_volver}`;
  }
  
  // Agregar instrucciones adicionales según el menú
  if (menu.id === 'principal') {
    texto += '\n\nEscribí el número (ej: 1)';
  } else {
    texto += '\n\nElegí el código (ej: ' + menu.opciones[0].opcion + ')';
  }
  
  return texto;
}

/**
 * Buscar opción en un menú
 */
export function buscarOpcion(menuId: string, opcion: string): MenuOption | null {
  const menu = MENUS[menuId];
  if (!menu) return null;
  
  return menu.opciones.find(opt => opt.opcion === opcion) || null;
}

/**
 * Buscar opción por código de 2 dígitos (permite buscar en cualquier menú)
 * Útil para detectar códigos como "11", "22", "33", etc. desde el menú principal
 */
export function buscarOpcionPorCodigo(codigo: string): { opcion: MenuOption; menuId: string } | null {
  // Buscar en todos los submenús
  const submenus = ['admin', 'alumnos', 'ventas', 'comunidad'];
  
  for (const menuId of submenus) {
    const menu = MENUS[menuId];
    if (menu) {
      const opcion = menu.opciones.find(opt => opt.opcion === codigo);
      if (opcion) {
        return { opcion, menuId };
      }
    }
  }
  
  return null;
}

/**
 * Verificar si es comando especial
 */
export function esComandoEspecial(mensaje: string): 'MENU' | 'VOLVER' | null {
  const limpio = mensaje.trim().toUpperCase();
  
  if (limpio === 'MENU') return 'MENU';
  if (limpio === 'VOLVER') return 'VOLVER';
  
  return null;
}

/**
 * Obtener menú padre
 */
export function obtenerMenuPadre(menuActual: string): string {
  // Todos los submenús vuelven al principal
  return 'principal';
}
