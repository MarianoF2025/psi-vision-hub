import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { SystemHealth, ComparisonResult } from './types';

/**
 * Sistema de métricas para migración
 */
export class MigrationMetrics {
  constructor(
    private supabaseClient = supabase,
    private appLogger = logger
  ) {}

  /**
   * Registrar métricas de un mensaje procesado
   */
  async recordRequest(data: {
    routing_id: string;
    system: 'router_psi' | 'centralwap';
    telefono: string;
    success: boolean;
    processing_time_ms: number;
    error?: string;
    accion_ejecutada?: string;
    area_destino?: string;
  }) {
    try {
      // Intentar insertar en tabla migration_metrics si existe
      // Si no existe, solo loguear
      const { error } = await this.supabaseClient
        .from('migration_metrics')
        .insert({
          routing_id: data.routing_id,
          system: data.system,
          telefono: data.telefono,
          success: data.success,
          processing_time_ms: data.processing_time_ms,
          error_message: data.error,
          accion_ejecutada: data.accion_ejecutada,
          area_destino: data.area_destino,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        // Si la tabla no existe, solo loguear
        this.appLogger.debug('No se pudo insertar métricas (tabla puede no existir)', {
          error: error.message,
        });
      }
    } catch (error) {
      this.appLogger.error('Error registrando métricas de migración', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  /**
   * Registrar resultado de comparación shadow
   */
  async recordComparison(comparison: ComparisonResult) {
    try {
      const { error } = await this.supabaseClient.from('migration_comparisons').insert({
        routing_id: comparison.routing_id,
        timestamp: comparison.timestamp.toISOString(),
        differences_found: comparison.differences_found,
        severity: comparison.severity,
        details: comparison.details,
        actionable: comparison.actionable,
      });

      if (error) {
        this.appLogger.debug('No se pudo insertar comparación (tabla puede no existir)', {
          error: error.message,
        });
      }
    } catch (error) {
      this.appLogger.error('Error registrando comparación', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  /**
   * Obtener métricas actuales de salud del sistema
   */
  async getCurrentHealth(): Promise<SystemHealth> {
    try {
      // Consultar métricas de los últimos 10 minutos
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const { data: metrics, error } = await this.supabaseClient
        .from('migration_metrics')
        .select('*')
        .gte('timestamp', tenMinutesAgo);

      if (error || !metrics || metrics.length === 0) {
        return this.getDefaultHealth();
      }

      // Calcular métricas por sistema
      const routerPsiMetrics = metrics.filter((m: any) => m.system === 'router_psi');
      const centralwapMetrics = metrics.filter((m: any) => m.system === 'centralwap');

      return {
        router_psi: this.calculateSystemHealth(routerPsiMetrics),
        centralwap: this.calculateSystemHealth(centralwapMetrics),
      };
    } catch (error) {
      this.appLogger.error('Error obteniendo health metrics', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      return this.getDefaultHealth();
    }
  }

  private calculateSystemHealth(metrics: any[]): SystemHealth['router_psi'] {
    if (metrics.length === 0) {
      return {
        status: 'healthy',
        error_rate: 0,
        latency_p95: 0,
        requests_last_minute: 0,
        consecutive_failures: 0,
      };
    }

    const totalRequests = metrics.length;
    const errors = metrics.filter((m: any) => !m.success).length;
    const errorRate = (errors / totalRequests) * 100;

    // Calcular P95 de latencia
    const latencies = metrics
      .map((m: any) => m.processing_time_ms || 0)
      .sort((a: number, b: number) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const latencyP95 = latencies[p95Index] || 0;

    // Calcular fallos consecutivos recientes (últimos 20 requests)
    const recentMetrics = metrics.slice(-20);
    let consecutiveFailures = 0;
    for (let i = recentMetrics.length - 1; i >= 0; i--) {
      if (!recentMetrics[i].success) {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    // Determinar estado de salud
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (errorRate > 5 || latencyP95 > 1000 || consecutiveFailures >= 5) {
      status = 'unhealthy';
    } else if (errorRate > 1 || latencyP95 > 500 || consecutiveFailures >= 3) {
      status = 'degraded';
    }

    return {
      status,
      error_rate: errorRate,
      latency_p95: latencyP95,
      requests_last_minute: totalRequests, // Aproximación para 10 min
      consecutive_failures: consecutiveFailures,
    };
  }

  private getDefaultHealth(): SystemHealth {
    return {
      router_psi: {
        status: 'healthy',
        error_rate: 0,
        latency_p95: 0,
        requests_last_minute: 0,
        consecutive_failures: 0,
      },
      centralwap: {
        status: 'healthy',
        error_rate: 0,
        latency_p95: 0,
        requests_last_minute: 0,
        consecutive_failures: 0,
      },
    };
  }
}









