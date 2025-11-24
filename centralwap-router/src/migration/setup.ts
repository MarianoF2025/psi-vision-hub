import { MigrationController } from './MigrationController';
import { MigrationTrafficRouter } from './MigrationTrafficRouter';
import { ResponseComparator } from './ResponseComparator';
import { MigrationMetrics } from './MigrationMetrics';
import { RouterPsiAdapter } from './RouterPsiAdapter';
import { CentralwapRouter } from '../core/CentralwapRouter';
import { EvolutionWhatsAppService } from '../services/WhatsAppService';
import { migrationConfig } from './config';
import { logger } from '../utils/logger';

/**
 * Configurar e inicializar sistema de migración
 */
export function setupMigration(): MigrationController | null {
  try {
    // Verificar si está habilitada la migración
    const migrationEnabled = process.env.MIGRATION_ENABLED === 'true';

    if (!migrationEnabled) {
      logger.info('Sistema de migración deshabilitado');
      return null;
    }

    logger.info('Inicializando sistema de migración...');

    // Crear servicios base
    const whatsappService = new EvolutionWhatsAppService();
    const centralwap = new CentralwapRouter(whatsappService);
    const routerPsi = new RouterPsiAdapter();
    const metrics = new MigrationMetrics();

    // Crear comparador con callback para guardar comparaciones
    const comparator = new ResponseComparator(logger, async (comparison) => {
      await metrics.recordComparison(comparison);
    });

    // Crear traffic router con función para obtener health
    const trafficRouter = new MigrationTrafficRouter(
      migrationConfig,
      async () => await metrics.getCurrentHealth(),
      logger
    );

    // Crear controlador principal
    const controller = new MigrationController(
      trafficRouter,
      comparator,
      metrics,
      routerPsi,
      centralwap,
      logger
    );

    logger.info('Sistema de migración inicializado correctamente', {
      mode: migrationConfig.traffic_split.current_mode,
      centralwap_percentage: migrationConfig.traffic_split.centralwap_percentage,
    });

    return controller;
  } catch (error) {
    logger.error('Error inicializando sistema de migración', {
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
    return null;
  }
}




