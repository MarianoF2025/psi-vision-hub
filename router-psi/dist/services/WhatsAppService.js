"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const environment_1 = require("../config/environment");
const whatsapp_1 = require("../config/whatsapp");
class WhatsAppService {
    async sendTextMessage(params) {
        const { to, body, fromContext } = params;
        const phoneId = (0, whatsapp_1.getPhoneId)(fromContext);
        try {
            const response = await whatsapp_1.whatsappClient.post(`/${phoneId}/messages`, {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body },
            });
            logger_1.Logger.info('Mensaje enviado via WhatsApp', {
                phoneId,
                to,
                context: fromContext,
            });
            return response.data;
        }
        catch (error) {
            logger_1.Logger.error('Error enviando mensaje WhatsApp', {
                error: error?.response?.data || error.message,
            });
            throw error;
        }
    }
    async markAsRead(messageId, fromContext) {
        const phoneId = (0, whatsapp_1.getPhoneId)(fromContext);
        try {
            await whatsapp_1.whatsappClient.post(`/${phoneId}/messages`, {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
            });
        }
        catch (error) {
            logger_1.Logger.warn('No se pudo marcar mensaje como leído', {
                error: error?.response?.data || error.message,
            });
        }
    }
    async fetchMedia(mediaId) {
        try {
            const { data } = await whatsapp_1.whatsappClient.get(`/${mediaId}`);
            const download = await axios_1.default.get(data.url, {
                responseType: 'arraybuffer',
                headers: {
                    Authorization: `Bearer ${environment_1.Env.whatsapp.token}`,
                },
            });
            return {
                buffer: Buffer.from(download.data, 'binary'),
                mimeType: download.headers['content-type'],
            };
        }
        catch (error) {
            logger_1.Logger.error('Error descargando media', {
                mediaId,
                error: error?.response?.data || error.message,
            });
            throw error;
        }
    }
}
exports.whatsappService = new WhatsAppService();
