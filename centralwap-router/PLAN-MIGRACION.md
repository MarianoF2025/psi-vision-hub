# Plan de Migración Gradual: Router PSI → Centralwap Enterprise

## Objetivo
Migración sin downtime con validación en tiempo real mediante A/B testing gradual con rollback automático.

## Duración
7 días (modo shadow + incrementos diarios)

## Criterio de Éxito
- Performance ≥ sistema actual
- 0 errores críticos
- Latencia < 200ms P95
- Error rate < 0.1%

## Cronograma de Migración

### DÍA 0 - SHADOW MODE (24 horas)
- **Modo**: Shadow
- **Tráfico Centralwap**: 0% (solo procesamiento para comparación)
- **Descripción**: Centralwap procesa pero Router PSI responde
- **Criterios de éxito**:
  - Diferencias críticas < 1%
  - Latencia Centralwap <= Router PSI + 50ms
  - Error rate Centralwap < 0.1%

**Comando para activar**:
```bash
curl -X POST http://localhost:3002/api/migration/shadow -d '{"enabled": true}'
```

### DÍA 1 - ACTIVE 10%
- **Modo**: Active
- **Tráfico Centralwap**: 10%
- **Descripción**: Migración activa con tráfico real limitado
- **Criterios de éxito**:
  - Error rate < 0.1%
  - Latencia P95 < 200ms
  - Feedback usuarios: sin quejas

**Comando para activar**:
```bash
curl -X POST http://localhost:3002/api/migration/traffic -d '{"percentage": 10, "mode": "active"}'
```

### DÍA 2 - ACTIVE 25%
- **Modo**: Active
- **Tráfico Centralwap**: 25%
- **Descripción**: Validación con más tráfico
- **Criterios de éxito**:
  - Performance >= día anterior
  - Métricas de negocio estables
  - Sin escalaciones críticas

**Comando**:
```bash
curl -X POST http://localhost:3002/api/migration/traffic -d '{"percentage": 25, "mode": "active"}'
```

### DÍA 3 - ACTIVE 50%
- **Modo**: Active
- **Tráfico Centralwap**: 50%
- **Descripción**: Punto de no retorno
- **Criterios de éxito**:
  - Latencia promedio < Router PSI
  - Funcionalidades críticas 100% operativas
  - Métricas de derivación correctas

**Comando**:
```bash
curl -X POST http://localhost:3002/api/migration/traffic -d '{"percentage": 50, "mode": "active"}'
```

### DÍA 4 - ACTIVE 75%
- **Modo**: Active
- **Tráfico Centralwap**: 75%
- **Descripción**: Casi migración completa
- **Criterios de éxito**:
  - Sistema estable bajo carga alta
  - Rollback plan validado y listo
  - Monitoreo 24/7 activo

**Comando**:
```bash
curl -X POST http://localhost:3002/api/migration/traffic -d '{"percentage": 75, "mode": "active"}'
```

### DÍA 5 - ACTIVE 90%
- **Modo**: Active
- **Tráfico Centralwap**: 90%
- **Descripción**: Preparación migración final
- **Criterios de éxito**:
  - Confianza técnica completa
  - Aprobación para 100%
  - Plan de desactivación Router PSI listo

**Comando**:
```bash
curl -X POST http://localhost:3002/api/migration/traffic -d '{"percentage": 90, "mode": "active"}'
```

### DÍA 6+ - FULL MIGRATION
- **Modo**: Full
- **Tráfico Centralwap**: 100%
- **Descripción**: Migración completa - Solo Centralwap
- **Criterios de éxito**:
  - Operación normal sin Router PSI
  - Performance objetivo cumplido
  - Desactivación Router PSI segura

**Comando**:
```bash
curl -X POST http://localhost:3002/api/migration/traffic -d '{"percentage": 100, "mode": "full"}'
```

## Comandos de Control

### Ver estado actual
```bash
curl -X GET http://localhost:3002/api/migration/status
```

### Ver health de ambos sistemas
```bash
curl -X GET http://localhost:3002/api/migration/health
```

### Cambiar porcentaje de tráfico
```bash
curl -X POST http://localhost:3002/api/migration/traffic -d '{"percentage": 25, "mode": "active"}'
```

### Rollback de emergencia
```bash
curl -X POST http://localhost:3002/api/migration/rollback -d '{"reason": "emergency"}'
```

### Activar/desactivar modo shadow
```bash
# Activar
curl -X POST http://localhost:3002/api/migration/shadow -d '{"enabled": true}'

# Desactivar
curl -X POST http://localhost:3002/api/migration/shadow -d '{"enabled": false}'
```

## Configuración de Variables de Entorno

```env
# URL del Router PSI existente
ROUTER_PSI_URL=http://localhost:3002

# Configuración inicial de migración
MIGRATION_MODE=shadow
MIGRATION_CENTRALWAP_PERCENTAGE=0

# Thresholds de validación
MIGRATION_MAX_ERROR_RATE=0.1
MIGRATION_MAX_LATENCY_P95=200
MIGRATION_MIN_SUCCESS_RATE=99.9

# Configuración de rollback automático
MIGRATION_AUTO_ROLLBACK=true
MIGRATION_ROLLBACK_ERROR_RATE=1.0
MIGRATION_ROLLBACK_LATENCY=500
MIGRATION_ROLLBACK_CONSECUTIVE=5
MIGRATION_ROLLBACK_COOLDOWN=60

# Logging
MIGRATION_LOG_ALL=true
MIGRATION_COMPARE=true
MIGRATION_SAMPLE_RATE=100
```

## Rollback Automático

El sistema ejecuta rollback automático si se detecta:
- Error rate > 1%
- Latencia P95 > 500ms
- 5 fallos consecutivos

## Monitoreo

### Métricas Clave
- Error rate por sistema
- Latencia P95 por sistema
- Fallos consecutivos
- Diferencias en shadow mode

### Alertas
- **Crítico**: Error rate > 1%, Latencia > 500ms, 5 fallos consecutivos
- **Warning**: Error rate > 0.5%, Incremento de latencia > 50%
- **Info**: Cambios de porcentaje, Resumen diario

## Integración

El sistema de migración se integra automáticamente cuando:
1. Se inicializa `MigrationController` en el servidor principal
2. Se configura `ROUTER_PSI_URL` apuntando al Router PSI existente
3. Se activan las rutas de migración en Express

## Notas Importantes

- **Modo Shadow**: Ambos sistemas procesan, pero solo Router PSI responde al usuario
- **Modo Active**: Tráfico dividido según porcentaje configurado
- **Modo Full**: Solo Centralwap procesa (migración completa)
- **Rollback**: Siempre disponible con un solo comando
- **Distribución**: Usa hash de teléfono para consistencia (mismo usuario siempre al mismo sistema)




