// Menús del Router WSP4

import { MenuOption, SubMenuOption, MenuArea } from './types';

export const MAIN_MENU: MenuOption[] = [
  { code: '1', label: 'Administración', area: 'Administración' },
  { code: '2', label: 'Alumnos', area: 'Alumnos' },
  { code: '3', label: 'Inscripciones', area: 'Inscripciones' },
  { code: '4', label: 'Comunidad PSI y En Vivo', area: 'Comunidad' },
  { code: '5', label: 'Otra consulta', area: 'Otra consulta' },
];

export const ADMINISTRACION_SUBMENU: SubMenuOption[] = [
  { code: '11', label: 'Pagos y medios de pago', area: 'Administración', subarea: 'Pagos y medios de pago' },
  { code: '12', label: 'Problemas con el pago de la cuota', area: 'Administración', subarea: 'Problemas con el pago' },
  { code: '13', label: 'Facturas / Comprobantes', area: 'Administración', subarea: 'Facturas' },
  { code: '14', label: 'Certificados / Constancias', area: 'Administración', subarea: 'Certificados' },
  { code: '15', label: 'Otra (hablar con persona)', area: 'Administración', subarea: 'Otra' },
];

export const ALUMNOS_SUBMENU: SubMenuOption[] = [
  { code: '21', label: 'Acceso al campus', area: 'Alumnos', subarea: 'Acceso al campus' },
  { code: '22', label: 'Clases y cronograma', area: 'Alumnos', subarea: 'Clases y cronograma' },
  { code: '23', label: 'Recursos y descargas', area: 'Alumnos', subarea: 'Recursos' },
  { code: '24', label: 'Certificados académicos', area: 'Alumnos', subarea: 'Certificados académicos' },
  { code: '25', label: 'Duda académica', area: 'Alumnos', subarea: 'Duda académica' },
  { code: '26', label: 'Otra (hablar con persona)', area: 'Alumnos', subarea: 'Otra' },
];

export const INSCRIPCIONES_SUBMENU: SubMenuOption[] = [
  { code: '31', label: 'Cursos vigentes', area: 'Inscripciones', subarea: 'Cursos vigentes' },
  { code: '32', label: 'Inscripción a un curso', area: 'Inscripciones', subarea: 'Inscripción' },
  { code: '33', label: 'Formas de pago', area: 'Inscripciones', subarea: 'Formas de pago' },
  { code: '34', label: 'Modalidades (OnDemand/asincrónico)', area: 'Inscripciones', subarea: 'Modalidades' },
  { code: '35', label: 'Promos / Becas / Descuento a Alumnos', area: 'Inscripciones', subarea: 'Promociones' },
  { code: '36', label: 'Hablar con asesora', area: 'Inscripciones', subarea: 'Asesora' },
];

export const COMUNIDAD_SUBMENU: SubMenuOption[] = [
  { code: '41', label: 'Acceso a Comunidad PSI', area: 'Comunidad', subarea: 'Acceso' },
  { code: '42', label: 'Calendario de vivos y eventos', area: 'Comunidad', subarea: 'Calendario' },
  { code: '43', label: 'Ingreso a transmisión en vivo', area: 'Comunidad', subarea: 'Transmisión en vivo' },
  { code: '44', label: 'Grabaciones / Repeticiones de vivos', area: 'Comunidad', subarea: 'Grabaciones' },
  { code: '45', label: 'Recursos y materiales de Comunidad', area: 'Comunidad', subarea: 'Recursos' },
  { code: '46', label: 'Problemas técnicos', area: 'Comunidad', subarea: 'Problemas técnicos' },
  { code: '47', label: 'Otra (hablar con persona)', area: 'Comunidad', subarea: 'Otra' },
];

export function getMainMenuText(): string {
  const menuText = MAIN_MENU.map(opt => `${opt.code}. ${opt.label}`).join('\n');
  return `¡Hola! 👋 Para ayudarte mejor, elegí el área con un número:\n\n${menuText}\n\n(Escribí MENU para volver a este menú)`;
}

export function getSubmenuText(area: MenuArea): string {
  let submenu: SubMenuOption[] = [];
  
  switch (area) {
    case 'Administración':
      submenu = ADMINISTRACION_SUBMENU;
      break;
    case 'Alumnos':
      submenu = ALUMNOS_SUBMENU;
      break;
    case 'Inscripciones':
      submenu = INSCRIPCIONES_SUBMENU;
      break;
    case 'Comunidad':
      submenu = COMUNIDAD_SUBMENU;
      break;
    default:
      return '';
  }

  const menuText = submenu.map(opt => `${opt.code}- ${opt.label}`).join('\n');
  return `${area}:\n\n${menuText}\n\n(Escribí VOLVER para volver al menú principal)`;
}

export function findMainMenuOption(code: string): MenuOption | undefined {
  return MAIN_MENU.find(opt => opt.code === code);
}

export function findSubmenuOption(area: MenuArea, code: string): SubMenuOption | undefined {
  let submenu: SubMenuOption[] = [];
  
  switch (area) {
    case 'Administración':
      submenu = ADMINISTRACION_SUBMENU;
      break;
    case 'Alumnos':
      submenu = ALUMNOS_SUBMENU;
      break;
    case 'Inscripciones':
      submenu = INSCRIPCIONES_SUBMENU;
      break;
    case 'Comunidad':
      submenu = COMUNIDAD_SUBMENU;
      break;
    default:
      return undefined;
  }

  return submenu.find(opt => opt.code === code);
}

