# 🔍 Auditoría de Tablas Supabase - Estado Actual

## ✅ Estado: Código Ajustado

El código en `lib/router/processor.ts` **YA ESTÁ CORREGIDO** para usar la estructura real de Supabase.

## 📊 Tablas Usadas

### 1. Tabla `tickets` (Sistema de Tickets)
**Estructura Real:**
- `ticket_id` (TEXT, NOT NULL) - Número único PSI-YYYY-XXXXXX
- `conversacion_id` (UUID)
- `telefono` (TEXT, NOT NULL)
- `area` (TEXT, NOT NULL)
- `origen` (TEXT) - default 'n8n', usamos 'Router Automático'
- `estado` (TEXT) - default 'abierto'
- `prioridad` (TEXT) - default 'normal'
- `metadata` (JSONB) - Auditoría completa
- `ts_abierto`, `ts_en_progreso`, `ts_resuelto`, `ts_cerrado` (timestamps)

**Uso en Código:**
- ✅ Crea tickets en esta tabla
- ✅ Genera `ticket_id` único
- ✅ Guarda auditoría completa en `metadata`

### 2. Tabla `derivaciones` (Tracking)
**Estructura Real:**
- `ticket_id` (TEXT, NULLABLE) - Referencia al ticket
- `conversacion_id` (UUID)
- `telefono` (TEXT, NOT NULL)
- `area` (TEXT, NOT NULL)
- `inbox_destino`, `api_destino` (TEXT)
- `subetiqueta` (TEXT)
- `status` (TEXT) - default 'enviada'
- `payload` (JSONB)
- `ts_derivacion`, `ts_ack` (timestamps)

**Uso en Código:**
- ✅ Crea registro para tracking
- ✅ Referencia `ticket_id` del ticket creado
- ✅ Guarda información básica en `payload`

### 3. Tabla `conversaciones`
**Campos Usados:**
- ✅ `area` - Actualizado al área destino
- ✅ `estado` - Mantiene 'activa'
- ✅ `router_estado` - 'derivada' o 'principal'
- ✅ `subetiqueta` - Subárea seleccionada
- ✅ `submenu_actual` - Subárea seleccionada (existe)
- ✅ `ts_ultima_derivacion` - Timestamp
- ✅ `ultima_derivacion` - Número de ticket (TEXT)
- ✅ `metadata` - Información adicional (JSONB)
- ✅ `ts_ultimo_mensaje`, `last_message_at`, `ultimo_mensaje_at` - Timestamps

### 4. Tabla `mensajes`
**Campos Usados:**
- ✅ `conversacion_id` (UUID)
- ✅ `mensaje` (TEXT)
- ✅ `remitente_tipo` (TEXT) - 'system', 'user', 'agent'
- ✅ `remitente_nombre` (TEXT)
- ✅ `remitente` (TEXT) - Mantenido para compatibilidad
- ✅ `timestamp` (TIMESTAMPTZ)
- ✅ `metadata` (JSONB)

### 5. Tabla `audit_log`
**Estructura Real:**
- `conversacion_id` (UUID)
- `telefono` (TEXT)
- `actor` (TEXT) - 'Sistema Router'
- `accion` (TEXT) - 'ticket_creado'
- `datos` (JSONB) - Información del ticket

**Uso en Código:**
- ✅ Registra eventos de creación de tickets

## ✅ Mapeo de Campos

### Creación de Ticket
```typescript
// Tabla tickets
{
  ticket_id: "PSI-2025-000001",
  conversacion_id: conversationId,
  telefono: conversacion.telefono,
  area: conversationArea,
  origen: "Router Automático",
  estado: "abierto",
  prioridad: "normal" | "alta",
  metadata: {
    // Auditoría completa
    nombre_contacto, area_origen, area_destino, motivo,
    contexto_completo: { mensajes, menu_recorrido, opciones_seleccionadas },
    derivado_por: "Router Automático"
  },
  ts_abierto: timestamp
}
```

### Actualización de Conversación
```typescript
// Tabla conversaciones
{
  area: conversationArea,
  estado: "activa",
  router_estado: "derivada",
  subetiqueta: subarea,
  submenu_actual: subarea,
  ts_ultima_derivacion: timestamp,
  ultima_derivacion: ticketNumero,
  metadata: {
    ...metadataActual,
    ticket_activo: ticket.id,
    ticket_numero: ticketNumero,
    menu_actual: "derivada",
    ultima_interaccion: timestamp
  }
}
```

## 📋 Notas Importantes

1. **NO se necesita ejecutar ningún SQL** - Las tablas ya existen
2. **El código está ajustado** para usar la estructura real
3. **Se usa `metadata` JSONB** para información adicional
4. **Se crean tickets en tabla `tickets`** (no en `derivaciones`)
5. **Se crean registros en `derivaciones`** solo para tracking
