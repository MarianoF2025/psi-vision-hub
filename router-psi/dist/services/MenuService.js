"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuService = exports.MenuService = void 0;
const enums_1 = require("../models/enums");
const logger_1 = require("../utils/logger");
const MENU_PRINCIPAL = `¡Bienvenidos a Asociación PSI! 👋

Para ayudarte mejor, elegí el área con un número:

🟨 1) Administración
🟧 2) Alumnos
🟪 3) Inscripciones
🟦 4) Comunidad PSI y En Vivo
⚪ 5) Otra consulta

Escribí el número (ej: 1)

🔄 Escribí MENU para volver a este menú`;
const SUBMENUS = {
    [enums_1.Area.ADMINISTRACION]: {
        title: 'Administración',
        emoji: '🟨',
        options: {
            '11': 'Pagos y medios de pago',
            '12': 'Problemas con la cuota',
            '13': 'Facturas / Comprobantes',
            '14': 'Certificados / Constancias',
            '15': 'Otra (hablar con persona)',
        },
    },
    [enums_1.Area.ALUMNOS]: {
        title: 'Alumnos',
        emoji: '🟧',
        options: {
            '21': 'Acceso al campus',
            '22': 'Clases y cronograma',
            '23': 'Recursos y descargas',
            '24': 'Certificados académicos',
            '25': 'Duda académica',
            '26': 'Otra (hablar con persona)',
        },
    },
    [enums_1.Area.INSCRIPCIONES]: {
        title: 'Inscripciones',
        emoji: '🟪',
        options: {
            '31': 'Cursos vigentes',
            '32': 'Inscripción a un curso',
            '33': 'Formas de pago',
            '34': 'Modalidades',
            '35': 'Promos / Becas',
            '36': 'Hablar con asesora',
        },
    },
    [enums_1.Area.COMUNIDAD]: {
        title: 'Comunidad PSI y En Vivo',
        emoji: '🟦',
        options: {
            '41': 'Acceso',
            '42': 'Calendario',
            '43': 'Transmisión',
            '44': 'Grabaciones',
            '45': 'Recursos',
            '46': 'Técnicos',
            '47': 'Otra (hablar con persona)',
        },
    },
    [enums_1.Area.VENTAS1]: {
        title: 'Ventas',
        emoji: '⚪',
        options: {
            '51': 'Meta Ads',
            '52': 'Derivado WSP4',
        },
    },
};
class MenuService {
    getMenuPrincipal() {
        logger_1.Logger.info('[MenuService] Generando menú principal');
        const response = { reply: MENU_PRINCIPAL, submenu: 'principal' };
        logger_1.Logger.info('[MenuService] Menú principal generado', {
            replyLength: response.reply.length,
            submenu: response.submenu
        });
        return response;
    }
    procesarEntrada(texto) {
        const normalizado = texto.trim().toLowerCase();
        logger_1.Logger.info('[MenuService] Procesando entrada', { texto, normalizado });
        // Detectar saludos y devolver menú principal
        const saludos = ['hola', 'hi', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia', 'buenas'];
        if (saludos.includes(normalizado)) {
            logger_1.Logger.info('[MenuService] Saludo detectado, devolviendo menú principal', { saludo: normalizado });
            return this.getMenuPrincipal();
        }
        if (['menu', 'volver'].includes(normalizado)) {
            logger_1.Logger.info('[MenuService] Comando MENU/VOLVER detectado');
            return this.getMenuPrincipal();
        }
        const seleccion = normalizado.replace(/[^0-9]/g, '');
        logger_1.Logger.info('[MenuService] Selección extraída', { seleccion, normalizado });
        switch (seleccion) {
            case '1':
                logger_1.Logger.info('[MenuService] Opción 1 seleccionada - Administración');
                return this.buildSubmenu(enums_1.Area.ADMINISTRACION);
            case '2':
                logger_1.Logger.info('[MenuService] Opción 2 seleccionada - Alumnos');
                return this.buildSubmenu(enums_1.Area.ALUMNOS);
            case '3':
                logger_1.Logger.info('[MenuService] Opción 3 seleccionada - Inscripciones');
                return this.buildSubmenu(enums_1.Area.INSCRIPCIONES);
            case '4':
                logger_1.Logger.info('[MenuService] Opción 4 seleccionada - Comunidad');
                return this.buildSubmenu(enums_1.Area.COMUNIDAD);
            case '5':
                logger_1.Logger.info('[MenuService] Opción 5 seleccionada - Otra consulta');
                return {
                    reply: 'Contanos mas sobre tu consulta y un asesor te respondera en breve.',
                    submenu: 'principal',
                };
            default:
                logger_1.Logger.info('[MenuService] No es opción principal, procesando como submenu', { seleccion });
                return this.procesarSubmenuSeleccion(seleccion);
        }
    }
    buildSubmenu(area) {
        const submenu = SUBMENUS[area];
        const lines = Object.entries(submenu.options)
            .map(([code, desc]) => `${code}) ${desc}`)
            .join('\n');
        return {
            reply: `${submenu.emoji} *${submenu.title}*

${lines}

Elegí el código (ej: ${Object.keys(submenu.options)[0]})

🔄 Escribí VOLVER para menú principal`,
            submenu: area,
        };
    }
    procesarSubmenuSeleccion(seleccion) {
        logger_1.Logger.info('[MenuService] Buscando submenu para selección', { seleccion });
        for (const [areaKey, submenu] of Object.entries(SUBMENUS)) {
            if (submenu.options[seleccion]) {
                const area = areaKey;
                const subetiqueta = submenu.options[seleccion];
                logger_1.Logger.info('[MenuService] Submenu definitivo encontrado', { area, seleccion, opcion: subetiqueta });
                return {
                    reply: `Perfecto! Te estoy derivando con el equipo de ${submenu.title}. En unos minutos te van a responder desde este mismo número. ✅`,
                    area,
                    derivar: true,
                    subetiqueta,
                };
            }
        }
        logger_1.Logger.info('[MenuService] Selección no reconocida, devolviendo mensaje de error', { seleccion });
        return {
            reply: 'No reconocimos tu opcion. Por favor, escribi un numero valido o MENU para volver.',
        };
    }
}
exports.MenuService = MenuService;
exports.menuService = new MenuService();
