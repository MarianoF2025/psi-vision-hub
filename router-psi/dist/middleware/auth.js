"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhook = verifyWebhook;
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
function verifyWebhook(req, res, next) {
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        if (mode === 'subscribe' && token === environment_1.Env.verifyToken) {
            logger_1.Logger.info('Verificaci�n de webhook exitosa');
            return res.status(200).send(challenge);
        }
        logger_1.Logger.warn('Intento de verificaci�n inv�lido');
        return res.status(403).send('Forbidden');
    }
    next();
}
