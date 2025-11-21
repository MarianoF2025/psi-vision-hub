"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
const MessageProcessor_1 = require("../services/MessageProcessor");
const enums_1 = require("../models/enums");
const MetaAdsHandler_1 = require("../services/MetaAdsHandler");
exports.webhookRouter = (0, express_1.Router)();
exports.webhookRouter.get('/webhook/whatsapp/:inbox', auth_1.verifyWebhook);
exports.webhookRouter.post('/webhook/whatsapp/wsp4', async (req, res, next) => {
    try {
        // Si es webhook de status directo de WhatsApp Cloud API (sin messages)
        if (req.body.messaging_product === 'whatsapp' && !req.body.messages) {
            logger_1.Logger.info('Webhook de status WhatsApp Cloud API ignorado (WSP4)');
            return res.status(200).json({ success: true, ignored: true });
        }
        const { error, value } = validation_1.webhookPayloadSchema.validate(req.body);
        if (error) {
            logger_1.Logger.warn('Payload invalido WSP4', { error });
            return res.status(400).json({ success: false, error: 'payload invalido' });
        }
        const message = value.messages[0];
        const result = await MessageProcessor_1.messageProcessor.processIncoming(message, enums_1.Area.PSI_PRINCIPAL);
        res.json({ success: true, result });
    }
    catch (err) {
        next(err);
    }
});
exports.webhookRouter.post('/webhook/whatsapp/ventas1', async (req, res, next) => {
    try {
        // Si es webhook de status directo de WhatsApp Cloud API (sin messages)
        if (req.body.messaging_product === 'whatsapp' && !req.body.messages) {
            logger_1.Logger.info('Webhook de status WhatsApp Cloud API ignorado (VENTAS1)');
            return res.status(200).json({ success: true, ignored: true });
        }
        const telefono = req.body?.messages?.[0]?.from;
        const texto = req.body?.messages?.[0]?.text?.body || '';
        if (!telefono) {
            return res.status(400).json({ success: false, error: 'Telefono requerido' });
        }
        let origen = 'meta_ads';
        if (req.body.conversacion_id)
            origen = 'derivado_wsp4';
        if (origen === 'meta_ads') {
            const data = await MetaAdsHandler_1.metaAdsHandler.procesarMensajeMetaAds(telefono, texto);
            return res.json({ success: true, data });
        }
        const { error, value } = validation_1.webhookPayloadSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, error: 'payload invalido' });
        }
        const result = await MessageProcessor_1.messageProcessor.processIncoming(value.messages[0], enums_1.Area.VENTAS1);
        res.json({ success: true, result });
    }
    catch (err) {
        next(err);
    }
});
const redirAreas = {
    administracion: enums_1.Area.ADMINISTRACION,
    alumnos: enums_1.Area.ALUMNOS,
    comunidad: enums_1.Area.COMUNIDAD,
};
exports.webhookRouter.post('/webhook/whatsapp/:area', async (req, res, next) => {
    try {
        // Si es webhook de status directo de WhatsApp Cloud API (sin messages)
        if (req.body.messaging_product === 'whatsapp' && !req.body.messages) {
            logger_1.Logger.info(`Webhook de status WhatsApp Cloud API ignorado (${req.params.area})`);
            return res.status(200).json({ success: true, ignored: true });
        }
        const areaParam = req.params.area.toLowerCase();
        const area = redirAreas[areaParam];
        if (!area) {
            return res.status(404).json({ success: false, error: 'area no soportada' });
        }
        const { error, value } = validation_1.webhookPayloadSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, error: 'payload invalido' });
        }
        const result = await MessageProcessor_1.messageProcessor.processIncoming(value.messages[0], area);
        res.json({ success: true, result });
    }
    catch (err) {
        next(err);
    }
});
