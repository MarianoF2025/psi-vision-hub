# 🚀 Integración CRM ↔ Router: Envío de Mensajes

## ✅ IMPLEMENTACIÓN COMPLETADA

Se ha implementado la integración completa entre el CRM y el Router Centralwap para permitir que los agentes envíen mensajes por WhatsApp.

---

## 📋 Cambios Realizados

### 1. **Router Centralwap** - Nuevo Endpoint de Envío

#### Archivos Creados/Modificados:

- ✅ `centralwap-router/src/routes/messages.ts` (NUEVO)
  - Endpoint: `POST /api/centralwap/messages/send`
  - Recibe mensajes del CRM y los envía por WhatsApp
  - Valida teléfono, mensaje y conversación
  - Actualiza estado del mensaje en BD

- ✅ `centralwap-router/src/services/WhatsAppServiceFactory.ts` (NUEVO)
  - Factory para crear el servicio de WhatsApp correcto según configuración
  - Soporta Evolution API y Meta Cloud API (preparado para futuro)

- ✅ `centralwap-router/src/index.ts` (MODIFICADO)
  - Agregada ruta `/api/centralwap/messages`
  - Agregado rate limiting para el nuevo endpoint

#### Características del Endpoint:

```typescript
POST /api/centralwap/messages/send
Content-Type: application/json

{
  "telefono": "+5491133901743",
  "mensaje": "Hola, ¿cómo puedo ayudarte?",
  "conversacion_id": "uuid-de-conversacion",
  "remitente": "agente@email.com" // opcional
}
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "request_id": "send_1234567890_abc123",
  "message_id": "wamid.xxx",
  "conversacion_id": "uuid-de-conversacion",
  "estado": "sent"
}
```

**Respuesta de Error:**
```json
{
  "success": false,
  "request_id": "send_1234567890_abc123",
  "error": "Descripción del error"
}
```

---

### 2. **CRM** - Integración con Router

#### Archivos Modificados:

- ✅ `app/api/messages/send/route.ts` (MODIFICADO)
  - Eliminado TODO comentado
  - Implementada llamada al Router después de guardar mensaje en BD
  - Manejo de errores completo
  - Actualización de estado del mensaje según resultado

#### Flujo Completo:

```
1. Usuario escribe mensaje en CRM
   ↓
2. CRM guarda mensaje en BD (Supabase)
   ↓
3. CRM llama a Router: POST /api/centralwap/messages/send
   ↓
4. Router valida y envía por WhatsApp (Evolution/Meta API)
   ↓
5. Router retorna message_id y estado
   ↓
6. CRM actualiza mensaje en BD con message_id y estado 'sent'
   ↓
7. Usuario ve mensaje como enviado en la UI
```

---

## 🔧 Configuración Requerida

### Variable de Entorno en CRM

Agregar la siguiente variable de entorno en el archivo `.env.local` del CRM (raíz del proyecto):

```bash
# URL del Router Centralwap
CENTRALWAP_ROUTER_URL=http://localhost:3002

# O si está en producción:
# CENTRALWAP_ROUTER_URL=https://router.psivisionhub.com
```

**Nota:** Si no se configura, el sistema intentará usar `http://localhost:3002` por defecto.

### Verificar Configuración del Router

El Router debe estar configurado con:

```bash
# En centralwap-router/.env
WHATSAPP_PROVIDER=cloud_api  # o 'evolution'
META_ACCESS_TOKEN=tu_token
META_PHONE_NUMBER_ID=tu_phone_id
# O si usas Evolution:
EVOLUTION_API_URL=tu_url
EVOLUTION_API_KEY=tu_key
EVOLUTION_INSTANCE_NAME=tu_instancia
```

---

## 🧪 Testing

### 1. Verificar que el Router esté corriendo

```bash
# En centralwap-router/
npm run dev

# Debe iniciar en puerto 3002 (o el configurado)
```

### 2. Verificar endpoint del Router

```bash
curl -X POST http://localhost:3002/api/centralwap/messages/send \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test_123" \
  -d '{
    "telefono": "+5491133901743",
    "mensaje": "Mensaje de prueba",
    "conversacion_id": "uuid-de-conversacion-existente"
  }'
```

### 3. Probar desde el CRM

1. Iniciar CRM: `npm run dev` (puerto 3001)
2. Abrir http://localhost:3001/crm-com
3. Seleccionar una conversación
4. Escribir un mensaje
5. Hacer click en enviar
6. **VERIFICAR:**
   - El mensaje debe guardarse en BD
   - El mensaje debe enviarse por WhatsApp
   - El estado debe actualizarse a 'sent'
   - Debe aparecer el checkmark de enviado

---

## 🐛 Troubleshooting

### Error: "Error al comunicarse con el Router de WhatsApp"

**Causas posibles:**
1. Router no está corriendo
2. URL incorrecta en `CENTRALWAP_ROUTER_URL`
3. Puerto del Router diferente al configurado

**Solución:**
```bash
# Verificar que el Router esté corriendo
curl http://localhost:3002/api/centralwap/health

# Verificar variable de entorno
echo $CENTRALWAP_ROUTER_URL
```

---

### Error: "Conversación no encontrada"

**Causas posibles:**
1. `conversacion_id` inválido
2. Conversación no existe en BD

**Solución:**
- Verificar que el ID de conversación sea válido
- Verificar que la conversación exista en Supabase

---

### Error: "Error al enviar mensaje por WhatsApp"

**Causas posibles:**
1. Configuración de WhatsApp incorrecta en Router
2. Token de acceso inválido
3. Teléfono mal formateado

**Solución:**
- Verificar variables de entorno del Router
- Verificar logs del Router: `centralwap-router/logs/`
- Verificar formato de teléfono (debe ser E.164: `+5491133901743`)

---

## 📊 Logs y Monitoreo

### Logs del Router

Los logs del Router muestran:

```
[INFO] Enviando mensaje desde CRM
[INFO] Mensaje enviado exitosamente desde CRM
[ERROR] Error al enviar mensaje por WhatsApp (si hay error)
```

### Logs del CRM

Los logs del CRM (consola del navegador) muestran:

```
Error al comunicarse con el Router (si hay error)
```

---

## ✅ Checklist de Implementación

- [x] Endpoint `/api/centralwap/messages/send` creado en Router
- [x] Factory de WhatsAppService creado
- [x] Endpoint del CRM modificado para llamar al Router
- [x] Manejo de errores implementado
- [x] Actualización de estado de mensajes implementada
- [ ] Variable de entorno `CENTRALWAP_ROUTER_URL` configurada en CRM
- [ ] Testing end-to-end realizado
- [ ] Documentación actualizada

---

## 🎯 Próximos Pasos

1. **Configurar variable de entorno** en `.env.local` del CRM
2. **Probar envío completo** desde el CRM
3. **Implementar estados de mensajes** (sent/delivered/read) con webhooks
4. **Implementar envío de multimedia** (imágenes, audios, documentos)

---

## 📝 Notas Técnicas

### Flujo de Datos

```
CRM (Next.js API Route)
  ↓ HTTP POST
Router (Express)
  ↓ WhatsAppService.enviarMensaje()
WhatsApp API (Evolution/Meta)
  ↓ message_id
Router
  ↓ response
CRM
  ↓ update BD
Supabase
```

### Validaciones

- ✅ Teléfono en formato E.164
- ✅ Mensaje no vacío y < 4096 caracteres
- ✅ Conversación existe en BD
- ✅ Teléfono coincide con conversación (warn si no)

### Seguridad

- ✅ Rate limiting aplicado al endpoint
- ✅ Validación de entrada con express-validator
- ✅ Logging de todas las operaciones
- ✅ Manejo seguro de errores (no expone detalles internos)

---

**Fecha de Implementación:** 2024-01-XX  
**Estado:** ✅ Completado - Requiere configuración y testing



