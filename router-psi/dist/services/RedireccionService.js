"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redireccionService = void 0;
const logger_1 = require("../utils/logger");
const environment_1 = require("../config/environment");
const DatabaseService_1 = require("./DatabaseService");
class RedireccionService {
    buildLink(texto) {
        const encoded = encodeURIComponent(texto);
        return `https://wa.me/${environment_1.Env.whatsapp.numbers.wsp4}?text=${encoded}`;
    }
    async redireccionSuave(payload) {
        const link = this.buildLink('Hola, quiero seguir por el numero principal');
        const texto = [
            'Hola! Te atendemos por aquí, pero para una mejor experiencia usá nuestro número principal:',
            link,
            'Desde ahí accedes a todas nuestras áreas con menú completo.',
            `¿En qué podemos ayudarte con ${payload.inboxOrigen}?`,
        ].join('\n\n');
        logger_1.Logger.info('Redireccion suave generada', { telefono: payload.telefono });
        return texto;
    }
    async redireccionFuerte(payload) {
        const link = this.buildLink('Hola, ya tengo una conversacion');
        const texto = [
            'Hola! Vemos que ya tenes una conversación activa con nosotros.',
            'Para brindarte la mejor atención, continua por nuestro número principal:',
            link,
            'Te esperamos!',
        ].join('\n\n');
        logger_1.Logger.info('Redireccion fuerte generada', { telefono: payload.telefono });
        return texto;
    }
    async manejarRedireccion(payload) {
        const conversacion = await DatabaseService_1.databaseService.buscarOCrearConversacion(payload.telefono, payload.numeroDestino || environment_1.Env.whatsapp.numbers.wsp4, payload.inboxOrigen);
        const link = this.buildLink(payload.mensaje || 'Hola');
        return {
            conversacion,
            link,
        };
    }
}
exports.redireccionService = new RedireccionService();
