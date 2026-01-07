"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const environment_1 = require("./config/environment");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// ============================================
// Middlewares
// ============================================
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Log de requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
// ============================================
// Routes
// ============================================
app.use(routes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'centralwap-payments',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
// ============================================
// Error handler
// ============================================
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
    });
});
// ============================================
// Start server
// ============================================
const errors = (0, environment_1.validateConfig)();
if (errors.length > 0) {
    console.error('❌ Errores de configuración:');
    errors.forEach(e => console.error(`  - ${e}`));
    console.error('El servidor iniciará pero algunas funciones no estarán disponibles.');
}
app.listen(environment_1.config.port, () => {
    console.log('=========================================');
    console.log('🏦 CENTRALWAP-PAYMENTS');
    console.log('=========================================');
    console.log(`✅ Servidor corriendo en puerto ${environment_1.config.port}`);
    console.log(`📍 Entorno: ${environment_1.config.nodeEnv}`);
    console.log(`🔗 Base URL: ${environment_1.config.baseUrl}`);
    console.log('=========================================');
});
//# sourceMappingURL=index.js.map