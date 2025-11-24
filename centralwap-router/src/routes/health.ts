import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { EvolutionWhatsAppService } from '../services/WhatsAppService';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

const router = Router();

// Variables globales para métricas
let startTime = Date.now();
let requestCount = 0;
let errorCount = 0;

// Incrementar contadores
export const incrementRequestCount = () => {
  requestCount++;
};

export const incrementErrorCount = () => {
  errorCount++;
};

/**
 * GET /api/centralwap/health
 * Health check del sistema
 */
router.get('/', async (req: Request, res: Response) => {
  const checks: Record<string, 'ok' | 'error'> = {
    database: 'ok',
    whatsapp: 'ok',
  };

  const errors: string[] = [];

  // Verificar conexión a Supabase
  try {
    const { error } = await supabase.from('conversaciones').select('id').limit(1);
    if (error) {
      checks.database = 'error';
      errors.push(`Database: ${error.message}`);
    }
  } catch (error) {
    checks.database = 'error';
    errors.push(`Database: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }

  // Verificar configuración de WhatsApp
  try {
    if (!config.whatsapp.evolution.api_url || !config.whatsapp.evolution.api_key) {
      checks.whatsapp = 'error';
      errors.push('WhatsApp: Configuración faltante');
    }
  } catch (error) {
    checks.whatsapp = 'error';
    errors.push(`WhatsApp: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }

  // Determinar estado general
  const allOk = Object.values(checks).every((check) => check === 'ok');
  const status = allOk ? 'healthy' : 'degraded';

  // Calcular métricas
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);

  const avgResponseTime = requestCount > 0 ? 0 : 0; // Se podría calcular con más detalle
  const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;

  res.status(allOk ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
    metrics: {
      uptime_seconds: uptimeSeconds,
      uptime_formatted: `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`,
      requests_total: requestCount,
      errors_total: errorCount,
      avg_response_time_ms: avgResponseTime,
      error_rate_percent: parseFloat(errorRate.toFixed(2)),
    },
    ...(errors.length > 0 && { errors }),
  });
});

export default router;




