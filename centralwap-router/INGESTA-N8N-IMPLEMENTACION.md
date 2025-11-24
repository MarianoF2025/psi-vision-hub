# 📥 Sistema de Ingesta desde N8N - Implementación

## ✅ Implementación Completada

Se ha implementado un sistema completo para recibir mensajes desde N8N organizados por área/número, complementando el sistema de recepción directa del Router.

## 🎯 Endpoints Disponibles

### 1. **Endpoints de Router (N8N → Router)**

Estos endpoints coinciden exactamente con las URLs de los webhooks de N8N configurados en `.env`:

```
POST /webhook/router/:area/incoming
```

**Áreas soportadas:**
- `wsp4` → Área general
- `administracion` → Administración
- `alumnos` → Alumnos
- `comunidad` → Comunidad
- `ventas1` → Ventas 1
- `ventas2` → Ventas 2
- `ventas3` → Ventas 3

**Ejemplo de uso:**
```bash
POST https://tu-router.com/webhook/router/administracion/incoming
Content-Type: application/json

{
  "telefono": "+5491134567890",
  "contenido": "Hola, necesito ayuda",
  "whatsapp_message_id": "wamid.xxxxx",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. **Endpoints Directos de Evolution**

```
POST /webhook/evolution/:area/incoming
```

**Áreas soportadas:**
- `administracion`
- `alumnos`
- `comunidad`

**Ejemplo de uso:**
```bash
POST https://tu-router.com/webhook/evolution/administracion/incoming
```

### 3. **Endpoints API Internos**

```
POST /api/centralwap/ingesta/:area
```

**Áreas soportadas:**
- `wsp4`, `administracion`, `alumnos`, `ventas`, `comunidad`

## 📋 Formato del Mensaje

Todos los endpoints esperan el mismo formato de mensaje:

```json
{
  "telefono": "string (E.164: +5491134567890)", // Requerido
  "contenido": "string",                         // Requerido
  "whatsapp_message_id": "string",               // Requerido
  "timestamp": "ISO8601 date string",            // Opcional (default: ahora)
  "multimedia": {                                // Opcional
    "tipo": "audio|imagen|documento|video|sticker|contacto|ubicacion",
    "url": "string",
    "metadata": {
      "filename": "string",
      "mimetype": "string",
      "size": 123,
      "duration": 456
    }
  },
  "utm_data": {                                  // Opcional
    "utm_campaign": "string",
    "utm_source": "string",
    "utm_medium": "string"
  },
  "area_ingesta": "string",                      // Opcional (se toma de la URL)
  "metadata": {}                                 // Opcional
}
```

## 🔄 Flujo de Procesamiento

1. **N8N recibe mensaje** desde WhatsApp (Meta Cloud API o Evolution API)
2. **N8N procesa** y enriquece el mensaje si es necesario
3. **N8N envía mensaje** al Router Centralwap vía webhook de ingesta
4. **Router identifica el área** desde la URL (`/webhook/router/administracion/incoming`)
5. **Router procesa** el mensaje igual que uno recibido directamente
6. **Router responde** con el resultado (menú, derivación, etc.)

## 🏷️ Metadata Agregada

Cuando un mensaje llega por ingesta, se agrega automáticamente:

```javascript
metadata: {
  webhook_source: 'n8n_router' | 'evolution_directa',
  area_ingesta: 'admin' | 'alumnos' | 'ventas' | 'comunidad' | 'wsp4',
  area_url: 'administracion' | 'alumnos' | 'ventas1' | etc.
}
```

Esta información permite:
- Rastrear el origen del mensaje
- Entender por qué área llegó el mensaje
- Diferenciar entre mensajes directos vs. procesados por N8N

## 🔐 Seguridad

- ✅ **Rate Limiting**: Todos los endpoints de ingesta usan `webhookRateLimiter`
- ✅ **Validación de datos**: Express Validator valida todos los campos
- ✅ **Logging**: Todos los mensajes se registran con información completa
- ✅ **Error handling**: Errores se manejan centralizadamente

## 📊 Configuración en .env

Los webhooks de ingesta están configurados en `.env`:

```env
# Ingestas por número/área
N8N_WEBHOOK_INGESTA_ROUTER_WSP4=https://webhookn8n.psivisionhub.com/webhook/router/wsp4/incoming
N8N_WEBHOOK_INGESTA_ROUTER_ADMINISTRACION=https://webhookn8n.psivisionhub.com/webhook/router/administracion/incoming
N8N_WEBHOOK_INGESTA_ROUTER_ALUMNOS=https://webhookn8n.psivisionhub.com/webhook/router/alumnos/incoming
N8N_WEBHOOK_INGESTA_ROUTER_COMUNIDAD=https://webhookn8n.psivisionhub.com/webhook/router/comunidad/incoming
N8N_WEBHOOK_INGESTA_ROUTER_VENTAS_1=https://webhookn8n.psivisionhub.com/webhook/router/ventas1/incoming
N8N_WEBHOOK_INGESTA_ROUTER_VENTAS_2=https://webhookn8n.psivisionhub.com/webhook/router/ventas2/incoming
N8N_WEBHOOK_INGESTA_ROUTER_VENTAS_3=https://webhookn8n.psivisionhub.com/webhook/router/ventas3/incoming
N8N_WEBHOOK_INGESTA_DIRECTA_ADMINISTRACION=https://webhookn8n.psivisionhub.com/webhook/evolution/administracion/incoming
N8N_WEBHOOK_INGESTA_DIRECTA_ALUMNOS=https://webhookn8n.psivisionhub.com/webhook/evolution/alumnos/incoming
N8N_WEBHOOK_INGESTA_DIRECTA_COMUNIDAD=https://webhookn8n.psivisionhub.com/webhook/evolution/comunidad/incoming
```

**Nota:** Estos webhooks son las URLs que N8N usará para ENVIAR mensajes al Router. El Router ya tiene los endpoints configurados para RECIBIR en esas rutas.

## 🚀 Uso en N8N

### Configuración del Webhook en N8N

1. En N8N, configura un webhook HTTP que:
   - Escucha mensajes desde WhatsApp (Meta Cloud API o Evolution)
   - Procesa/enriquece el mensaje si es necesario
   - Hace POST al Router Centralwap

2. URL del webhook HTTP en N8N:
   ```
   POST https://tu-router-centralwap.com/webhook/router/administracion/incoming
   ```

3. Headers opcionales:
   ```
   X-Request-ID: uuid-generado-por-n8n
   X-Session-ID: session-id-si-existe
   ```

4. Body del POST:
   ```json
   {
     "telefono": "{{ $json.from }}",
     "contenido": "{{ $json.text }}",
     "whatsapp_message_id": "{{ $json.id }}",
     "timestamp": "{{ $json.timestamp }}"
   }
   ```

## ✅ Respuesta del Router

### Respuesta Exitosa (200)

```json
{
  "success": true,
  "request_id": "ingesta_router_1234567890_abc123",
  "conversacion_id": "uuid-de-conversacion",
  "accion_ejecutada": "menu_mostrado" | "derivacion" | "continuar_conversacion",
  "area_destino": "admin" | "alumnos" | "ventas" | "comunidad",
  "area_ingesta": "admin",
  "ticket_creado": true | false,
  "mensaje_enviado": true,
  "processing_time_ms": 150
}
```

### Respuesta con Error (400/500)

```json
{
  "success": false,
  "request_id": "ingesta_router_1234567890_abc123",
  "error": "Descripción del error",
  "area_ingesta": "admin",
  "processing_time_ms": 50
}
```

## 📝 Archivos Modificados/Creados

1. ✅ `src/routes/ingesta.ts` - Nueva ruta para recibir mensajes desde N8N
2. ✅ `src/index.ts` - Integración de las rutas de ingesta
3. ✅ `.env` - Webhooks de ingesta agregados
4. ✅ `INGESTA-N8N-IMPLEMENTACION.md` - Este documento

## 🔄 Coexistencia con Sistema Actual

El sistema de ingesta **complementa** el sistema actual sin interferir:

- ✅ Los mensajes directos desde WhatsApp siguen funcionando igual
- ✅ Los webhooks de Evolution siguen funcionando igual
- ✅ Los endpoints de `/api/centralwap/message` siguen funcionando igual
- ✅ Los nuevos endpoints de ingesta son adicionales

Todos los mensajes, sin importar su origen, pasan por el mismo `CentralwapRouter.procesarMensaje()`, asegurando consistencia total.

## 🎯 Casos de Uso

1. **Procesamiento Previo en N8N:**
   - N8N puede enriquecer mensajes antes de enviarlos al Router
   - N8N puede filtrar mensajes según criterios específicos
   - N8N puede normalizar formatos antes del Router

2. **Múltiples Fuentes de WhatsApp:**
   - Diferentes números de WhatsApp pueden enviar a diferentes áreas
   - N8N puede determinar el área basándose en el número que recibió el mensaje
   - Router procesa de forma unificada independientemente del origen

3. **Integración con Otros Sistemas:**
   - N8N puede recibir mensajes de múltiples fuentes
   - N8N puede agregar datos de sistemas externos (CRM, bases de datos)
   - N8N envía todo al Router de forma normalizada

---

**✅ Sistema de Ingesta desde N8N completamente implementado y listo para usar**



