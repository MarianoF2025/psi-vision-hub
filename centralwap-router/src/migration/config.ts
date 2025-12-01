import { MigrationConfig } from './types';

// Configuración de migración desde variables de entorno o valores por defecto
export const migrationConfig: MigrationConfig = {
  traffic_split: {
    centralwap_percentage: parseInt(process.env.MIGRATION_CENTRALWAP_PERCENTAGE || '0', 10),
    router_psi_percentage: 100 - parseInt(process.env.MIGRATION_CENTRALWAP_PERCENTAGE || '0', 10),
    current_mode: (process.env.MIGRATION_MODE as 'shadow' | 'active' | 'full') || 'shadow',
  },

  validation_metrics: {
    max_error_rate: parseFloat(process.env.MIGRATION_MAX_ERROR_RATE || '0.1'),
    max_latency_p95: parseInt(process.env.MIGRATION_MAX_LATENCY_P95 || '200', 10),
    min_success_rate: parseFloat(process.env.MIGRATION_MIN_SUCCESS_RATE || '99.9'),
  },

  auto_rollback: {
    enabled: process.env.MIGRATION_AUTO_ROLLBACK === 'true',
    triggers: {
      error_rate_threshold: parseFloat(process.env.MIGRATION_ROLLBACK_ERROR_RATE || '1.0'),
      latency_threshold: parseInt(process.env.MIGRATION_ROLLBACK_LATENCY || '500', 10),
      consecutive_failures: parseInt(process.env.MIGRATION_ROLLBACK_CONSECUTIVE || '5', 10),
    },
    cooldown_minutes: parseInt(process.env.MIGRATION_ROLLBACK_COOLDOWN || '60', 10),
  },

  migration_logging: {
    log_all_requests: process.env.MIGRATION_LOG_ALL === 'true' || true,
    compare_responses: process.env.MIGRATION_COMPARE === 'true' || true,
    sample_rate: parseFloat(process.env.MIGRATION_SAMPLE_RATE || '100'),
  },
};









