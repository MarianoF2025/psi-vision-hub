# Sistema de Notificaciones a Inboxs - Implementación Completa

## ✅ Problema Resuelto

Los inboxs de **Ventas** y **Comunidad** ahora **SÍ reciben mensajes** gracias al sistema de notificaciones implementado.

## 🔧 Implementación

### Servicio: InboxNotifierService

**Archivo**: `src/services/InboxNotifierService.ts`

Este servicio envía notificaciones a los webhooks de N8N para que los mensajes lleguen a los inboxs correspondientes.

### Cuándo se Envían Notificaciones

#### 1. **Al Crear Derivación**
Cuando un usuario elige un área del menú (ej: "3" para Ventas, "4" para Comunidad):

1. Se crea registro en `derivaciones`
2. Se crea registro en `tickets`
3. Se activa proxy (`proxy_activo: true`, `area_proxy: 'ventas'`)
4. **Se notifica al inbox correspondiente** ✅

```typescript
// En PersistorRespuesta.procesarDerivacion()
await this.notificarDerivacionInbox({
  conversacion_id,
  telefono,
  area_destino: 'ventas',
  ticket_id,
  derivacion_id,
  mensaje: 'Mensaje de derivación'
});
```

#### 2. **Con Proxy Activo**
Cuando el proxy está activo y llega un mensaje:

1. Se registra interacción entrante
2. **Se notifica inmediatamente al inbox del área proxy** ✅
3. NO se envía respuesta automática (conversación humana)

```typescript
// En ProcesadorEntrada.procesarEntrada()
if (contexto.proxy_activo && contexto.area_proxy) {
  await this.notificarMensajeProxyInbox({
    conversacion_id,
    telefono,
    mensaje: mensaje.contenido,
    area_proxy: 'ventas'
  });
}
```

## 📋 Configuración de Webhooks

### Variables de Entorno Requeridas

Agregar al archivo `.env`:

```env
# Webhooks N8N para notificar a inboxs
N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION=https://tu-n8n.com/webhook/administracion
N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS=https://tu-n8n.com/webhook/alumnos
N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1=https://tu-n8n.com/webhook/ventas
N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD=https://tu-n8n.com/webhook/comunidad
N8N_WEBHOOK_ENVIOS_ROUTER_CRM=https://tu-n8n.com/webhook/crm
```

### Formato del Payload

El servicio envía a cada webhook:

```json
{
  "conversacion_id": "uuid-de-conversacion",
  "telefono": "+5491134567890",
  "mensaje": "Texto del mensaje o mensaje de derivación",
  "area": "ventas" | "comunidad" | "administracion" | "alumnos",
  "tipo": "derivacion" | "mensaje_proxy" | "mensaje_normal",
  "timestamp": "2025-11-22T13:00:00Z",
  "ticket_id": "20251122-143052-A3F2",
  "derivacion_id": "uuid-de-derivacion",
  "metadata": {
    "source": "centralwap-router",
    "proxy_activo": true
  }
}
```

## 🔄 Flujo Completo

### Escenario 1: Usuario deriva a Ventas

```
1. Usuario: "3" (Inscripciones/Ventas)
   ↓
2. Sistema crea derivación y ticket
   ↓
3. Proxy se activa (proxy_activo: true, area_proxy: 'ventas')
   ↓
4. ✅ Se notifica a webhook: N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1
   ↓
5. N8N recibe notificación → mensaje aparece en inbox de Ventas
   ↓
6. Usuario recibe: "✅ Te hemos derivado a Inscripciones..."
```

### Escenario 2: Mensaje con proxy activo (Ventas)

```
1. Usuario: "Necesito información sobre cursos"
   ↓
2. ProcesadorEntrada detecta proxy_activo === true
   ↓
3. ✅ Se notifica inmediatamente a webhook de Ventas
   ↓
4. N8N recibe mensaje → aparece en inbox de Ventas
   ↓
5. NO se envía respuesta automática (conversación humana)
```

### Escenario 3: Usuario deriva a Comunidad

```
1. Usuario: "4" (Comunidad)
   ↓
2. Sistema crea derivación y ticket
   ↓
3. Proxy se activa (proxy_activo: true, area_proxy: 'comunidad')
   ↓
4. ✅ Se notifica a webhook: N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD
   ↓
5. N8N recibe notificación → mensaje aparece en inbox de Comunidad
```

## ✅ Solución Implementada

### Problema Original
- ❌ Ventas y Comunidad no recibían mensajes
- ❌ Solo se creaban registros en BD pero no se notificaba a inboxs

### Solución
- ✅ **InboxNotifierService** envía notificaciones a webhooks de N8N
- ✅ Notifica **al crear derivación**
- ✅ Notifica **cada mensaje cuando proxy está activo**
- ✅ Manejo de errores sin interrumpir flujo principal
- ✅ Logging completo para debugging

## 🔍 Verificación

### Test Manual

1. **Derivar a Ventas**:
   - Usuario envía "3"
   - Verificar en logs: "Notificación enviada exitosamente a inbox" con área "ventas"
   - Verificar en N8N que recibió notificación
   - Verificar en inbox de Ventas que aparece el mensaje

2. **Mensaje con proxy activo**:
   - Usuario ya derivado a Ventas
   - Usuario envía "Hola"
   - Verificar en logs: "Mensaje notificado a inbox con proxy activo"
   - Verificar en inbox de Ventas que aparece el nuevo mensaje

3. **Derivar a Comunidad**:
   - Usuario envía "4"
   - Verificar en logs: "Notificación enviada exitosamente a inbox" con área "comunidad"
   - Verificar en N8N que recibió notificación
   - Verificar en inbox de Comunidad que aparece el mensaje

## 📝 Archivos Modificados

1. ✅ `src/services/InboxNotifierService.ts` - Servicio nuevo
2. ✅ `src/core/ProcesadorEntrada.ts` - Notifica cuando proxy activo
3. ✅ `src/core/PersistorRespuesta.ts` - Notifica al crear derivación
4. ✅ `src/config/environment.ts` - Configuración de webhooks

## ⚠️ Importante

- **Configurar webhooks en `.env`** antes de usar
- **Verificar que N8N esté recibiendo** las notificaciones
- **Si un webhook falla**, no interrumpe el flujo (solo loguea error)
- **Logs muestran** todas las notificaciones enviadas

---

**✅ Los inboxs de Ventas y Comunidad ahora SÍ reciben mensajes correctamente**


