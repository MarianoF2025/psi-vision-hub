// ================================
// TIPOS PARA SISTEMA DE MIGRACIÓN
// ================================

export interface MigrationConfig {
  // Control de tráfico
  traffic_split: {
    centralwap_percentage: number; // 0-100
    router_psi_percentage: number; // 100-0
    current_mode: 'shadow' | 'active' | 'full';
  };

  // Métricas de validación
  validation_metrics: {
    max_error_rate: number; // 0.1% máximo
    max_latency_p95: number; // 200ms máximo
    min_success_rate: number; // 99.9% mínimo
  };

  // Configuración de rollback automático
  auto_rollback: {
    enabled: boolean;
    triggers: {
      error_rate_threshold: number; // 1% para rollback automático
      latency_threshold: number; // 500ms para rollback
      consecutive_failures: number; // 5 fallos seguidos
    };
    cooldown_minutes: number; // 60 min antes de retry
  };

  // Configuración de logging
  migration_logging: {
    log_all_requests: boolean; // True durante migración
    compare_responses: boolean; // True en modo shadow
    sample_rate: number; // 100% durante migración
  };
}

export interface SystemHealth {
  router_psi: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    error_rate: number;
    latency_p95: number;
    requests_last_minute: number;
    consecutive_failures: number;
  };
  centralwap: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    error_rate: number;
    latency_p95: number;
    requests_last_minute: number;
    consecutive_failures: number;
  };
}

export interface ComparisonResult {
  routing_id: string;
  timestamp: Date;
  differences_found: boolean;
  severity: 'info' | 'warning' | 'critical';
  details: Record<string, any>;
  actionable: boolean;
}

export interface RoutingDecision {
  system: 'router_psi' | 'centralwap' | 'both';
  reason: string;
  routing_id: string;
}

export interface MigrationSchedule {
  day_0: {
    mode: 'shadow';
    centralwap_percentage: 0;
    description: string;
    duration: string;
    success_criteria: string[];
  };
  day_1: {
    mode: 'active';
    centralwap_percentage: 10;
    description: string;
    duration: string;
    success_criteria: string[];
  };
  day_2: {
    mode: 'active';
    centralwap_percentage: 25;
    description: string;
    duration: string;
    success_criteria: string[];
  };
  day_3: {
    mode: 'active';
    centralwap_percentage: 50;
    description: string;
    duration: string;
    success_criteria: string[];
  };
  day_4: {
    mode: 'active';
    centralwap_percentage: 75;
    description: string;
    duration: string;
    success_criteria: string[];
  };
  day_5: {
    mode: 'active';
    centralwap_percentage: 90;
    description: string;
    duration: string;
    success_criteria: string[];
  };
  day_6: {
    mode: 'full';
    centralwap_percentage: 100;
    description: string;
    duration: string;
    success_criteria: string[];
  };
}




