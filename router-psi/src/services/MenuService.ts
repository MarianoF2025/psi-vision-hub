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
    Logger.info('[MenuService] Generando menú principal');
    const response = { reply: MENU_PRINCIPAL, submenu: 'principal' };
    Logger.info('[MenuService] Menú principal generado', { 
      replyLength: response.reply.length,
      submenu: response.submenu 
    });
    return response;
  }

  procesarEntrada(texto: string): MenuResponse {
    const normalizado = texto.trim().toLowerCase();
    Logger.info('[MenuService] Procesando entrada', { texto, normalizado });

    // Detectar saludos y devolver menú principal
    const saludos = ['hola', 'hi', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia', 'buenas'];
    if (saludos.includes(normalizado)) {
      Logger.info('[MenuService] Saludo detectado, devolviendo menú principal', { saludo: normalizado });
      return this.getMenuPrincipal();
    }

    if (['menu', 'volver'].includes(normalizado)) {
      Logger.info('[MenuService] Comando MENU/VOLVER detectado');
      return this.getMenuPrincipal();
    }

    const seleccion = normalizado.replace(/[^0-9]/g, '');
    Logger.info('[MenuService] Selección extraída', { seleccion, normalizado });

    switch (seleccion) {
      case '1':
        Logger.info('[MenuService] Opción 1 seleccionada - Administración');
        return this.buildSubmenu(Area.ADMINISTRACION);
      case '2':
        Logger.info('[MenuService] Opción 2 seleccionada - Alumnos');
        return this.buildSubmenu(Area.ALUMNOS);
      case '3':
        Logger.info('[MenuService] Opción 3 seleccionada - Inscripciones');
        return this.buildSubmenu(Area.INSCRIPCIONES);
      case '4':
        Logger.info('[MenuService] Opción 4 seleccionada - Comunidad');
        return this.buildSubmenu(Area.COMUNIDAD);
      case '5':
        Logger.info('[MenuService] Opción 5 seleccionada - Otra consulta');
        return {
          reply: 'Contanos mas sobre tu consulta y un asesor te respondera en breve.',
          derivar: true,
        };
      default:
        Logger.info('[MenuService] No es opción principal, procesando como submenu', { seleccion });
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
    Logger.info('[MenuService] Buscando submenu para selección', { seleccion });
    
    for (const [areaKey, submenu] of Object.entries(SUBMENUS)) {
      if (submenu.options[seleccion]) {
        Logger.info('[MenuService] Submenu encontrado', { areaKey, seleccion, opcion: submenu.options[seleccion] });
        return {
          reply: `Perfecto, derivamos tu consulta de ${submenu.title} (${submenu.options[seleccion]}). Un asesor te respondera en breve.`,
          area: areaKey as Area,
          derivar: true,
        };
      }
    }

    Logger.info('[MenuService] Selección no reconocida, devolviendo mensaje de error', { seleccion });
    return {
      reply: 'No reconocimos tu opcion. Por favor, escribi un numero valido o MENU para volver.',
    };
  }
}

export const menuService = new MenuService();
