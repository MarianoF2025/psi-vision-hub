"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabase_1 = require("./config/supabase");
const whatsapp_1 = require("./config/whatsapp");
const routes_1 = __importDefault(require("./routes"));
const MenuController_1 = require("./controllers/MenuController");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3003;
// MIDDLEWARE
app.use((0, cors_1.default)({
    origin: ['http://localhost:3001', 'http://localhost:3000', 'https://psivisionhub.com', 'https://crm.psivisionhub.com'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});
// HEALTH CHECK
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'centralwap-automations',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// API ROUTES
app.use('/api', routes_1.default);
// WEBHOOKS
app.post('/webhook/respuesta-menu', (req, res) => {
    MenuController_1.menuController.webhookRespuestaMenu(req, res);
});
app.get('/webhook/verify', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && token === verifyToken) {
        console.log('✅ Webhook verificado');
        res.status(200).send(challenge);
    }
    else {
        res.sendStatus(403);
    }
});
// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint no encontrado', path: req.path });
});
// Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Error interno del servidor' });
});
// STARTUP
async function iniciar() {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('     CENTRALWAP AUTOMATIONS v1.0.0');
    console.log('     Menús interactivos WhatsApp para PSI');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    const supabaseOk = await (0, supabase_1.verificarConexion)();
    if (!supabaseOk) {
        console.error('❌ No se pudo conectar a Supabase.');
        process.exit(1);
    }
    (0, whatsapp_1.validateWhatsAppConfig)();
    app.listen(PORT, () => {
        console.log('');
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        console.log('');
        console.log('📌 Endpoints:');
        console.log(`   GET  /health`);
        console.log(`   GET  /api/cursos`);
        console.log(`   POST /api/menu/enviar`);
        console.log(`   GET  /api/stats/dashboard`);
        console.log('');
        console.log('═══════════════════════════════════════════════════');
    });
}
process.on('uncaughtException', (err) => { console.error('❌ Uncaught Exception:', err); process.exit(1); });
process.on('unhandledRejection', (reason) => { console.error('❌ Unhandled Rejection:', reason); });
iniciar();
//# sourceMappingURL=index.js.map