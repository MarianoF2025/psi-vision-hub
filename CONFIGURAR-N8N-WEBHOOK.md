# Configurar n8n para enviar mensajes al Router PSI

## Flujo esperado

1. **WhatsApp Trigger** (n8n) recibe mensaje de WhatsApp
2. **IF** (n8n) filtra solo eventos donde `field == 'messages'`
3. **Set** (n8n) limpia el JSON (opcional, ver abajo)
4. **HTTP Request** (n8n) envía al endpoint del Router PSI
5. **Router PSI** procesa y guarda en Supabase
6. **CRM** muestra las conversaciones

## ⚠️ IMPORTANTE: Filtrar y Limpiar el Payload

El webhook de WhatsApp dispara tanto para `messages` como para `statuses`. El router solo acepta eventos con `messages` y no acepta la propiedad `field`.

**Ver instrucciones detalladas en:** `FIX-N8N-WEBHOOK-FILTRO.md`

## Configuración del nodo HTTP Request en n8n

### URL del endpoint
```
https://app.psivisionhub.com/api/router/whatsapp/webhook
```

### Método
```
POST
```

### Headers
```
Content-Type: application/json
```

### Body (JSON)

El endpoint acepta el formato estándar de WhatsApp Cloud API con validación Joi estricta:

#### Formato Requerido (Único formato aceptado)
```json
{
  "messaging_product": "whatsapp",
  "metadata": {
    "display_phone_number": "5491156090819",
    "phone_number_id": "809951985523815"
  },
  "messages": [
    {
      "from": "5491112345678",
      "id": "wamid.XXXXX",
      "timestamp": "1731930000",
      "type": "text",
      "text": {
        "body": "Hola, quiero información"
      }
    }
  ],
  "contacts": [
    {
      "profile": {
        "name": "Nombre Usuario",
        "wa_id": "5491112345678"
      }
    }
  ]
}
```

**Propiedades requeridas:**
- `messaging_product`: Debe ser `"whatsapp"`
- `metadata`: Objeto con `display_phone_number` y `phone_number_id`
- `messages`: Array con al menos un mensaje

**Propiedades opcionales:**
- `contacts`: Array de contactos

**Propiedades NO permitidas:**
- `field`: No está permitida en el schema
- `statuses`: No está permitida (solo se procesan `messages`)


## Ejemplo de workflow n8n

### Nodo 1: WhatsApp Trigger
- Configurado para recibir mensajes entrantes
- Output: Datos del mensaje recibido (incluye `field`, `messages`, `statuses`, etc.)

### Nodo 2: IF (Filtrar solo mensajes)
- **Condition**: `String`
- **Value 1**: `{{ $json.field }}`
- **Operation**: `Equal`
- **Value 2**: `messages`
- **Output**: Solo items donde `field == 'messages'`

### Nodo 3: Set (Limpiar JSON) - **OBLIGATORIO**

El payload que viene del trigger incluye `field: "messages"` que el router rechaza. Este nodo elimina esa propiedad.

- **Mode**: `Manual`
- **Fields to Set:**
  - **Name**: `messaging_product`
    - **Value**: `{{ $json.messaging_product }}`
  - **Name**: `metadata`
    - **Value**: `{{ $json.metadata }}`
  - **Name**: `messages`
    - **Value**: `{{ $json.messages }}`
  - **Name**: `contacts` (opcional, pero inclúyelo si está presente)
    - **Value**: `{{ $json.contacts }}`

**⚠️ IMPORTANTE:** NO incluyas `field` en el nodo Set. Esto eliminará la propiedad `field: "messages"` que causa el error "field is not allowed".

**Resultado:** El objeto tendrá solo estas propiedades (sin `field`):
```json
{
  "messaging_product": "whatsapp",
  "metadata": {...},
  "messages": [...],
  "contacts": [...]
}
```

### Nodo 4: HTTP Request
- **Method**: POST
- **URL**: `https://app.psivisionhub.com/api/router/whatsapp/wsp4` (o el endpoint correspondiente)
- **Authentication**: None
- **Body Content Type**: JSON
- **Body**: 
```json
{{ $json }}
```

Si no usaste el nodo Set, construir manualmente (NO incluyas `field`):
```json
{
  "messaging_product": "{{ $json.messaging_product }}",
  "metadata": {{ $json.metadata }},
  "messages": {{ $json.messages }},
  "contacts": {{ $json.contacts }}
}
```

**⚠️ NO incluyas `field` en el JSON manual.**

## Verificación

### 1. Probar el endpoint directamente
```bash
curl -X POST https://app.psivisionhub.com/api/router/whatsapp/wsp4 \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "metadata": {
      "display_phone_number": "5491156090819",
      "phone_number_id": "809951985523815"
    },
    "messages": [{
      "from": "5491112345678",
      "id": "wamid.TEST123",
      "timestamp": "1731930000",
      "type": "text",
      "text": {"body": "Hola, quiero información"}
    }]
  }'
```

### 2. Verificar logs en el servidor
```bash
pm2 logs router-psi --lines 50
```

Deberías ver:
- `✅ Payload válido`
- `🚀 Procesando mensaje...`
- `✅ Conversación creada/actualizada`
- `✅ Menú enviado`

### 3. Verificar en Supabase
- Abrir el CRM: `https://app.psivisionhub.com/crm-com`
- Seleccionar inbox "PSI Principal"
- La conversación debería aparecer

## Troubleshooting

### Error: "Body vacío"
- Verificar que el nodo HTTP Request tenga `Content-Type: application/json`
- Verificar que el body no esté vacío
- Verificar que n8n esté enviando el body correctamente

### Error: "JSON inválido"
- Verificar que el JSON esté bien formado
- Usar un validador JSON online
- Verificar que no haya caracteres especiales sin escapar

### Error: "No messages to process"
- El webhook se recibió correctamente pero no había mensajes para procesar
- Verificar que el formato del body incluya un array `messages` con al menos un mensaje
- Verificar que los mensajes no sean solo "status" (delivered, read, etc.)

### Error: "messages" is required
- **Causa:** Se está enviando un evento de `statuses` que no tiene `messages`
- **Solución:** Agregar nodo IF para filtrar solo eventos donde `field == 'messages'`
- Ver: `FIX-N8N-WEBHOOK-FILTRO.md`

### Error: "field" is not allowed
- **Causa:** El payload incluye la propiedad `field` que el schema no acepta
- **Solución:** Usar nodo Set para construir un objeto limpio sin `field`
- Ver: `FIX-N8N-WEBHOOK-FILTRO.md`

### Mensaje no aparece en el CRM
- Verificar logs del servidor para ver si hubo errores al procesar
- Verificar que el contacto/conversación se creó en Supabase
- Ejecutar el endpoint de diagnóstico: `curl https://app.psivisionhub.com/api/router/debug`

