# 🔧 Fix: Filtrar y Limpiar Payload en n8n

## 📋 Problema Identificado

El router PSI está recibiendo payloads inválidos desde n8n:

1. **Error: "messages" is required** - Se están enviando eventos de `statuses` que no tienen la propiedad `messages`
2. **Error: "field" is not allowed** - El payload incluye la propiedad `field: "messages"` que el schema Joi no acepta

### Ejemplo del Payload Actual (con error)

El nodo HTTP de n8n está enviando:
```json
{
  "messaging_product": "whatsapp",
  "metadata": {...},
  "contacts": [...],
  "messages": [...],
  "field": "messages"  // ❌ Esta propiedad causa el error
}
```

El schema Joi del router **NO acepta** la propiedad `field`, por lo que rechaza el payload.

## ✅ Solución: Configurar n8n

### Paso 1: Agregar Nodo IF para Filtrar Eventos

El webhook de WhatsApp dispara tanto para `messages` como para `statuses`. Necesitamos filtrar solo los eventos de mensajes.

**Configuración del nodo IF:**

1. **Agregar nodo "IF"** después del trigger de WhatsApp
2. **Condición:**
   - **Condition**: `String`
   - **Value 1**: `{{ $json.field }}`
   - **Operation**: `Equal`
   - **Value 2**: `messages`

**Resultado:** Solo los items donde `field == 'messages'` pasarán al siguiente nodo.

### Paso 2: Limpiar el JSON antes de Enviar

El nodo HTTP Request debe enviar únicamente las propiedades que el router espera:

```json
{
  "messaging_product": "...",
  "metadata": {...},
  "messages": [...]
}
```

#### Opción A: Usar Nodo Set (Recomendado)

1. **Agregar nodo "Set"** después del nodo IF
2. **Mode**: `Manual`
3. **Fields to Set:**
   - **Name**: `messaging_product`
     - **Value**: `{{ $json.messaging_product }}`
   - **Name**: `metadata`
     - **Value**: `{{ $json.metadata }}`
   - **Name**: `messages`
     - **Value**: `{{ $json.messages }}`
   - **Name**: `contacts` (opcional, pero si está presente en el payload, inclúyelo)
     - **Value**: `{{ $json.contacts }}`

**IMPORTANTE:** NO incluyas `field` en el nodo Set. Esto eliminará la propiedad `field: "messages"` que causa el error.

**Resultado:** El objeto creado tendrá solo estas propiedades (sin `field`):
```json
{
  "messaging_product": "whatsapp",
  "metadata": {...},
  "messages": [...],
  "contacts": [...]  // opcional
}
```

#### Opción B: Construir JSON Manualmente en HTTP Request

En el nodo HTTP Request, en lugar de enviar `{{ $json }}`, usar:

```json
{
  "messaging_product": "{{ $json.messaging_product }}",
  "metadata": {{ $json.metadata }},
  "messages": {{ $json.messages }},
  "contacts": {{ $json.contacts }}
}
```

**Nota:** 
- Asegúrate de que `metadata`, `messages` y `contacts` se pasen como objetos/arrays, no como strings
- **NO incluyas** `field` en el JSON
- Si `contacts` no existe, puedes omitirlo o usar `{{ $json.contacts || [] }}`

### Paso 3: Configurar HTTP Request

**URL:**
```
https://app.psivisionhub.com/api/router/whatsapp/wsp4
```
(O el endpoint correspondiente según el área)

**Method:** `POST`

**Headers:**
- `Content-Type`: `application/json`

**Body:**
- Si usaste el nodo Set: `{{ $json }}`
- Si construiste manualmente: El JSON del Paso 2, Opción B

## 📊 Flujo Completo en n8n

```
WhatsApp Trigger
    ↓
IF (field == 'messages')
    ↓
Set (limpiar JSON)
    ↓
HTTP Request → Router PSI
```

## 🧪 Prueba

1. **Ejecutar el workflow** con un mensaje de prueba
2. **Verificar logs del router:**
   ```bash
   pm2 logs router-psi --lines 50
   ```
3. **Deberías ver:**
   - `✅ Payload válido`
   - `🚀 Procesando mensaje...`
   - `✅ Conversación creada/actualizada`
   - `✅ Menú enviado`

4. **Respuesta esperada del router:**
   ```json
   {
     "success": true,
     "result": {
       "conversacion_id": "...",
       "mensaje_id": "..."
     }
   }
   ```

## 🐛 Troubleshooting

### Error: "messages" is required
- **Causa:** El nodo IF no está filtrando correctamente
- **Solución:** Verificar que la condición sea `{{ $json.field }}` igual a `messages`

### Error: "field" is not allowed
- **Causa:** El JSON aún incluye la propiedad `field`
- **Solución:** Asegúrate de usar el nodo Set para construir un objeto limpio

### Error: "metadata" is required
- **Causa:** El payload no incluye `metadata`
- **Solución:** Verificar que el trigger de WhatsApp esté enviando `metadata` en el payload

## 📝 Notas Adicionales

- Los eventos de `statuses` (delivered, read, etc.) pueden ignorarse o manejarse por separado
- El router solo procesa eventos que incluyen `messages`
- Si necesitas procesar `statuses` en el futuro, habría que ampliar el schema Joi del router

