# Configurar n8n para enviar mensajes al Router PSI

## Flujo esperado

1. **WhatsApp Trigger** (n8n) recibe mensaje de WhatsApp
2. **HTTP Request** (n8n) envía al endpoint `/api/router/whatsapp/webhook`
3. **Router PSI** procesa y guarda en Supabase
4. **CRM** muestra las conversaciones

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

El endpoint acepta **3 formatos diferentes**:

#### Formato 1: Array de mensajes (Recomendado para n8n)
```json
{
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
  "metadata": {
    "display_phone_number": "5491156090819",
    "phone_number_id": "809951985523815"
  }
}
```

#### Formato 2: Mensaje único
```json
{
  "from": "5491112345678",
  "id": "wamid.XXXXX",
  "timestamp": "1731930000",
  "type": "text",
  "text": {
    "body": "Hola, quiero información"
  },
  "metadata": {
    "display_phone_number": "5491156090819",
    "phone_number_id": "809951985523815"
  }
}
```

#### Formato 3: Estándar WhatsApp Cloud API
```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
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
            ]
          }
        }
      ]
    }
  ]
}
```

## Ejemplo de workflow n8n

### Nodo 1: WhatsApp Trigger
- Configurado para recibir mensajes entrantes
- Output: Datos del mensaje recibido

### Nodo 2: HTTP Request
- **Method**: POST
- **URL**: `https://app.psivisionhub.com/api/router/whatsapp/webhook`
- **Authentication**: None (o Basic si se requiere)
- **Body Content Type**: JSON
- **Body**: 
```json
{
  "messages": [
    {
      "from": "{{ $json.from }}",
      "id": "{{ $json.id }}",
      "timestamp": "{{ $json.timestamp }}",
      "type": "{{ $json.type }}",
      "text": {
        "body": "{{ $json.text.body }}"
      }
    }
  ],
  "metadata": {
    "display_phone_number": "{{ $env.WHATSAPP_PHONE_NUMBER }}",
    "phone_number_id": "{{ $env.WHATSAPP_PHONE_NUMBER_ID }}"
  }
}
```

## Verificación

### 1. Probar el endpoint directamente
```bash
curl -X POST https://app.psivisionhub.com/api/router/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "from": "5491112345678",
      "id": "wamid.TEST123",
      "timestamp": "1731930000",
      "type": "text",
      "text": {"body": "Hola, quiero información"}
    }],
    "metadata": {
      "display_phone_number": "5491156090819",
      "phone_number_id": "809951985523815"
    }
  }'
```

### 2. Verificar logs en el servidor
```bash
pm2 logs psi-vision-hub --lines 50
```

Deberías ver:
- `Webhook recibido: {...}`
- `Procesando mensaje de 5491112345678: Hola, quiero información...`
- `Mensaje procesado exitosamente. Conversación: ...`

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

### Mensaje no aparece en el CRM
- Verificar logs del servidor para ver si hubo errores al procesar
- Verificar que el contacto/conversación se creó en Supabase
- Ejecutar el endpoint de diagnóstico: `curl https://app.psivisionhub.com/api/router/debug`

