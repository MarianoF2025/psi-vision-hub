# 📊 Esquema Completo Supabase - Análisis

## 🔍 Hallazgos Importantes

### 1. Tabla `tickets` (Sistema de Tickets)
**EXISTE** y tiene estructura completa:
- `ticket_id` (text) - **NO NULL** - Número único del ticket
- `conversacion_id` (uuid)
- `telefono` (text) - NO NULL
- `area` (text) - NO NULL
- `origen` (text) - default 'n8n'
- `estado` (text) - default 'abierto' (abierto, en_progreso, resuelto, cerrado)
- `prioridad` (text) - default 'normal'
- `metadata` (jsonb) - Para información adicional
- `ts_abierto`, `ts_en_progreso`, `ts_resuelto`, `ts_cerrado` (timestamps)

### 2. Tabla `derivaciones` (Tracking de Derivaciones)
**EXISTE** pero es diferente:
- `ticket_id` (text) - **NULLABLE** - Referencia al ticket
- `conversacion_id` (uuid)
- `telefono` (text) - NO NULL
- `area` (text) - NO NULL
- `status` (text) - default 'enviada'
- `payload` (jsonb) - Datos de la derivación
- `inbox_destino`, `api_destino` (text)
- `ts_derivacion`, `ts_ack` (timestamps)

### 3. Tabla `conversaciones`
**Campos importantes:**
- ✅ `submenu_actual` (text) - **EXISTE** - Puedo usarlo directamente
- ✅ `router_estado` (text) - Existe
- ✅ `metadata` (jsonb) - Existe
- ✅ `ts_ultima_derivacion` (timestamp) - Existe
- ✅ `ultima_derivacion` (text) - Existe

## 🎯 Estrategia Correcta

### Opción A: Usar tabla `tickets` (RECOMENDADO)
- Crear ticket en tabla `tickets` con toda la información
- Crear registro en `derivaciones` para tracking, referenciando el `ticket_id`

### Opción B: Solo usar `derivaciones`
- Usar `derivaciones` como ticket (menos ideal)

## 📋 Ajustes Necesarios

1. **Crear ticket en tabla `tickets`** (no en `derivaciones`)
2. **Crear registro en `derivaciones`** para tracking, con referencia al ticket
3. **Usar `submenu_actual` directamente** en conversaciones (no necesita metadata)
4. **Actualizar `conversaciones`** con campos reales

