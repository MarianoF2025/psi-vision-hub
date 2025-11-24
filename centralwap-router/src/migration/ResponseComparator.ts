import { ComparisonResult } from './types';
import { MensajeEntrante } from '../types';
import { logger } from '../utils/logger';

/**
 * Compara respuestas entre Router PSI y Centralwap en modo shadow
 * Detecta diferencias y genera alertas si es necesario
 */
export class ResponseComparator {
  constructor(
    private appLogger = logger,
    private onComparison?: (comparison: ComparisonResult) => Promise<void>
  ) {}

  /**
   * Comparar respuestas de ambos sistemas en modo shadow
   */
  async compareResponses(
    routingId: string,
    routerPsiResponse: any,
    centralwapResponse: any,
    originalMessage: MensajeEntrante
  ): Promise<ComparisonResult> {
    try {
      const comparison: ComparisonResult = {
        routing_id: routingId,
        timestamp: new Date(),
        differences_found: false,
        severity: 'info',
        details: {},
        actionable: false,
      };

      // 1. Comparar éxito/error
      const successMatch = routerPsiResponse.success === centralwapResponse.success;
      if (!successMatch) {
        comparison.differences_found = true;
        comparison.severity = 'critical';
        comparison.actionable = true;
        comparison.details.success_mismatch = {
          router_psi: routerPsiResponse.success,
          centralwap: centralwapResponse.success,
        };
      }

      // 2. Comparar acción ejecutada (menú, derivación, etc.)
      if (routerPsiResponse.success && centralwapResponse.success) {
        const actionMatch =
          routerPsiResponse.accion_ejecutada === centralwapResponse.accion_ejecutada;
        if (!actionMatch) {
          comparison.differences_found = true;
          comparison.severity = comparison.severity === 'critical' ? 'critical' : 'warning';
          comparison.actionable = true;
          comparison.details.action_mismatch = {
            router_psi: routerPsiResponse.accion_ejecutada,
            centralwap: centralwapResponse.accion_ejecutada,
          };
        }
      }

      // 3. Comparar área de derivación (si aplica)
      if (routerPsiResponse.area_destino || centralwapResponse.area_destino) {
        const areaMatch = routerPsiResponse.area_destino === centralwapResponse.area_destino;
        if (!areaMatch) {
          comparison.differences_found = true;
          comparison.severity = comparison.severity === 'critical' ? 'critical' : 'warning';
          comparison.actionable = true;
          comparison.details.area_mismatch = {
            router_psi: routerPsiResponse.area_destino,
            centralwap: centralwapResponse.area_destino,
          };
        }
      }

      // 4. Comparar latencia (diferencia > 50ms es notable)
      const latencyDiff = Math.abs(
        (routerPsiResponse.processing_time_ms || 0) - (centralwapResponse.processing_time_ms || 0)
      );
      if (latencyDiff > 50) {
        comparison.differences_found = true;
        comparison.details.latency_difference = {
          difference_ms: latencyDiff,
          router_psi_ms: routerPsiResponse.processing_time_ms || 0,
          centralwap_ms: centralwapResponse.processing_time_ms || 0,
          centralwap_faster:
            (centralwapResponse.processing_time_ms || 0) < (routerPsiResponse.processing_time_ms || 0),
        };

        // Si Centralwap es significativamente más lento, es preocupante
        if (
          (centralwapResponse.processing_time_ms || 0) >
          (routerPsiResponse.processing_time_ms || 0) + 100
        ) {
          comparison.severity = 'warning';
          comparison.actionable = true;
        }
      }

      // 5. Registrar métricas si hay callback
      if (this.onComparison) {
        await this.onComparison(comparison);
      }

      // 6. Log según severidad
      if (comparison.differences_found) {
        if (comparison.severity === 'critical') {
          this.appLogger.error('Diferencia crítica detectada en shadow mode', {
            routingId,
            telefono: originalMessage.telefono,
            differences: comparison.details,
          });
        } else if (comparison.severity === 'warning') {
          this.appLogger.warn('Diferencia notable detectada en shadow mode', {
            routingId,
            telefono: originalMessage.telefono,
            differences: comparison.details,
          });
        }
      }

      return comparison;
    } catch (error) {
      this.appLogger.error('Error comparando respuestas', {
        routingId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });

      return {
        routing_id: routingId,
        timestamp: new Date(),
        differences_found: true,
        severity: 'critical',
        details: { comparison_error: true },
        actionable: true,
      };
    }
  }
}




