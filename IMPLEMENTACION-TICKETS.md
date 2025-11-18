# 🎫 Implementación Sistema de Tickets - PSI Vision Hub

## ✅ Completado

### 1. Router Processor (`lib/router/processor.ts`)
- ✅ `saveMessage()` corregido para usar `remitente_tipo` y `remitente_nombre`
- ✅ `generateTicketNumber()` - Genera números únicos PSI-YYYY-XXXXXX desde tabla `tickets`
- ✅ `deriveConversation()` - Crea tickets en tabla `tickets` con auditoría completa
- ✅ `obtenerHistorialCompleto()` - Obtiene todo el historial de mensajes
- ✅ `determinarPrioridad()` - Asigna prioridad basada en motivo e historial
- ✅ `obtenerTiempoRespuesta()` - Tiempos estimados por área
- ✅ `extraerOpcionesSeleccionadas()` - Extrae opciones del menú seleccionadas
- ✅ `getMenuState()` y `hasSystemMessages()` actualizados para usar `remitente_tipo`
- ✅ Mensaje de derivación incluye número de ticket y tiempo estimado
- ✅ Crea registro en `derivaciones` para tracking
- ✅ Registra eventos en `audit_log`

### 2. Flujo Completo
```
Usuario envía mensaje → Router detecta primera interacción → Muestra menú principal
Usuario selecciona opción (ej: "2") → Muestra submenú
Usuario selecciona submenú (ej: "22") → Crea ticket en tabla tickets → Crea derivación → Actualiza conversación → Envía mensaje con ticket
```

### 3. Estructura de Datos Usada

**Tabla `tickets` (existente):**
- `ticket_id` (TEXT, NOT NULL) - Número único PSI-YYYY-XXXXXX
- `conversacion_id` (UUID)
- `telefono` (TEXT, NOT NULL)
- `area` (TEXT, NOT NULL)
- `origen` (TEXT) - 'Router Automático'
- `estado` (TEXT) - 'abierto', 'en_progreso', 'resuelto', 'cerrado'
- `prioridad` (TEXT) - 'normal', 'alta', 'urgente'
- `metadata` (JSONB) - Contexto completo, historial, opciones seleccionadas
- `ts_abierto`, `ts_en_progreso`, `ts_resuelto`, `ts_cerrado` (timestamps)

**Tabla `derivaciones` (existente, para tracking):**
- `ticket_id` (TEXT) - Referencia al ticket
- `conversacion_id` (UUID)
- `telefono` (TEXT, NOT NULL)
- `area` (TEXT, NOT NULL)
- `inbox_destino`, `api_destino` (TEXT)
- `status` (TEXT) - 'enviada'
- `payload` (JSONB) - Datos básicos de derivación
- `ts_derivacion`, `ts_ack` (timestamps)

**Tabla `conversaciones` (actualizada):**
- `area` - Actualizado al área destino
- `estado` - Mantiene 'activa'
- `router_estado` - 'derivada'
- `subetiqueta` - Subárea seleccionada
- `submenu_actual` - Subárea seleccionada
- `ts_ultima_derivacion` - Timestamp de derivación
- `ultima_derivacion` - Número de ticket
- `metadata` - Información adicional (ticket_activo, ticket_numero, etc.)

## 📋 Pendiente

### 1. Componentes CRM (Frontend)
- [ ] `components/crm/TicketsSidebar.tsx` - Sidebar con lista de tickets
- [ ] `components/crm/TicketDetails.tsx` - Vista detallada de ticket
- [ ] Integrar en `components/crm/CRMInterface.tsx`
- [ ] Tipos TypeScript para tickets (`lib/types/tickets.ts`)

### 2. Testing
- [ ] Probar flujo completo en local
- [ ] Verificar que se crean tickets correctamente en tabla `tickets`
- [ ] Verificar que se crean derivaciones en tabla `derivaciones`
- [ ] Verificar que se guarda contexto completo en `metadata`
- [ ] Verificar que se registran eventos en `audit_log`

## 🧪 Testing Local

### 1. Probar Webhook
```powershell
# Mensaje inicial
$body = @{
    messages = @(
        @{
            from = "5491133901743"
            id = "test-1"
            timestamp = "1763504688"
            type = "text"
            text = @{ body = "Hola" }
        }
    )
    metadata = @{
        display_phone_number = "5491156090819"
        phone_number_id = "809951985523815"
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3001/api/router/whatsapp/webhook" -Method POST -Body $body -ContentType "application/json"
```

### 2. Verificar en Supabase
- Tabla `conversaciones` debe tener nueva conversación
- Tabla `mensajes` debe tener mensajes con `remitente_tipo` y `remitente_nombre`
- Tabla `tickets` debe tener ticket después de derivar (con `ticket_id` PSI-YYYY-XXXXXX)
- Tabla `derivaciones` debe tener registro de derivación
- Tabla `audit_log` debe tener evento de creación de ticket

## 📊 Estructura de Datos

### Ticket (tabla tickets)
```typescript
{
  ticket_id: "PSI-2025-000001",
  conversacion_id: "uuid",
  telefono: "5491133901743",
  area: "Alumnos",
  origen: "Router Automático",
  estado: "abierto",
  prioridad: "normal",
  metadata: {
    nombre_contacto: "5491133901743",
    area_origen: "PSI Principal",
    area_destino: "Alumnos",
    motivo: "Alumnos - Clases y cronograma",
    contexto_completo: {
      mensajes: [...],
      menu_recorrido: "Alumnos",
      opciones_seleccionadas: ["2", "22"]
    },
    derivado_por: "Router Automático"
  },
  ts_abierto: "2025-01-18T..."
}
```

### Derivación (tabla derivaciones)
```typescript
{
  ticket_id: "PSI-2025-000001",
  conversacion_id: "uuid",
  telefono: "5491133901743",
  area: "Alumnos",
  inbox_destino: "Alumnos",
  api_destino: "webhook_url",
  status: "enviada",
  payload: {
    ticket_id: "PSI-2025-000001",
    motivo: "Alumnos - Clases y cronograma",
    area_origen: "PSI Principal",
    area_destino: "Alumnos"
  },
  ts_derivacion: "2025-01-18T..."
}
```

## 🔄 Próximos Pasos

1. **Probar en local** - Verificar que funciona con estructura real
2. **Implementar componentes CRM** - Vista de tickets
3. **Deploy a producción** - Cuando esté probado
