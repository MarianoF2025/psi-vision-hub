import { Area } from '../models/enums';
import { MenuResponse } from '../models/types';

const MENU_PRINCIPAL = `Hola! Para ayudarte mejor, elegi el area con un numero:

1) Administracion
2) Alumnos
3) Inscripciones
4) Comunidad PSI y En Vivo
5) Otra consulta

(Escribi MENU para volver a este menu)`;

const SUBMENUS: Record<Area, { title: string; options: Record<string, string> }> = {
  [Area.ADMINISTRACION]: {
    title: 'Administracion',
    options: {
      '11': 'Pagos',
      '12': 'Cuota',
      '13': 'Facturas',
      '14': 'Certificados',
      '15': 'Otro',
    },
  },
  [Area.ALUMNOS]: {
    title: 'Alumnos',
    options: {
      '21': 'Campus',
      '22': 'Clases',
      '23': 'Recursos',
      '24': 'Certificados',
      '25': 'Dudas',
      '26': 'Otro',
    },
  },
  [Area.INSCRIPCIONES]: {
    title: 'Inscripciones',
    options: {
      '31': 'Programas vigentes',
      '32': 'Proceso de inscripcion',
      '33': 'Pagos',
      '34': 'Modalidad',
      '35': 'Promociones',
      '36': 'Asesora',
    },
  },
  [Area.COMUNIDAD]: {
    title: 'Comunidad PSI',
    options: {
      '41': 'Acceso',
      '42': 'Calendario',
      '43': 'Transmision',
      '44': 'Grabaciones',
      '45': 'Recursos',
      '46': 'Tecnicos',
      '47': 'Otro',
    },
  },
  [Area.VENTAS1]: {
    title: 'Ventas 1',
    options: {
      '51': 'Meta Ads',
      '52': 'Derivado WSP4',
    },
  },
};

export class MenuService {
  getMenuPrincipal(): MenuResponse {
    return { reply: MENU_PRINCIPAL, submenu: 'principal' };
  }

  procesarEntrada(texto: string): MenuResponse {
    const normalizado = texto.trim().toLowerCase();

    if (['menu', 'volver'].includes(normalizado)) {
      return this.getMenuPrincipal();
    }

    const seleccion = normalizado.replace(/[^0-9]/g, '');

    switch (seleccion) {
      case '1':
        return this.buildSubmenu(Area.ADMINISTRACION);
      case '2':
        return this.buildSubmenu(Area.ALUMNOS);
      case '3':
        return this.buildSubmenu(Area.INSCRIPCIONES);
      case '4':
        return this.buildSubmenu(Area.COMUNIDAD);
      case '5':
        return {
          reply: 'Contanos mas sobre tu consulta y un asesor te respondera en breve.',
          derivar: true,
        };
      default:
        return this.procesarSubmenuSeleccion(seleccion);
    }
  }

  private buildSubmenu(area: Area): MenuResponse {
    const submenu = SUBMENUS[area];
    const lines = Object.entries(submenu.options)
      .map(([code, desc]) => `${code} - ${desc}`)
      .join('\n');

    return {
      reply: `Area ${submenu.title}:
${lines}

Escribi el codigo que mejor describa tu consulta o MENU para volver.`,
      submenu: area,
      area,
    };
  }

  private procesarSubmenuSeleccion(seleccion: string): MenuResponse {
    for (const [areaKey, submenu] of Object.entries(SUBMENUS)) {
      if (submenu.options[seleccion]) {
        return {
          reply: `Perfecto, derivamos tu consulta de ${submenu.title} (${submenu.options[seleccion]}). Un asesor te respondera en breve.`,
          area: areaKey as Area,
          derivar: true,
        };
      }
    }

    return {
      reply: 'No reconocimos tu opcion. Por favor, escribi un numero valido o MENU para volver.',
    };
  }
}

export const menuService = new MenuService();
