# 🔌 API REFERENCE - PSI VISION HUB

**Versión:** 1.0  
**Fecha:** Enero 2026  
**Base URL CRM:** `http://localhost:3001`  
**Base URL Router:** `http://localhost:3002`  
**Base URL Automations:** `http://localhost:3003`  
**Webhooks n8n:** `https://webhookn8n.psivisionhub.com`

---

## ÍNDICE

1. [CRM API Routes](#1-crm-api-routes)
2. [Router API](#2-router-api)
3. [Automations API](#3-automations-api)
4. [Webhooks n8n](#4-webhooks-n8n)
5. [WhatsApp Cloud API](#5-whatsapp-cloud-api)
6. [Evolution API](#6-evolution-api)
7. [Supabase REST API](#7-supabase-rest-api)
8. [Códigos de Error](#8-códigos-de-error)

---

## 1. CRM API ROUTES

### POST /api/mensajes/enviar

Envía mensajes a WhatsApp vía n8n.

**Request:**
```json
{
  "telefono": "+5491130643668",
  "mensaje": "Hola!",
  "conversacion_id": "uuid",
  "linea_origen": "wsp4",
  "inbox_fijo": "ventas",
  "desconectado_wsp4": false,
  "respuesta_a": "wamid.xxx",
  "media_url": "https://...",
  "media_type": "image"
}
```

**Lógica de selección webhook:**
```
Si desconectado_wsp4 && inbox_fijo → usar webhook de inbox_fijo
Si no → usar webhook de linea_origen
```

**Response:**
```json
{
  "success": true,
  "mensaje_id": "uuid"
}
```

---

### POST /api/mensajes/reaccion

Envía reacción (emoji) a un mensaje.

**Request:**
```json
{
  "mensaje_id": "uuid",
  "emoji": "👍",
  "telefono": "+5491130643668"
}
```

---

### POST /api/audio/convert

Convierte audio M4A a OGG (formato WhatsApp).

**Request:** `multipart/form-data`
- `file`: Archivo M4A
- `conversacion_id`: UUID

**Response:**
```json
{
  "url": "https://...supabase.co/storage/v1/object/public/media/audios/xxx.ogg"
}
```

---

### POST /api/link-preview

Obtiene preview de un enlace.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "title": "Título",
  "description": "Descripción",
  "image": "https://..."
}
```

---

### GET/POST /api/automatizaciones

Proxy a PSI Automations (:3003).

**Uso:**
```
GET /api/automatizaciones?path=cursos
→ GET http://localhost:3003/api/cursos

POST /api/automatizaciones?path=cursos
→ POST http://localhost:3003/api/cursos
```

---

## 2. ROUTER API

### GET /health

Health check del Router.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-03T10:00:00.000Z",
  "supabase": "connected"
}
```

---

### POST /webhook/whatsapp/wsp4

Recibe mensajes de WhatsApp Cloud API (línea WSP4).

**Payload Cloud API:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "phone_number_id": "809951985523815"
        },
        "messages": [{
          "from": "5491130643668",
          "id": "wamid.xxx",
          "timestamp": "1765402901",
          "type": "text",
          "text": { "body": "Hola!" }
        }],
        "contacts": [{
          "profile": { "name": "Juan" }
        }]
      }
    }]
  }]
}
```

---

### POST /webhook/whatsapp/ventas

Recibe mensajes CTWA de Meta Ads (línea Ventas).

---

### POST /webhook/evolution/administracion

Recibe mensajes de Evolution API (línea Admin).

**Payload Evolution API:**
```json
{
  "event": "messages.upsert",
  "instance": "EME Automations",
  "data": {
    "key": {
      "remoteJid": "5491130643668@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0EBA566BB37CC1B1748"
    },
    "pushName": "Juan",
    "message": {
      "conversation": "Hola!"
    },
    "messageTimestamp": 1765402901
  },
  "sender": "5491130643668@s.whatsapp.net"
}
```

**⚠️ Extracción de teléfono (Evolution):**
1. remoteJidAlt @s.whatsapp.net
2. sender @s.whatsapp.net
3. remoteJid @s.whatsapp.net (último recurso)
4. NUNCA usar @lid

---

### POST /webhook/evolution/alumnos

Recibe mensajes Evolution API (línea Alumnos).

---

### POST /webhook/evolution/comunidad

Recibe mensajes Evolution API (línea Comunidad).

---

## 3. AUTOMATIONS API

### GET /health
```json
{ "status": "ok", "service": "psi-automations" }
```

---

### Cursos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/cursos | Listar cursos |
| GET | /api/cursos/:id | Obtener curso |
| GET | /api/cursos/:id/completo | Curso con opciones |
| GET | /api/cursos/codigo/:codigo | Buscar por código |
| POST | /api/cursos | Crear curso |
| PUT | /api/cursos/:id | Actualizar |
| DELETE | /api/cursos/:id | Eliminar |
| PATCH | /api/cursos/:id/toggle | Activar/desactivar |

---

### Opciones de Menú

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/cursos/:cursoId/opciones | Listar opciones |
| POST | /api/cursos/:cursoId/opciones | Crear opción |
| PUT | /api/cursos/:cursoId/opciones/reordenar | Reordenar |
| PUT | /api/opciones/:id | Actualizar |
| DELETE | /api/opciones/:id | Eliminar |
| PATCH | /api/opciones/:id/toggle | Activar/desactivar |

**Body crear opción:**
```json
{
  "orden": 1,
  "emoji": "💰",
  "titulo": "Ver precio",
  "tipo": "info",
  "campo_info": "info_precio",
  "mostrar_menu_despues": true
}
```

---

### Anuncios (CTWA)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/anuncios | Listar |
| GET | /api/anuncios/:id | Obtener |
| GET | /api/anuncios/ad/:adId | Buscar por ad_id |
| POST | /api/anuncios | Crear |
| PUT | /api/anuncios/:id | Actualizar |
| DELETE | /api/anuncios/:id | Eliminar |
| PATCH | /api/anuncios/:id/toggle | Activar/desactivar |

---

### Menú Interactivo

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/menu/enviar | Enviar menú CTWA |
| POST | /api/menu/directo | Enviar menú entrada directa |
| POST | /api/menu/procesar | Procesar selección |
| POST | /api/menu/listar-tipo | Listar cursos por tipo |
| GET | /api/menu/sesion/:telefono | Obtener sesión |
| POST | /api/menu/sesion/:telefono/finalizar | Finalizar sesión |

**POST /api/menu/enviar:**
```json
{
  "telefono": "+5491130643668",
  "ad_id": "123456789",
  "nombre_contacto": "Juan"
}
```

**POST /api/menu/procesar:**
```json
{
  "telefono": "+5491130643668",
  "seleccion_id": "opcion_precio",
  "seleccion_titulo": "Ver precio"
}
```

---

### Estadísticas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/stats/dashboard | Dashboard general |
| GET | /api/stats/cursos | CTR por curso |
| GET | /api/stats/cursos/:cursoId/opciones | CTR por opción |
| GET | /api/stats/cursos/:cursoId/detalle | Detalle completo |
| GET | /api/stats/automatizaciones | Stats anuncios |
| GET | /api/stats/interacciones | Interacciones recientes |

---

## 4. WEBHOOKS N8N

**Base URL:** `https://webhookn8n.psivisionhub.com`

### Ingesta

| Línea | Webhook |
|-------|---------|
| Ventas | /webhook/ventas/ingesta |
| Admin | /webhook/router/administracion/incoming |
| Alumnos | /webhook/evolution/alumnos/incoming |
| Comunidad | /webhook/evolution/comunidad/incoming |

### Envío

| Línea | Webhook |
|-------|---------|
| CRM General | /webhook/crm/enviar_mensaje |
| WSP4 | /webhook/wsp4/enviar |
| Ventas | /webhook/ventas/enviar |
| Admin | /webhook/admin/enviar |
| Alumnos | /webhook/alumnos/enviar |
| Comunidad | /webhook/comunidad/enviar |

### Derivación

| Área | Webhook |
|------|---------|
| Admin | /webhook/derivacion/administracion |
| Alumnos | /webhook/derivacion/alumnos |
| Ventas | /webhook/derivacion/ventas |
| Comunidad | /webhook/derivacion/comunidad |

### Remarketing

| Función | Webhook |
|---------|---------|
| Enviar campaña | /webhook/remarketing/enviar |

### Grupos

| Función | Webhook |
|---------|---------|
| Sincronizar | /webhook/grupos/sync |
| Enviar | /webhook/grupos/enviar |

---

## 5. WHATSAPP CLOUD API

**Base URL:** `https://graph.facebook.com/v18.0`

### Enviar texto
```bash
POST /{phone_number_id}/messages
Authorization: Bearer {ACCESS_TOKEN}

{
  "messaging_product": "whatsapp",
  "to": "5491130643668",
  "type": "text",
  "text": { "body": "Hola!" }
}
```

### Enviar menú interactivo (lista)
```json
{
  "messaging_product": "whatsapp",
  "to": "5491130643668",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": { "type": "text", "text": "Bienvenido" },
    "body": { "text": "¿En qué podemos ayudarte?" },
    "footer": { "text": "PSI Asociación" },
    "action": {
      "button": "Ver opciones",
      "sections": [{
        "title": "Áreas",
        "rows": [
          { "id": "admin", "title": "Administración", "description": "Pagos y facturas" },
          { "id": "alumnos", "title": "Alumnos", "description": "Soporte académico" }
        ]
      }]
    }
  }
}
```

### Enviar imagen
```json
{
  "messaging_product": "whatsapp",
  "to": "5491130643668",
  "type": "image",
  "image": {
    "link": "https://example.com/image.jpg",
    "caption": "Descripción"
  }
}
```

### Enviar reacción
```json
{
  "messaging_product": "whatsapp",
  "to": "5491130643668",
  "type": "reaction",
  "reaction": {
    "message_id": "wamid.xxx",
    "emoji": "👍"
  }
}
```

---

## 6. EVOLUTION API

**Base URL:** `https://evolution.psivisionhub.com`

### Enviar texto
```bash
POST /message/sendText/{instance}
apikey: {API_KEY}

{
  "number": "5491130643668",
  "text": "Hola!"
}
```

### Enviar media
```bash
POST /message/sendMedia/{instance}

{
  "number": "5491130643668",
  "mediatype": "image",
  "media": "https://example.com/image.jpg",
  "caption": "Descripción"
}
```

### Obtener grupos
```bash
GET /group/fetchAllGroups/{instance}
```

---

## 7. SUPABASE REST API

**Base URL:** `https://rbtczzjlvnymylkvcwdv.supabase.co/rest/v1`

### Headers requeridos
```
apikey: {SUPABASE_ANON_KEY}
Authorization: Bearer {SUPABASE_ANON_KEY}
Content-Type: application/json
```

### UPSERT contacto
```bash
POST /contactos
Prefer: resolution=merge-duplicates

{
  "telefono": "+5491130643668",
  "nombre": "Juan"
}
```

### Obtener conversaciones
```bash
GET /conversaciones?linea_origen=eq.wsp4&estado=eq.abierta&order=ts_ultimo_mensaje.desc
```

### Actualizar conversación
```bash
PATCH /conversaciones?id=eq.{uuid}

{
  "area": "ventas",
  "estado": "derivada"
}
```

---

## 8. CÓDIGOS DE ERROR

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Server Error |

### Errores específicos

| Error | Descripción |
|-------|-------------|
| INVALID_PHONE | Teléfono no E.164 |
| CONVERSATION_NOT_FOUND | Conversación no existe |
| WINDOW_EXPIRED | Ventana 24h expirada |
| WEBHOOK_TIMEOUT | n8n no responde |
| EVOLUTION_OFFLINE | Instancia desconectada |

---

**Documento generado:** Enero 2026
