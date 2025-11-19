# 🔍 Diagnóstico Completo: Router y CRM

## ❌ PROBLEMAS IDENTIFICADOS

### 1. **PROBLEMA CRÍTICO: Formato del Webhook de n8n**

Según la imagen, n8n envía el formato estándar de WhatsApp Cloud API:
```json
{
  "messaging_product": "whatsapp",
  "metadata": {...},
  "contacts": [...],
  "messages": [...]
}
```

Pero el código del webhook busca:
1. `body.entry` (formato webhook de Facebook) ❌ NO existe en lo que n8n envía
2. `body.messages` (formato directo) ✅ Existe
3. `body.from && body.message` (formato simple) ❌ NO existe

**El problema:** El código encuentra `body.messages`, pero el formato de `message` dentro de `messages` es el formato estándar de WhatsApp Cloud API, que tiene `message.text.body`, no `message.message`.

### 2. **PROBLEMA: Normalización del Mensaje**

La función `normalizeWhatsAppMessage` espera:
- `message.text.body` ✅ Correcto
- `message.from` ✅ Correcto
- `message.type` ✅ Correcto

Pero cuando n8n envía `{{ $json }}`, puede estar enviando el formato completo del webhook de Facebook que tiene `entry.changes.value.messages`, no directamente `messages`.

### 3. **PROBLEMA: Variables de Entorno**

El RouterProcessor usa:
```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL!
process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```

Si `SUPABASE_SERVICE_ROLE_KEY` no está definido, usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` que puede no tener permisos para INSERT/UPDATE.

### 4. **PROBLEMA: CRM no muestra conversaciones**

El CRM filtra por `area = 'PSI Principal'`, pero si el router no está creando conversaciones correctamente, no habrá nada que mostrar.

## ✅ SOLUCIONES REQUERIDAS

### 1. Corregir parseo del webhook para aceptar formato directo de n8n
### 2. Verificar que las variables de entorno estén configuradas
### 3. Agregar validación de Supabase client
### 4. Mejorar logging para identificar exactamente dónde falla

