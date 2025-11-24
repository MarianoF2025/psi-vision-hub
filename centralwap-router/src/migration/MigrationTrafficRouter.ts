import { MigrationConfig, SystemHealth, RoutingDecision } from './types';
import { MensajeEntrante } from '../types';
import { logger } from '../utils/logger';

/**
 * Distribuidor de tráfico entre Router PSI y Centralwap
 * Implementa lógica de A/B testing con métricas en tiempo real
 */
export class MigrationTrafficRouter {
  constructor(
    private config: MigrationConfig,
    private getSystemHealth: () => Promise<SystemHealth>,
    private appLogger = logger
  ) {}

  /**
   * Determinar qué sistema debe procesar el mensaje
   * Basado en porcentaje de tráfico + criterios de seguridad
   */
  async routeMessage(mensaje: MensajeEntrante): Promise<RoutingDecision> {
    const routingId = this.generateRoutingId();

    try {
      // 1. Verificar estado del sistema
      const systemHealth = await this.getSystemHealth();

      // 2. Verificar triggers de rollback automático
      if (this.config.auto_rollback.enabled && this.shouldTriggerRollback(systemHealth)) {
        await this.executeAutoRollback('health_check_failed', systemHealth);
        return {
          system: 'router_psi',
          reason: 'auto_rollback_triggered',
          routing_id: routingId,
        };
      }

      // 3. Determinar routing según modo actual
      switch (this.config.traffic_split.current_mode) {
        case 'shadow':
          return {
            system: 'both', // Router PSI + Centralwap (solo logging)
            reason: 'shadow_mode_testing',
            routing_id: routingId,
          };

        case 'active':
          return this.determineActiveRouting(mensaje, routingId);

        case 'full':
          return {
            system: 'centralwap',
            reason: 'full_migration_complete',
            routing_id: routingId,
          };

        default:
          return {
            system: 'router_psi',
            reason: 'unknown_mode_fallback',
            routing_id: routingId,
          };
      }
    } catch (error) {
      this.appLogger.error('Error en routing de migración', {
        routingId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });

      // En caso de error, siempre ir al sistema estable (Router PSI)
      return {
        system: 'router_psi',
        reason: 'routing_error_fallback',
        routing_id: routingId,
      };
    }
  }

  /**
   * Determinar routing en modo activo según porcentaje configurado
   */
  private determineActiveRouting(
    mensaje: MensajeEntrante,
    routingId: string
  ): RoutingDecision {
    // Usar hash del teléfono para distribución consistente
    const phoneHash = this.hashPhone(mensaje.telefono);
    const routePercent = phoneHash % 100;

    if (routePercent < this.config.traffic_split.centralwap_percentage) {
      return {
        system: 'centralwap',
        reason: `active_routing_${this.config.traffic_split.centralwap_percentage}pct`,
        routing_id: routingId,
      };
    } else {
      return {
        system: 'router_psi',
        reason: `active_routing_fallback`,
        routing_id: routingId,
      };
    }
  }

  /**
   * Verificar si se debe ejecutar rollback automático
   */
  private shouldTriggerRollback(health: SystemHealth): boolean {
    const triggers = this.config.auto_rollback.triggers;

    return (
      health.centralwap.error_rate > triggers.error_rate_threshold ||
      health.centralwap.latency_p95 > triggers.latency_threshold ||
      health.centralwap.consecutive_failures >= triggers.consecutive_failures
    );
  }

  /**
   * Ejecutar rollback automático
   */
  private async executeAutoRollback(reason: string, health: SystemHealth) {
    this.appLogger.warn('Ejecutando rollback automático', {
      reason,
      health: health.centralwap,
    });

    // Cambiar configuración a Router PSI 100%
    this.config.traffic_split.centralwap_percentage = 0;
    this.config.traffic_split.router_psi_percentage = 100;
    this.config.traffic_split.current_mode = 'active';

    // Notificar al equipo
    await this.notifyRollback(reason);

    // Guardar evento en base de datos
    await this.recordMigrationEvent('auto_rollback', { reason, health });
  }

  /**
   * Hash de teléfono para distribución consistente
   */
  private hashPhone(telefono: string): number {
    let hash = 0;
    for (let i = 0; i < telefono.length; i++) {
      const char = telefono.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }
    return Math.abs(hash);
  }

  private generateRoutingId(): string {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private async notifyRollback(reason: string) {
    // TODO: Enviar notificación Slack/email al equipo
    this.appLogger.warn('Notificación de rollback enviada', { reason });
  }

  private async recordMigrationEvent(event: string, data: any) {
    // TODO: Guardar evento en tabla migration_log
    this.appLogger.info('Evento de migración registrado', { event, data });
  }

  /**
   * Actualizar configuración de tráfico
   */
  updateTrafficSplit(centralwapPercentage: number, mode: 'shadow' | 'active' | 'full') {
    this.config.traffic_split.centralwap_percentage = centralwapPercentage;
    this.config.traffic_split.router_psi_percentage = 100 - centralwapPercentage;
    this.config.traffic_split.current_mode = mode;

    this.appLogger.info('Configuración de tráfico actualizada', {
      centralwap_percentage: centralwapPercentage,
      router_psi_percentage: 100 - centralwapPercentage,
      mode,
    });
  }

  /**
   * Obtener configuración actual
   */
  getCurrentConfig(): MigrationConfig['traffic_split'] {
    return { ...this.config.traffic_split };
  }
}




