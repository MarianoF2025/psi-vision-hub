"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.centralTelefonica = void 0;
const environment_1 = require("../config/environment");
const DatabaseService_1 = require("./DatabaseService");
const WhatsAppService_1 = require("./WhatsAppService");
const enums_1 = require("../models/enums");
const logger_1 = require("../utils/logger");
class CentralTelefonica {
    async enviarMensaje(conversacionId, mensaje, area = enums_1.Area.ADMINISTRACION) {
        logger_1.Logger.info('[CentralTelefonica] Iniciando envío de mensaje', {
            conversacionId,
            area,
            mensajeLength: mensaje.length,
            mensajePreview: mensaje.substring(0, 100),
        });
        const conversacion = await DatabaseService_1.databaseService.updateConversacion(conversacionId, {});
        logger_1.Logger.info('[CentralTelefonica] Conversación obtenida', {
            telefono: conversacion.telefono,
            bypass: conversacion.bypass_wsp4,
        });
        const bypass = conversacion.bypass_wsp4;
        const numeroEnvio = bypass ? conversacion.numero_origen || environment_1.Env.whatsapp.numbers.ventas1 : environment_1.Env.whatsapp.numbers.wsp4;
        const contexto = bypass ? 'ventas1' : 'wsp4';
        logger_1.Logger.info('[CentralTelefonica] Configuración de envío', {
            bypass,
            numeroEnvio,
            contexto,
            telefonoDestino: conversacion.telefono,
        });
        logger_1.Logger.info('[CentralTelefonica] Enviando mensaje vía WhatsApp Service');
        await WhatsAppService_1.whatsappService.sendTextMessage({
            to: conversacion.telefono,
            body: mensaje,
            fromContext: contexto,
        });
        logger_1.Logger.info('[CentralTelefonica] Mensaje enviado vía WhatsApp Service exitosamente');
        await DatabaseService_1.databaseService.saveMessage({
            conversacion_id: conversacionId,
            remitente: 'system',
            tipo: 'text',
            mensaje,
            metadata: {
                numero_envio: numeroEnvio,
                area,
            },
        });
        logger_1.Logger.info('Mensaje del sistema guardado y enviado', {
            conversacionId,
            contexto,
            mensaje: mensaje.substring(0, 50),
        });
    }
    definirBypass(conversacionId, bypass) {
        return DatabaseService_1.databaseService.updateConversacion(conversacionId, {
            bypass_wsp4: bypass,
            numero_activo: bypass ? environment_1.Env.whatsapp.numbers.ventas1 : environment_1.Env.whatsapp.numbers.wsp4,
        });
    }
}
exports.centralTelefonica = new CentralTelefonica();
