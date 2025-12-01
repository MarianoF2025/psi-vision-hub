# Sistema de Migración Implementado

## ✅ Implementación Completada

Se ha implementado completamente el **Sistema de Migración Gradual** para transicionar de Router PSI a Centralwap Enterprise sin downtime.

## 📦 Componentes Implementados

### 1. **MigrationTrafficRouter**
- Routing inteligente A/B testing
- Distribución de tráfico por porcentaje
- Modos: shadow, active, full
- Rollback automático en caso de problemas

### 2. **ResponseComparator**
- Compara respuestas en modo shadow
- Detecta diferencias críticas y warnings
- Registra métricas de comparación

### 3. **MigrationMetrics**
- Sistema de métricas completo
- Health checks de ambos sistemas
- Cálculo de error rate, latencia P95
- Detección de fallos consecutivos

### 4. **MigrationController**
- Orquestador principal de migración
- Procesa mensajes según routing
- Modo shadow (ambos sistemas)
- Modo active (porcentaje configurado)
- Modo full (solo Centralwap)

### 5. **RouterPsiAdapter**
- Adaptador para comunicarse con Router PSI
- Formatea mensajes para Router PSI
- Adapta respuestas a formato Centralwap

### 6. **Endpoints API**
- `POST /api/migration/message` - Procesar mensaje durante migración
- `POST /api/migration/traffic` - Cambiar porcentaje de tráfico
- `POST /api/migration/rollback` - Rollback de emergencia
- `GET /api/migration/status` - Estado actual de migración
- `GET /api/migration/health` - Health de ambos sistemas
- `POST /api/migration/shadow` - Activar/desactivar modo shadow

## 🚀 Configuración

### Variables de Entorno

```env
# Habilitar sistema de migración
MIGRATION_ENABLED=true

# URL del Router PSI existente
ROUTER_PSI_URL=http://localhost:3002

# Configuración inicial
MIGRATION_MODE=shadow
MIGRATION_CENTRALWAP_PERCENTAGE=0

# Rollback automático
MIGRATION_AUTO_ROLLBACK=true
MIGRATION_ROLLBACK_ERROR_RATE=1.0
MIGRATION_ROLLBACK_LATENCY=500
MIGRATION_ROLLBACK_CONSECUTIVE=5
```

### Inicialización Automática

El sistema se inicializa automáticamente cuando:
1. `MIGRATION_ENABLED=true`
2. `ROUTER_PSI_URL` está configurado
3. El servidor se inicia

## 📊 Modos de Operación

### Shadow Mode
- Ambos sistemas procesan el mensaje
- Solo Router PSI responde al usuario
- Se comparan las respuestas
- Se registran métricas y diferencias

### Active Mode
- Tráfico dividido según porcentaje configurado
- Cada mensaje va a un sistema u otro
- Se registran métricas de ambos sistemas
- Rollback automático si hay problemas

### Full Mode
- Solo Centralwap procesa
- Router PSI en standby
- Migración completa

## 🔧 Comandos de Control

### Ver Estado Actual
```bash
curl -X GET http://localhost:3002/api/migration/status
```

### Cambiar Porcentaje de Tráfico
```bash
# 10% a Centralwap
curl -X POST http://localhost:3002/api/migration/traffic \
  -d '{"percentage": 10, "mode": "active"}'
```

### Rollback de Emergencia
```bash
curl -X POST http://localhost:3002/api/migration/rollback \
  -d '{"reason": "emergency"}'
```

### Activar Modo Shadow
```bash
curl -X POST http://localhost:3002/api/migration/shadow \
  -d '{"enabled": true}'
```

## 📈 Métricas y Monitoreo

### Health Check
```bash
curl -X GET http://localhost:3002/api/migration/health
```

Retorna:
- Estado de salud de Router PSI
- Estado de salud de Centralwap
- Error rate, latencia P95
- Fallos consecutivos

### Rollback Automático

Se ejecuta automáticamente si:
- Error rate > 1%
- Latencia P95 > 500ms
- 5 fallos consecutivos

## 🔄 Flujo de Migración

1. **Día 0 - Shadow Mode**: Ambos sistemas procesan, solo Router PSI responde
2. **Día 1-5 - Active Mode**: Incrementos graduales (10%, 25%, 50%, 75%, 90%)
3. **Día 6+ - Full Mode**: 100% Centralwap, Router PSI en standby

## ⚠️ Notas Importantes

- **Distribución consistente**: Usa hash del teléfono para que el mismo usuario siempre vaya al mismo sistema
- **Rollback disponible**: Siempre se puede hacer rollback inmediato
- **Métricas en tiempo real**: Todas las métricas se registran en Supabase
- **Sin downtime**: La migración es transparente para los usuarios

## 📝 Próximos Pasos

1. Configurar `MIGRATION_ENABLED=true` en `.env`
2. Configurar `ROUTER_PSI_URL` apuntando al Router PSI existente
3. Crear tablas de métricas en Supabase (opcional pero recomendado):
   - `migration_metrics`
   - `migration_comparisons`
4. Iniciar en modo shadow para validación
5. Seguir el cronograma de migración

Ver `PLAN-MIGRACION.md` para el cronograma detallado.









