# 🧪 Probar Router en Local

## Configuración Necesaria

### 1. Verificar `.env.local`

Asegurate de tener estas variables en `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# WhatsApp Cloud API
CLOUD_API_BASE_URL=https://graph.facebook.com/v18.0
CLOUD_API_TOKEN=tu_token_whatsapp
CLOUD_API_PHONE_NUMBER_ID=tu_phone_number_id

# Modo desarrollo
ALLOW_LOCAL_ACCESS=true
NODE_ENV=development
```

### 2. Iniciar el servidor local

```powershell
npm run dev
```

Deberías ver:
```
▲ Next.js 14.2.5
- Local:        http://localhost:3001
✓ Ready in XXXms
```

## 🧪 Probar el Webhook

### Opción 1: Usar curl (PowerShell)

```powershell
# Mensaje de prueba simple
$body = @{
    messages = @(
        @{
            from = "5491133901743"
            id = "test-123"
            timestamp = "1763504688"
            type = "text"
            text = @{
                body = "Hola"
            }
        }
    )
    metadata = @{
        display_phone_number = "5491156090819"
        phone_number_id = "809951985523815"
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3001/api/router/whatsapp/webhook" -Method POST -Body $body -ContentType "application/json"
```

### Opción 2: Usar Postman o similar

**URL:** `http://localhost:3001/api/router/whatsapp/webhook`  
**Method:** `POST`  
**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "messages": [
    {
      "from": "5491133901743",
      "id": "test-123",
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

## 📋 Qué Revisar en los Logs

Cuando envíes el webhook, deberías ver en la terminal (donde corre `npm run dev`):

### ✅ Logs Esperados (Éxito):

```
🔄 Procesando mensaje de 5491133901743: Hola...
🚀 RouterProcessor.processMessage iniciado
   - From: 5491133901743
   - Message: Hola
   - Type: text
   - Comando normalizado: "HOLA"
🔍 Buscando o creando conversación para 5491133901743
✅ Conversación encontrada/creada: [uuid] (área: PSI Principal)
💾 Guardando mensaje en conversación [uuid], remitente: 5491133901743...
✅ Mensaje guardado exitosamente en Supabase. ID: [uuid]
📋 Mostrando menú principal para conversación [uuid]
💾 Guardando mensaje en conversación [uuid], remitente: system...
✅ Mensaje guardado exitosamente en Supabase. ID: [uuid]
📤 Enviando mensaje WhatsApp a 5491133901743...
✅ Mensaje WhatsApp enviado exitosamente
✅ Menú principal mostrado exitosamente
✅ Mensaje procesado exitosamente. Conversación: [uuid]
```

### ❌ Logs de Error Comunes:

**Error 1: Variables de entorno faltantes**
```
❌ WhatsApp Cloud API no configurada - CLOUD_API_TOKEN o CLOUD_API_PHONE_NUMBER_ID faltantes
```

**Error 2: Error en Supabase**
```
❌ Error guardando mensaje en Supabase:
   - Código: 42703
   - Mensaje: column "remitente" does not exist
```

**Error 3: Error en WhatsApp API**
```
❌ Error enviando mensaje WhatsApp (400): { "error": { "message": "Invalid phone number" } }
```

## 🔍 Diagnosticar Problemas

### Si no ves logs:
- Verificar que el servidor está corriendo (`npm run dev`)
- Verificar que la URL del webhook es correcta
- Verificar que el body del request es válido JSON

### Si ves errores de Supabase:
- Verificar que las credenciales en `.env.local` son correctas
- Verificar que la columna `remitente` existe en la tabla `mensajes`
- Verificar permisos de RLS en Supabase

### Si ves errores de WhatsApp:
- Verificar que `CLOUD_API_TOKEN` es válido
- Verificar que `CLOUD_API_PHONE_NUMBER_ID` es correcto
- Verificar que el número de teléfono está en formato correcto (solo dígitos)

## ✅ Cuando Funcione en Local

Una vez que veas los logs de éxito y el mensaje se guarde en Supabase:

1. **Verificar en Supabase:**
   - Abrir Supabase Studio
   - Verificar que hay mensajes en la tabla `mensajes`
   - Verificar que hay conversaciones en la tabla `conversaciones`

2. **Hacer commit y push:**
   ```powershell
   git add .
   git commit -m "Router funcionando correctamente en local"
   git push
   ```

3. **Subir al servidor:**
   - Conectar por SSH
   - Ejecutar `git pull` y `npm run build`
   - Reiniciar PM2

