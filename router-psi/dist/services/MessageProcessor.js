"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageProcessor = void 0;
const MenuService_1 = require("./MenuService");
const DatabaseService_1 = require("./DatabaseService");
const CentralTelefonica_1 = require("./CentralTelefonica");
const logger_1 = require("../utils/logger");
const environment_1 = require("../config/environment");
const antiloop_1 = require("../utils/antiloop");
const enums_1 = require("../models/enums");
const antiLoop = new antiloop_1.AntiLoop(environment_1.Env.antiLoopMinutes);
const ROUTER_ESTADO_PRINCIPAL = 'PSI Principal';
class MessageProcessor {
    async processIncoming(message, area = enums_1.Area.PSI_PRINCIPAL) {
        const telefono = message.from;
        let conversacion = await DatabaseService_1.databaseService.buscarOCrearConversacion(telefono, environment_1.Env.whatsapp.numbers.wsp4, area);
        const esFlujoPrincipal = area === enums_1.Area.PSI_PRINCIPAL;
        if (esFlujoPrincipal && conversacion.area !== enums_1.Area.PSI_PRINCIPAL) {
            logger_1.Logger.info('[MessageProcessor] Normalizando conversación a PSI Principal', {
                conversacionId: conversacion.id,
                areaAnterior: conversacion.area,
            });
            conversacion = await DatabaseService_1.databaseService.updateConversacion(conversacion.id, {
                area: enums_1.Area.PSI_PRINCIPAL,
                derivado_a: null,
                inbox_destino: 'psi_principal',
                inbox_id: null,
            });
        }
        if (antiLoop.isWithinWindow(conversacion.id)) {
            logger_1.Logger.warn('Mensaje dentro de ventana anti-loop, se ignora', { conversacionId: conversacion.id });
            return { ignored: true };
        }
        antiLoop.touch(conversacion.id);
        const texto = message.text?.body || message.interactive?.button_reply?.title || '';
        logger_1.Logger.info('[MessageProcessor] Iniciando procesamiento', {
            conversacionId: conversacion.id,
            telefono,
            texto,
            textoLength: texto.length,
            messageType: message.type,
        });
        // 1. Guardar mensaje del usuario ANTES de procesar
        logger_1.Logger.info('[MessageProcessor] Guardando mensaje del usuario en Supabase');
        await DatabaseService_1.databaseService.saveMessage({
            conversacion_id: conversacion.id,
            remitente: telefono,
            tipo: message.type,
            mensaje: texto,
            telefono: telefono, // Agregar teléfono explícitamente
            timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(), // Convertir timestamp de WhatsApp
            whatsapp_message_id: message.id,
            metadata: {
                interactive: message.interactive,
            },
        });
        logger_1.Logger.info('[MessageProcessor] Mensaje del usuario guardado en Supabase', {
            conversacionId: conversacion.id,
            telefono,
            texto: texto.substring(0, 50),
        });
        // 2. Procesar lógica de menú
        logger_1.Logger.info('[MessageProcessor] Procesando entrada con MenuService', { texto });
        const menuResponse = MenuService_1.menuService.procesarEntrada(texto);
        logger_1.Logger.info('[MessageProcessor] Respuesta del menú obtenida', {
            replyLength: menuResponse.reply?.length || 0,
            submenu: menuResponse.submenu,
            area: menuResponse.area,
            derivar: menuResponse.derivar,
            replyPreview: menuResponse.reply?.substring(0, 100),
        });
        const updates = {
            router_estado: ROUTER_ESTADO_PRINCIPAL,
            submenu_actual: menuResponse.submenu,
        };
        if (esFlujoPrincipal) {
            updates.area = enums_1.Area.PSI_PRINCIPAL;
            updates.derivado_a = null;
            updates.inbox_destino = 'psi_principal';
            updates.inbox_id = null;
        }
        let conversacionActualizada = conversacion;
        if (menuResponse.derivar && menuResponse.area) {
            logger_1.Logger.info('[MessageProcessor] Iniciando derivación final', {
                conversacionId: conversacion.id,
                areaDestino: menuResponse.area,
                subetiqueta: menuResponse.subetiqueta,
            });
            conversacionActualizada = await this.crearDerivacion(conversacion, menuResponse.area, menuResponse.subetiqueta);
            logger_1.Logger.info('[MessageProcessor] Derivación finalizada', {
                conversacionId: conversacion.id,
                ticketId: conversacionActualizada.ticket_id,
                areaDestino: conversacionActualizada.area,
            });
        }
        else {
            logger_1.Logger.info('[MessageProcessor] Actualizando conversación sin derivación', {
                conversacionId: conversacion.id,
                updates,
                routerEstadoAnterior: conversacion.router_estado,
                routerEstadoNuevo: updates.router_estado,
            });
            conversacionActualizada = await DatabaseService_1.databaseService.updateConversacion(conversacion.id, updates);
            logger_1.Logger.info('[MessageProcessor] Conversación actualizada');
        }
        const areaEnvio = conversacionActualizada.area || enums_1.Area.PSI_PRINCIPAL;
        logger_1.Logger.info('[MessageProcessor] Enviando mensaje', {
            conversacionId: conversacion.id,
            areaEnvio,
            derivar: menuResponse.derivar,
            replyLength: menuResponse.reply?.length || 0,
        });
        if (menuResponse.derivar && menuResponse.area) {
            logger_1.Logger.info('[MessageProcessor] Enviando con derivación a área específica', { area: menuResponse.area });
            await CentralTelefonica_1.centralTelefonica.enviarMensaje(conversacion.id, menuResponse.reply, menuResponse.area);
        }
        else {
            logger_1.Logger.info('[MessageProcessor] Enviando sin derivación', { areaEnvio });
            await CentralTelefonica_1.centralTelefonica.enviarMensaje(conversacion.id, menuResponse.reply, areaEnvio);
        }
        logger_1.Logger.info('[MessageProcessor] Mensaje enviado exitosamente');
        return {
            conversacionId: conversacion.id,
            menuResponse,
        };
    }
    generarTicketId() {
        const correlativo = Math.floor(Math.random() * 1000000)
            .toString()
            .padStart(6, '0');
        return `PSI-2025-${correlativo}`;
    }
    mapearInbox(area) {
        const map = {
            [enums_1.Area.PSI_PRINCIPAL]: { nombre: 'psi_principal', id: null },
            [enums_1.Area.ADMINISTRACION]: { nombre: 'administracion', id: 79828 },
            [enums_1.Area.ALUMNOS]: { nombre: 'alumnos', id: null },
            [enums_1.Area.INSCRIPCIONES]: { nombre: 'inscripciones', id: null },
            [enums_1.Area.COMUNIDAD]: { nombre: 'comunidad', id: null },
            [enums_1.Area.VENTAS1]: { nombre: 'ventas1', id: 81935 },
        };
        return map[area] || { nombre: 'psi_principal', id: null };
    }
    async crearDerivacion(conversacion, area, subetiqueta) {
        const ticketId = this.generarTicketId();
        const countdownDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const tsDerivacion = new Date();
        const inboxDestino = this.mapearInbox(area);
        logger_1.Logger.info('[MessageProcessor] Generando datos de derivación', {
            conversacionId: conversacion.id,
            ticketId,
            countdown: countdownDate.toISOString(),
            area,
            subetiqueta,
            inboxDestino,
        });
        const conversacionActualizada = await DatabaseService_1.databaseService.updateConversacion(conversacion.id, {
            area,
            router_estado: `derivado_${area}`,
            submenu_actual: null,
            ticket_id: ticketId,
            countdown_24h: countdownDate.toISOString(),
            ts_derivacion: tsDerivacion.toISOString(),
            derivado_a: area,
            inbox_destino: inboxDestino.nombre,
            inbox_id: inboxDestino.id,
        });
        await DatabaseService_1.databaseService.registrarAuditLog({
            conversacion_id: conversacion.id,
            accion: 'derivacion',
            area_destino: area,
            ticket_id: ticketId,
            metadata: {
                countdown_24h: countdownDate.toISOString(),
                subetiqueta,
            },
        });
        return conversacionActualizada;
    }
}
exports.messageProcessor = new MessageProcessor();
