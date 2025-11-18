# 🎫 Implementación Sistema de Tickets - PSI Vision Hub

## ✅ Completado

### 1. SQL Migration (`supabase/migrations/001_create_tickets_system.sql`)
- ✅ Tabla `derivaciones` (tickets) con auditoría completa
- ✅ Tabla `ticket_eventos` para trail de auditoría
- ✅ Índices para performance
- ✅ Triggers para `updated_at` automático
- ✅ Vista `vista_rendimiento_areas` para métricas
- ✅ Campos adicionales en `conversaciones` (ticket_activo, ticket_numero, menu_actual, etc.)

### 2. Router Processor (`lib/router/processor.ts`)
- ✅ `saveMessage()` corregido para usar `remitente_tipo` y `remitente_nombre`
- ✅ `generateTicketNumber()` - Genera números únicos PSI-YYYY-XXXXXX
- ✅ `deriveConversation()` - Crea tickets con auditoría completa
- ✅ `obtenerHistorialCompleto()` - Obtiene todo el historial de mensajes
- ✅ `determinarPrioridad()` - Asigna prioridad basada en motivo e historial
- ✅ `obtenerTiempoRespuesta()` - Tiempos estimados por área
- ✅ `extraerOpcionesSeleccionadas()` - Extrae opciones del menú seleccionadas
- ✅ `getMenuState()` y `hasSystemMessages()` actualizados para usar `remitente_tipo`
- ✅ Mensaje de derivación incluye número de ticket y tiempo estimado

### 3. Flujo Completo
```
Usuario envía mensaje → Router detecta primera interacción → Muestra menú principal
Usuario selecciona opción (ej: "2") → Muestra submenú
Usuario selecciona submenú (ej: "22") → Crea ticket → Deriva conversación → Envía mensaje con ticket
```

## 📋 Pendiente

### 1. Ejecutar SQL en Supabase
```sql
-- Ejecutar el archivo: supabase/migrations/001_create_tickets_system.sql
-- En Supabase Studio > SQL Editor
```

### 2. Componentes CRM (Frontend)
- [ ] `components/crm/TicketsSidebar.tsx` - Sidebar con lista de tickets
- [ ] `components/crm/TicketDetails.tsx` - Vista detallada de ticket
- [ ] Integrar en `components/crm/CRMInterface.tsx`
- [ ] Tipos TypeScript para tickets (`lib/types/tickets.ts`)

### 3. Testing
- [ ] Probar flujo completo en local
- [ ] Verificar que se crean tickets correctamente
- [ ] Verificar que se guarda contexto completo
- [ ] Verificar que se registran eventos

## 🧪 Testing Local

### 1. Ejecutar SQL en Supabase
1. Abrir Supabase Studio
2. Ir a SQL Editor
3. Copiar y ejecutar `supabase/migrations/001_create_tickets_system.sql`

### 2. Probar Webhook
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

### 3. Verificar en Supabase
- Tabla `conversaciones` debe tener nueva conversación
- Tabla `mensajes` debe tener mensajes con `remitente_tipo`
- Tabla `derivaciones` debe tener ticket después de derivar
- Tabla `ticket_eventos` debe tener evento de creación

## 📊 Estructura de Datos

### Ticket (derivaciones)
```typescript
{
  ticket_numero: "PSI-2025-000001",
  conversacion_id: "uuid",
  telefono: "5491133901743",
  area_origen: "PSI Principal",
  area_destino: "Alumnos",
  motivo: "Alumnos - Clases y cronograma",
  contexto_completo: {
    mensajes: [...],
    menu_recorrido: "Alumnos",
    opciones_seleccionadas: ["2", "22"]
  },
  estado: "Pendiente",
  prioridad: "Normal"
}
```

### Evento de Ticket
```typescript
{
  ticket_id: "uuid",
  evento_tipo: "creado",
  descripcion: "Ticket creado por derivación automática",
  usuario: "Sistema Router",
  metadata: {...}
}
```

## 🔄 Próximos Pasos

1. **Ejecutar SQL en Supabase** (CRÍTICO)
2. **Probar en local** - Verificar que funciona
3. **Implementar componentes CRM** - Vista de tickets
4. **Deploy a producción** - Cuando esté probado

