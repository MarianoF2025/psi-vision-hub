import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { verificarConexion } from './config/supabase';
import { validateWhatsAppConfig } from './config/whatsapp';
import routes from './routes';
import { menuController } from './controllers/MenuController';

const app = express();
const PORT = process.env.PORT || 3003;

// MIDDLEWARE
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'https://psivisionhub.com', 'https://crm.psivisionhub.com'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// HEALTH CHECK
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'centralwap-automations',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API ROUTES
app.use('/api', routes);

// WEBHOOKS
app.post('/webhook/respuesta-menu', (req: Request, res: Response) => {
  menuController.webhookRespuestaMenu(req, res);
});

app.get('/webhook/verify', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Webhook verificado');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint no encontrado', path: req.path });
});

// Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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
  
  const supabaseOk = await verificarConexion();
  if (!supabaseOk) {
    console.error('❌ No se pudo conectar a Supabase.');
    process.exit(1);
  }
  
  validateWhatsAppConfig();
  
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
