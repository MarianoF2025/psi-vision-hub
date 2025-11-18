# 🔍 Auditoría de Tablas Supabase - Análisis y Ajustes

## 📊 Tablas Analizadas

### 1. Tabla `conversaciones` (Real vs Código)

#### ✅ Campos que el código usa y EXISTEN:
- `id` (uuid) ✅
- `telefono` (text) ✅
- `area` (text) ✅
- `estado` (text) ✅
- `ts_ultimo_mensaje` (timestamp) ✅
- `created_at` (timestamp) ✅
- `updated_at` (timestamp) ✅
- `contacto_id` (uuid) ✅ - El código usa pero como `contacto_id`
- `agente_id` (uuid) ✅ - Existe pero no se usa en router

#### ⚠️ Campos que el código intenta usar pero NO EXISTEN en la tabla real:
- `nombre` (text) - El código no lo usa directamente, pero existe en la tabla
- `menu_actual` (text) - **NO EXISTE** - El código intenta actualizarlo
- `submenu_actual` (text) - **NO EXISTE** - El código intenta actualizarlo
- `ticket_activo` (uuid) - **NO EXISTE** - El código intenta actualizarlo
- `ticket_numero` (text) - **NO EXISTE** - El código intenta actualizarlo
- `ultima_interaccion` (timestamp) - **NO EXISTE** - El código intenta actualizarlo

#### 📝 Campos que EXISTEN en la tabla real pero el código NO usa:
- `assignee_id` (integer)
- `ventana_72h_activa`, `ventana_72h_inicio`, `ventana_72h_fin`
- `ventana_24h_activa`, `ventana_24h_inicio`, `ventana_24h_fin`
- `primera_respuesta_enviada` (boolean)
- `ts_ultima_derivacion` (timestamp)
- `ultimo_menu_enviado` (timestamp)
- `inbox_id` (integer)
- `ultimo_mensaje_at` (timestamp)
- `inicio`, `fin` (timestamps)
- `derived_inbox_id` (bigint)
- `last_message_at` (timestamp)
- `metadata` (jsonb)
- `inbox_destino`, `api_destino` (text)
- `caja` (text)
- `titulo` (text)
- `prioridad` (text) - Existe pero no se usa en router
- `canal` (text)
- `ultimo_mensaje` (text)
- `inbox_name` (text)
- `subetiqueta` (text)
- `assignee_name` (text)
- `inbox_whatsapp_number` (text)
- `modo` (text)
- `etiqueta`, `etiqueta_color` (text)
- `etiquetas_adicionales` (array)
- `tipo_contacto` (text)
- `origen`, `origen_detalle` (text)
- `router_estado` (text)
- `ultima_derivacion` (text)
- `resultado` (text)
- `nombre` (text)
- `curso` (text)

### 2. Tabla `mensajes` (Real vs Código)

#### ✅ Campos que el código usa y EXISTEN:
- `id` (uuid) ✅
- `conversacion_id` (uuid) ✅
- `mensaje` (text) ✅
- `remitente_tipo` (text) ✅
- `remitente_nombre` (text) ✅
- `remitente` (text) ✅ - Existe (compatibilidad)
- `timestamp` (timestamp) ✅
- `metadata` (jsonb) ✅
- `tipo` (text) ✅

#### 📝 Campos que EXISTEN pero el código NO usa:
- `remitente_id` (uuid)
- `whatsapp_message_id` (text)
- `telefono` (text)
- `direccion` (text)
- `media_url`, `media_type` (text)
- `attachments` (text)
- `leido` (boolean)
- `enviado` (boolean)
- `duracion` (integer)
- `created_at` (timestamp)

### 3. Tabla `derivaciones` (Real vs Código)

#### ⚠️ PROBLEMA CRÍTICO: La tabla real tiene estructura diferente

**Tabla Real:**
- `id` (uuid)
- `conversacion_id` (uuid) ✅
- `ticket_id` (text) - **NO es UUID, es TEXT**
- `telefono` (text) ✅
- `area` (text) ✅
- `inbox_destino` (text)
- `api_destino` (text)
- `subetiqueta` (text)
- `status` (text)
- `payload` (jsonb)
- `response` (jsonb)
- `error_text` (text)
- `ts_derivacion` (timestamp)
- `ts_ack` (timestamp)
- `requiere_proxy` (boolean)
- `created_at`, `updated_at` (timestamps)

**Tabla que el código intenta crear:**
- `ticket_numero` (text) - **NO EXISTE en tabla real**
- `nombre_contacto` (text) - **NO EXISTE**
- `area_origen`, `area_destino` (text) - **NO EXISTE** (solo `area`)
- `motivo` (text) - **NO EXISTE**
- `contexto_completo` (jsonb) - **NO EXISTE** (pero existe `payload`)
- `estado` (text) - **NO EXISTE** (existe `status`)
- `prioridad` (text) - **NO EXISTE**
- `asignado_a` (text) - **NO EXISTE**
- `fecha_asignacion`, `fecha_primera_respuesta`, `fecha_resolucion` - **NO EXISTEN**
- `tiempo_respuesta_minutos` (integer) - **NO EXISTE**
- `satisfaccion_cliente` (integer) - **NO EXISTE**
- `notas_internas` (text) - **NO EXISTE**
- `derivado_por` (text) - **NO EXISTE**

## 🔧 Ajustes Necesarios

### 1. Ajustar código para usar tabla `derivaciones` existente

La tabla `derivaciones` ya existe pero con estructura diferente. Opciones:

**Opción A:** Usar la tabla existente y adaptar el código
**Opción B:** Crear nueva tabla `tickets` separada
**Opción C:** Modificar la tabla existente (agregar columnas)

### 2. Ajustar campos de `conversaciones`

El código intenta actualizar campos que no existen:
- `menu_actual` → Usar `router_estado` o `metadata`
- `submenu_actual` → Usar `subetiqueta` o `metadata`
- `ticket_activo` → Usar `metadata` o campo existente
- `ticket_numero` → Usar `metadata` o campo existente
- `ultima_interaccion` → Usar `ts_ultimo_mensaje` o `last_message_at`

### 3. Mapeo de campos sugerido

```typescript
// En lugar de:
conversacion.menu_actual = 'principal'
conversacion.submenu_actual = 'Alumnos'
conversacion.ticket_activo = ticketId
conversacion.ticket_numero = 'PSI-2025-000001'

// Usar:
conversacion.router_estado = 'principal' // o 'derivada'
conversacion.subetiqueta = 'Alumnos'
conversacion.metadata = {
  ...conversacion.metadata,
  ticket_activo: ticketId,
  ticket_numero: 'PSI-2025-000001',
  menu_actual: 'principal',
  submenu_actual: 'Alumnos'
}
```

## 📋 Recomendaciones

1. **NO ejecutar** `001_create_tickets_system.sql` tal como está
2. **Adaptar el código** para usar la estructura real de `derivaciones`
3. **Usar `metadata` JSONB** en `conversaciones` para campos adicionales
4. **Mapear campos** según la estructura real

