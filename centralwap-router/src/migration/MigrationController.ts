import { MigrationTrafficRouter } from './MigrationTrafficRouter';
import { ResponseComparator } from './ResponseComparator';
import { MigrationMetrics } from './MigrationMetrics';
import { RouterPsiAdapter } from './RouterPsiAdapter';
import { CentralwapRouter } from '../core/CentralwapRouter';
import { MensajeEntrante } from '../types';
import { logger } from '../utils/logger';
import { RoutingDecision } from './types';

/**
 * Controlador principal que orquesta toda la migración
 */
export class MigrationController {
  constructor(
    private trafficRouter: MigrationTrafficRouter,
    private comparator: ResponseComparator,
    private metrics: MigrationMetrics,
    private routerPsi: RouterPsiAdapter,
    private centralwap: CentralwapRouter,
    private appLogger = logger
  ) {}

  /**
   * Procesar mensaje durante la migración
   * Punto de entrada principal durante el período de migración
   */
  async processMessageDuringMigration(mensaje: MensajeEntrante): Promise<any> {
    const startTime = Date.now();

    try {
      // 1. Determinar routing
      const routing = await this.trafficRouter.routeMessage(mensaje);

      this.appLogger.info('Mensaje enrutado durante migración', {
        routingId: routing.routing_id,
        system: routing.system,
        reason: routing.reason,
        telefono: mensaje.telefono,
      });

      // 2. Procesar según routing determinado
      switch (routing.system) {
        case 'router_psi':
          return await this.processWithRouterPsi(mensaje, routing.routing_id);

        case 'centralwap':
          return await this.processWithCentralwap(mensaje, routing.routing_id);

        case 'both':
          return await this.processWithBothSystems(mensaje, routing.routing_id);

        default:
          // Fallback a Router PSI
          return await this.processWithRouterPsi(mensaje, routing.routing_id);
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.appLogger.error('Error en controlador de migración', {
        telefono: mensaje.telefono,
        error: error instanceof Error ? error.message : 'Error desconocido',
        processingTimeMs: processingTime,
      });

      // En caso de error, fallback al Router PSI
      return await this.processWithRouterPsi(mensaje, `fallback_${Date.now()}`);
    }
  }

  /**
   * Procesar solo con Router PSI
   */
  private async processWithRouterPsi(
    mensaje: MensajeEntrante,
    routingId: string
  ): Promise<any> {
    const startTime = Date.now();

    try {
      const response = await this.routerPsi.processMessage(mensaje);
      const processingTime = Date.now() - startTime;

      // Registrar métricas
      await this.metrics.recordRequest({
        routing_id: routingId,
        system: 'router_psi',
        telefono: mensaje.telefono,
        success: response.success || false,
        processing_time_ms: processingTime,
        error: response.error,
        accion_ejecutada: response.accion_ejecutada,
        area_destino: response.area_destino,
      });

      return {
        ...response,
        routing_id: routingId,
        system_used: 'router_psi',
        migration_mode: true,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      await this.metrics.recordRequest({
        routing_id: routingId,
        system: 'router_psi',
        telefono: mensaje.telefono,
        success: false,
        processing_time_ms: processingTime,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });

      throw error;
    }
  }

  /**
   * Procesar solo con Centralwap
   */
  private async processWithCentralwap(
    mensaje: MensajeEntrante,
    routingId: string
  ): Promise<any> {
    const startTime = Date.now();

    try {
      const response = await this.centralwap.procesarMensaje(mensaje);
      const processingTime = Date.now() - startTime;

      // Registrar métricas
      await this.metrics.recordRequest({
        routing_id: routingId,
        system: 'centralwap',
        telefono: mensaje.telefono,
        success: response.success || false,
        processing_time_ms: processingTime,
        error: response.error,
        accion_ejecutada: response.accion_ejecutada,
        area_destino: response.area_destino,
      });

      return {
        ...response,
        routing_id: routingId,
        system_used: 'centralwap',
        migration_mode: true,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      await this.metrics.recordRequest({
        routing_id: routingId,
        system: 'centralwap',
        telefono: mensaje.telefono,
        success: false,
        processing_time_ms: processingTime,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });

      throw error;
    }
  }

  /**
   * Procesar con ambos sistemas (modo shadow)
   */
  private async processWithBothSystems(
    mensaje: MensajeEntrante,
    routingId: string
  ): Promise<any> {
    try {
      // Ejecutar ambos en paralelo
      const [routerPsiResponse, centralwapResponse] = await Promise.allSettled([
        this.processWithRouterPsi(mensaje, `${routingId}_psi`),
        this.processWithCentralwap(mensaje, `${routingId}_cwap`),
      ]);

      // Procesar resultados
      const psiResult =
        routerPsiResponse.status === 'fulfilled' ? routerPsiResponse.value : null;
      const cwapResult =
        centralwapResponse.status === 'fulfilled' ? centralwapResponse.value : null;

      // Comparar respuestas si ambas fueron exitosas
      if (psiResult && cwapResult) {
        await this.comparator.compareResponses(routingId, psiResult, cwapResult, mensaje);
      }

      // En modo shadow, siempre retornar la respuesta del Router PSI
      if (psiResult) {
        return {
          ...psiResult,
          routing_id: routingId,
          system_used: 'router_psi',
          shadow_comparison: cwapResult ? 'completed' : 'failed',
          migration_mode: true,
        };
      } else {
        throw new Error('Router PSI falló en modo shadow');
      }
    } catch (error) {
      this.appLogger.error('Error procesando con ambos sistemas', {
        routingId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });

      // Fallback: intentar solo con Router PSI
      return await this.processWithRouterPsi(mensaje, `${routingId}_fallback`);
    }
  }

  /**
   * Obtener estado actual de la migración
   */
  async getMigrationStatus(): Promise<any> {
    const health = await this.metrics.getCurrentHealth();
    const config = this.trafficRouter.getCurrentConfig();

    return {
      config,
      health,
      timestamp: new Date().toISOString(),
    };
  }
}









