# 🔍 Diagnóstico: Por qué el Menú Dejó de Aparecer

## ❌ Problema Identificado

### Error Principal
```
Error: new row for relation "mensajes" violates check constraint "mensajes_tipo_check"
```

### Causa Raíz
1. **Constraint de Supabase**: La tabla `mensajes` tiene un constraint `mensajes_tipo_check` que limita los valores del campo `tipo`
2. **Valores esperados**: Probablemente acepta: `'text'`, `'image'`, `'audio'`, `'video'`, `'document'`, etc. (valores de WhatsApp Cloud API en inglés)
3. **Problema**: El código NO estaba pasando el campo `tipo` explícitamente, y el default de la tabla es `'texto'` (español), que NO es válido según el constraint
4. **Consecuencia**: Cuando se intenta guardar un mensaje, falla el insert → el flujo se interrumpe → el menú no se muestra

## 🔧 Solución Implementada

### 1. Agregar campo `tipo` al insert
```typescript
// ANTES (INCORRECTO):
.insert({
  conversacion_id: conversationId,
  mensaje,
  remitente_tipo,
  remitente_nombre,
  timestamp: new Date().toISOString(),
  metadata,
})

// DESPUÉS (CORRECTO):
.insert({
  conversacion_id: conversationId,
  mensaje,
  tipo: tipo, // Agregado: mapea desde metadata.type o usa 'text'
  remitente_tipo,
  remitente_nombre,
  timestamp: new Date().toISOString(),
  metadata,
})
```

### 2. Mapear tipo correctamente
```typescript
// Mapear tipo desde metadata (WhatsApp Cloud API)
const tipoFromMetadata = metadata?.type || 'text';
// Asegurar que el tipo sea válido (si viene 'texto' del default, cambiarlo a 'text')
const tipo = tipoFromMetadata === 'texto' ? 'text' : tipoFromMetadata;
```

### 3. Pasar tipo en todas las llamadas
- Mensajes del sistema: `{ type: 'text' }`
- Mensajes del usuario: desde `metadata.type` del webhook
- Mensajes de derivación: `{ type: 'text' }`

## 🔄 Flujo de Activación del Router

### Endpoint: `/api/router/whatsapp/webhook`
**Ruta:** `app/api/router/whatsapp/webhook/route.ts`

### Cómo se Activa:
1. **n8n recibe webhook de WhatsApp** → Transforma formato
2. **n8n envía POST a:** `https://app.psivisionhub.com/api/router/whatsapp/webhook`
3. **Router recibe el webhook** → Parsea JSON
4. **Normaliza mensaje** → Crea `WhatsAppMessage`
5. **Llama a `processor.processMessage()`** → Procesa el mensaje

### Formato Esperado desde n8n:
```json
{
  "messages": [
    {
      "from": "5491133901743",
      "id": "wamid.xxx",
      "timestamp": "1763504688",
      "type": "text",
      "text": {
        "body": "Hola"
      }
    }
  ],
  "metadata": {
    "display_phone_number": "5491156090819",
    "phone_number_id": "809951985523815"
  }
}
```

## 📋 Verificación del Endpoint

### URL Correcta:
- **Producción:** `https://app.psivisionhub.com/api/router/whatsapp/webhook`
- **Local:** `http://localhost:3001/api/router/whatsapp/webhook`

### Configuración en n8n:
- **Método:** POST
- **URL:** `https://app.psivisionhub.com/api/router/whatsapp/webhook`
- **Headers:** `Content-Type: application/json`
- **Body:** `{{ $json }}` (todo el payload de WhatsApp)

## ✅ Verificación Post-Fix

Después de corregir el código:

1. **Reiniciar servidor local:**
   ```powershell
   # Detener con Ctrl+C
   npm run dev
   ```

2. **Probar webhook:**
   - Debería guardar mensajes correctamente
   - Debería mostrar el menú automáticamente
   - No debería haber errores de constraint

3. **Verificar logs:**
   - ✅ `Mensaje guardado exitosamente en Supabase`
   - ✅ `Menú principal mostrado exitosamente`
   - ❌ NO debería aparecer: `violates check constraint "mensajes_tipo_check"`

## 🎯 Próximos Pasos

1. ✅ Corregir código (hecho)
2. ⏳ Reiniciar servidor
3. ⏳ Probar flujo completo
4. ⏳ Verificar que el menú aparece

