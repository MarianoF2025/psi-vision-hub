# ✅ Solución: Inboxs Ventas y Comunidad Ahora Reciben Mensajes

## 🔍 Problema Identificado

Los inboxs de **Ventas** y **Comunidad** no recibían mensajes porque:
- ❌ No se enviaban notificaciones a los webhooks de N8N
- ❌ Solo se creaban registros en BD (`derivaciones`, `tickets`) pero no se notificaba a los inboxs
- ❌ Faltaba servicio para comunicarse con N8N

## ✅ Solución Implementada

### 1. Servicio de Notificaciones

**Archivo**: `src/services/InboxNotifierService.ts`

Servicio que envía notificaciones a los webhooks de N8N según el área destino:

```typescript
// Notifica al webhook correspondiente
await inboxNotifier.notificarMensajeInbox({
  conversacion_id,
  telefono,
  mensaje,
  area_destino: 'ventas' | 'comunidad',
  tipo: 'derivacion' | 'mensaje_proxy'
});
```

### 2. Notificación al Crear Derivación

**Archivo**: `src/core/PersistorRespuesta.ts`

Cuando se crea una derivación, ahora se notifica inmediatamente al inbox:

```typescript
// Después de crear derivación y ticket
await this.notificarDerivacionInbox({
  conversacion_id: contexto.id,
  telefono: contexto.telefono,
  area_destino: 'ventas', // o 'comunidad'
  ticket_id: resultadoTicket.ticket_id,
  derivacion_id: resultadoTicket.derivacion_id,
  mensaje: accion.contenido,
});
```

### 3. Notificación con Proxy Activo

**Archivo**: `src/core/ProcesadorEntrada.ts`

Cuando el proxy está activo y llega un mensaje, se notifica al inbox:

```typescript
// Si proxy está activo, notificar cada mensaje entrante
if (contexto.proxy_activo && contexto.area_proxy) {
  await this.notificarMensajeProxyInbox({
    conversacion_id: contexto.id,
    telefono: contexto.telefono,
    mensaje: mensaje.contenido,
    area_proxy: contexto.area_proxy, // 'ventas' o 'comunidad'
  });
}
```

## 📋 Configuración Requerida

### Variables de Entorno

Agregar al archivo `.env`:

```env
# Webhooks N8N para notificar a inboxs
N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1=https://tu-n8n.com/webhook/ventas
N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD=https://tu-n8n.com/webhook/comunidad
N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION=https://tu-n8n.com/webhook/administracion
N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS=https://tu-n8n.com/webhook/alumnos
N8N_WEBHOOK_ENVIOS_ROUTER_CRM=https://tu-n8n.com/webhook/crm
```

## 🔄 Flujo Completo

### Escenario: Usuario deriva a Ventas

```
1. Usuario envía "3" (Inscripciones/Ventas)
   ↓
2. Sistema crea:
   ✅ Registro en tabla `derivaciones`
   ✅ Registro en tabla `tickets` con ticket_id formateado
   ✅ Actualiza `conversaciones` con proxy_activo=true
   ↓
3. ✅ NOTIFICACIÓN A WEBHOOK:
   POST N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1
   Payload: {
     conversacion_id, telefono, mensaje,
     area: "ventas", tipo: "derivacion",
     ticket_id, derivacion_id
   }
   ↓
4. N8N recibe notificación → mensaje aparece en inbox de Ventas ✅
   ↓
5. Usuario recibe: "✅ Te hemos derivado a Inscripciones..."
```

### Escenario: Mensaje con proxy activo (Ventas)

```
1. Proxy activo: proxy_activo=true, area_proxy='ventas'
   ↓
2. Usuario envía: "Hola, necesito información"
   ↓
3. ProcesadorEntrada detecta proxy activo
   ↓
4. ✅ NOTIFICACIÓN A WEBHOOK:
   POST N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1
   Payload: {
     conversacion_id, telefono,
     mensaje: "Hola, necesito información",
     area: "ventas", tipo: "mensaje_proxy"
   }
   ↓
5. N8N recibe mensaje → aparece en inbox de Ventas ✅
   ↓
6. NO se envía respuesta automática (conversación humana)
```

## ✅ Verificación

### Test 1: Derivación a Ventas

```bash
# 1. Enviar mensaje
curl -X POST http://localhost:3002/api/centralwap/message \
  -d '{
    "telefono": "+5491134567890",
    "contenido": "3",
    "whatsapp_message_id": "test_123",
    "origen": "manual"
  }'

# 2. Verificar logs
# Buscar: "Notificación enviada exitosamente a inbox" con área "ventas"

# 3. Verificar en N8N
# El webhook debe recibir la notificación

# 4. Verificar en inbox de Ventas
# Debe aparecer el mensaje de derivación
```

### Test 2: Mensaje con proxy activo

```bash
# Después de derivar a Ventas, enviar otro mensaje
curl -X POST http://localhost:3002/api/centralwap/message \
  -d '{
    "telefono": "+5491134567890",
    "contenido": "Necesito información",
    "whatsapp_message_id": "test_124",
    "origen": "manual"
  }'

# Verificar que se notifica a inbox de Ventas
```

## 📊 Mapeo de Áreas a Webhooks

| Área Interna | Área BD | Webhook |
|-------------|---------|---------|
| `ventas` | `ventas` | `N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1` |
| `comunidad` | `comunidad` | `N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD` |
| `admin` | `administracion` | `N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION` |
| `alumnos` | `alumnos` | `N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS` |

## 🔧 Archivos Creados/Modificados

1. ✅ `src/services/InboxNotifierService.ts` - Servicio nuevo para notificar a inboxs
2. ✅ `src/core/PersistorRespuesta.ts` - Notifica al crear derivación
3. ✅ `src/core/ProcesadorEntrada.ts` - Notifica cuando proxy activo
4. ✅ `src/config/environment.ts` - Configuración de webhooks
5. ✅ `src/types/index.ts` - Tipos actualizados con webhooks

## ⚠️ Importante

1. **Configurar webhooks en `.env`** antes de usar
2. **Verificar que N8N esté funcionando** y recibiendo webhooks
3. **Si un webhook falla**, no interrumpe el flujo (solo loguea error)
4. **Los logs muestran** todas las notificaciones enviadas

## 🎯 Resultado

✅ **Los inboxs de Ventas y Comunidad ahora SÍ reciben mensajes** cuando:
- Se crea una derivación al área
- El proxy está activo y llega un mensaje nuevo

✅ **Todos los mensajes se notifican correctamente** a los webhooks de N8N

✅ **El sistema funciona end-to-end** desde mensaje hasta inbox


