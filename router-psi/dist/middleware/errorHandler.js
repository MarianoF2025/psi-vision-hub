"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../utils/logger");
function errorHandler(err, _req, res, _next) {
    logger_1.Logger.error('Error en router PSI', { err });
    const status = err.status || 500;
    res.status(status).json({
        success: false,
        error: err.message || 'Error interno del router',
    });
}
