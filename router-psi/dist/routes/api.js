"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const CentralTelefonica_1 = require("../services/CentralTelefonica");
const DatabaseService_1 = require("../services/DatabaseService");
exports.apiRouter = (0, express_1.Router)();
exports.apiRouter.post('/api/derivar', async (req, res, next) => {
    try {
        const { conversacionId, mensaje, area } = req.body;
        if (!conversacionId || !mensaje) {
            return res.status(400).json({ success: false, error: 'conversacionId y mensaje requeridos' });
        }
        await CentralTelefonica_1.centralTelefonica.enviarMensaje(conversacionId, mensaje, area);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.apiRouter.post('/api/toggle-bypass', async (req, res, next) => {
    try {
        const { conversacionId, bypass } = req.body;
        if (typeof bypass !== 'boolean') {
            return res.status(400).json({ success: false, error: 'bypass debe ser boolean' });
        }
        const conversacion = await CentralTelefonica_1.centralTelefonica.definirBypass(conversacionId, bypass);
        res.json({ success: true, conversacion });
    }
    catch (err) {
        next(err);
    }
});
exports.apiRouter.get('/api/ventana/:conversationId', async (req, res, next) => {
    try {
        const conversacion = await DatabaseService_1.databaseService.updateConversacion(req.params.conversationId, {});
        res.json({
            success: true,
            ventana_24h_activa: conversacion.ventana_24h_activa,
            ventana_24h_inicio: conversacion.ventana_24h_inicio,
            ventana_72h_activa: conversacion.ventana_72h_activa,
            ventana_72h_inicio: conversacion.ventana_72h_inicio,
        });
    }
    catch (err) {
        next(err);
    }
});
