import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config/environment';
import routes from './routes';

const app = express();

// ============================================
// Middlewares
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// Routes
// ============================================
app.use(routes);

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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
  });
});

// ============================================
// Start server
// ============================================
const errors = validateConfig();
if (errors.length > 0) {
  console.error('❌ Errores de configuración:');
  errors.forEach(e => console.error(`  - ${e}`));
  console.error('El servidor iniciará pero algunas funciones no estarán disponibles.');
}

app.listen(config.port, () => {
  console.log('=========================================');
  console.log('🏦 CENTRALWAP-PAYMENTS');
  console.log('=========================================');
  console.log(`✅ Servidor corriendo en puerto ${config.port}`);
  console.log(`📍 Entorno: ${config.nodeEnv}`);
  console.log(`🔗 Base URL: ${config.baseUrl}`);
  console.log('=========================================');
});
