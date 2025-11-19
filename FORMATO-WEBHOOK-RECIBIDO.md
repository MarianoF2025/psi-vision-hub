# 📥 Formato de Información que Llega al Webhook

## 🔗 Endpoint
`https://app.psivisionhub.com/api/router/whatsapp/webhook`

## 📋 Formato que Envía n8n

Según la configuración de n8n que mostraste, envía el formato **estándar de WhatsApp Cloud API**:

```json
{
  "messaging_product": "whatsapp",
  "metadata": {
    "display_phone_number": "5491156090819",
    "phone_number_id": "809951985523815"
  },
  "contacts": [
    {
      "profile": {
        "name": "Mariano",
        "wa_id": "5491133901743"
      }
    }
  ],
  "messages": [
    {
      "from": "5491133901743",
      "id": "wamid.HBgNNTQ5MTEzMzkwMTc0MxUCABIYIEFDQjIzQUUzNEE5RTU4QzQ4MjQzNEMwMTI4QTAYQOREAA==",
      "timestamp": "1763512198",
      "text": {
        "body": "Hola",
        "type": "text"
      },
      "type": "text"
    }
  ]
}
```

## 🔍 Cómo el Webhook Procesa Esta Información

### 1. **Recepción del Request**
```typescript
// Headers recibidos
Content-Type: application/json
Content-Length: [tamaño del body]

// Body recibido como texto
bodyText = await request.text();
```

### 2. **Parseo del JSON**
```typescript
body = JSON.parse(bodyText);
// body contiene el objeto completo mostrado arriba
```

### 3. **Detección del Formato**

El código detecta **Formato 2** porque:
- ✅ `body.messages` existe y es un array
- ✅ `body.metadata` existe

```typescript
// Formato 2: Directo desde n8n (messages en root)
else if (body.messages && Array.isArray(body.messages)) {
  console.log('🔍 Detectado formato 2: Directo desde n8n (messages en root)');
  metadata = body.metadata || {};
  messagesToProcess = body.messages;
}
```

### 4. **Extracción de Datos**

**Metadata extraída:**
```javascript
metadata = {
  display_phone_number: "5491156090819",
  phone_number_id: "809951985523815"
}
```

**Mensajes a procesar:**
```javascript
messagesToProcess = [
  {
    from: "5491133901743",
    id: "wamid.HBgN...",
    timestamp: "1763512198",
    text: {
      body: "Hola",
      type: "text"
    },
    type: "text"
  }
]
```

### 5. **Normalización del Mensaje**

La función `normalizeWhatsAppMessage()` convierte el formato de WhatsApp Cloud API a `WhatsAppMessage`:

```typescript
function normalizeWhatsAppMessage(message, metadata) {
  return {
    from: message.from,                    // "5491133901743"
    to: metadata.display_phone_number,     // "5491156090819"
    message: message.text.body,            // "Hola"
    messageId: message.id,                  // "wamid.HBgN..."
    timestamp: new Date(parseInt(message.timestamp, 10) * 1000).toISOString(),
    type: message.type,                    // "text"
    media: extractMedia(message),           // undefined para texto
    attribution: parseAttributionFromReferral(...),
    referral: message.referral,
    raw: message                            // Mensaje original completo
  };
}
```

### 6. **Procesamiento**

El mensaje normalizado se pasa a `RouterProcessor.processMessage()`:

```typescript
const result = await processor.processMessage(normalized);
```

## 📊 Estructura Completa de Datos Recibidos

### **Request Headers:**
```
Content-Type: application/json
Content-Length: [número]
[otros headers de n8n]
```

### **Request Body (JSON):**
```json
{
  "messaging_product": "whatsapp",
  "metadata": {
    "display_phone_number": "5491156090819",
    "phone_number_id": "809951985523815"
  },
  "contacts": [
    {
      "profile": {
        "name": "Mariano",
        "wa_id": "5491133901743"
      }
    }
  ],
  "messages": [
    {
      "from": "5491133901743",
      "id": "wamid.HBgN...",
      "timestamp": "1763512198",
      "text": {
        "body": "Hola",
        "type": "text"
      },
      "type": "text"
    }
  ]
}
```

## 🔄 Flujo Completo

1. **n8n recibe webhook de WhatsApp** → Formato estándar WhatsApp Cloud API
2. **n8n envía POST a `/api/router/whatsapp/webhook`** → Con `{{ $json }}` (todo el payload)
3. **Webhook recibe el request** → Parsea JSON
4. **Detecta Formato 2** → `body.messages` existe
5. **Extrae metadata y messages** → Prepara para procesamiento
6. **Normaliza cada mensaje** → Convierte a formato interno
7. **Procesa con RouterProcessor** → Crea/actualiza contacto, conversación, mensaje
8. **Responde 200 OK** → Con `{ success: true, processed: 1 }`

## 🐛 Posibles Problemas

1. **Si `body.messages` está vacío** → No se procesa nada, retorna `{ success: true, message: 'No messages to process' }`
2. **Si `message.from` no existe** → Se ignora el mensaje
3. **Si `message.text.body` no existe** → Se usa `'[Contenido]'` como fallback
4. **Si hay error en `processMessage()`** → Se registra el error pero se continúa con otros mensajes

## 📝 Logs que Deberías Ver

Con el logging mejorado, deberías ver en la terminal:

```
📥 Webhook recibido (formato completo): { ... }
🔍 Detectado formato 2: Directo desde n8n (messages en root)
📊 Encontrados 1 mensajes para procesar
📋 Metadata: { display_phone_number: "...", phone_number_id: "..." }
📨 Mensaje raw recibido: { from: "...", text: { body: "..." }, ... }
🔄 Mensaje normalizado: { from: "...", message: "...", type: "text", ... }
🚀 RouterProcessor.processMessage iniciado
   - From: 5491133901743
   - Message: Hola
   - Type: text
...
```

