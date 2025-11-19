# 🧪 Probar Flujo Completo - Router + Tickets

## 📋 Checklist Pre-Prueba

### 1. Verificar `.env.local`
Asegurate de tener estas variables configuradas:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `CLOUD_API_TOKEN`
- ✅ `CLOUD_API_PHONE_NUMBER_ID`
- ✅ `ALLOW_LOCAL_ACCESS=true`

### 2. Iniciar Servidor Local
```powershell
npm run dev
```

Deberías ver:
```
▲ Next.js 14.2.5
- Local:        http://localhost:3001
✓ Ready in XXXms
```

## 🧪 Prueba 1: Mensaje Inicial (Primera Interacción)

### Objetivo
Verificar que el router muestra el menú principal automáticamente en la primera interacción.

### Comando PowerShell
```powershell
$body = @{
    messages = @(
        @{
            from = "5491133901743"
            id = "test-inicial-$(Get-Date -Format 'yyyyMMddHHmmss')"
            timestamp = [Math]::Floor([decimal](Get-Date -UFormat %s))
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

### ✅ Logs Esperados
```
🔄 Procesando mensaje de 5491133901743: Hola...
🚀 RouterProcessor.processMessage iniciado
   - From: 5491133901743
   - Message: Hola
   - Type: text
   - Comando normalizado: "HOLA"
🔍 Buscando o creando conversación para 5491133901743
✅ Conversación encontrada/creada: [uuid] (área: PSI Principal)
💾 Guardando mensaje en conversación [uuid], remitente_tipo: user, remitente_nombre: 5491133901743...
✅ Mensaje guardado exitosamente en Supabase. ID: [uuid]
📋 Mostrando menú principal para conversación [uuid]
💾 Guardando mensaje en conversación [uuid], remitente_tipo: system, remitente_nombre: Router PSI...
✅ Mensaje guardado exitosamente en Supabase. ID: [uuid]
📤 Enviando mensaje WhatsApp a 5491133901743...
✅ Mensaje WhatsApp enviado exitosamente
✅ Menú principal mostrado exitosamente
```

### 🔍 Verificar en Supabase
1. Tabla `conversaciones`:
   - Nueva conversación con `area = 'PSI Principal'`
   - `router_estado = 'principal'` (en metadata)
   - `telefono = '5491133901743'`

2. Tabla `mensajes`:
   - 2 mensajes:
     - 1 del usuario (`remitente_tipo = 'user'`)
     - 1 del sistema (`remitente_tipo = 'system'`, contiene el menú)

## 🧪 Prueba 2: Selección de Menú Principal (Opción "2" = Alumnos)

### Objetivo
Verificar que el router muestra el submenú de Alumnos.

### Comando PowerShell
```powershell
$body = @{
    messages = @(
        @{
            from = "5491133901743"
            id = "test-menu-2-$(Get-Date -Format 'yyyyMMddHHmmss')"
            timestamp = [Math]::Floor([decimal](Get-Date -UFormat %s))
            type = "text"
            text = @{
                body = "2"
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

### ✅ Logs Esperados
```
🔄 Procesando mensaje de 5491133901743: 2...
Procesando como selección de menú principal: "2"
Opción encontrada: Alumnos (Alumnos), mostrando submenú
Guardando mensaje del sistema con submenú
💾 Guardando mensaje en conversación [uuid], remitente_tipo: system...
✅ Mensaje guardado exitosamente
📤 Enviando mensaje WhatsApp...
✅ Mensaje WhatsApp enviado exitosamente
```

### 🔍 Verificar en Supabase
1. Tabla `mensajes`:
   - Nuevo mensaje del sistema con submenú de Alumnos
   - `remitente_tipo = 'system'`
   - Contiene texto "Alumnos:"

2. Tabla `conversaciones`:
   - `router_estado = 'Alumnos'` (o en metadata)
   - `submenu_actual` puede estar actualizado

## 🧪 Prueba 3: Selección de Submenú (Opción "22" = Clases y cronograma)

### Objetivo
Verificar que el router crea un ticket y deriva la conversación.

### Comando PowerShell
```powershell
$body = @{
    messages = @(
        @{
            from = "5491133901743"
            id = "test-submenu-22-$(Get-Date -Format 'yyyyMMddHHmmss')"
            timestamp = [Math]::Floor([decimal](Get-Date -UFormat %s))
            type = "text"
            text = @{
                body = "22"
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

### ✅ Logs Esperados
```
🔄 Procesando mensaje de 5491133901743: 22...
Procesando como selección de submenú: "22" en área "Alumnos"
Opción encontrada: Alumnos - Clases y cronograma, derivando conversación [uuid]
🎫 Derivando conversación [uuid] de "PSI Principal" a "Alumnos" (Clases y cronograma)
🎫 Ticket generado: PSI-2025-000001
✅ Ticket creado exitosamente en tabla tickets: [uuid] (PSI-2025-000001)
✅ Derivación creada para tracking: [uuid]
✅ Conversación derivada exitosamente con ticket PSI-2025-000001
Enviando mensaje de derivación con ticket PSI-2025-000001
💾 Guardando mensaje en conversación [uuid], remitente_tipo: system...
📤 Enviando mensaje WhatsApp a 5491133901743...
✅ Mensaje WhatsApp enviado exitosamente
```

### 🔍 Verificar en Supabase

#### 1. Tabla `tickets`
- ✅ Nuevo ticket con:
  - `ticket_id = 'PSI-2025-000001'`
  - `conversacion_id = [uuid de la conversación]`
  - `telefono = '5491133901743'`
  - `area = 'Alumnos'`
  - `origen = 'Router Automático'`
  - `estado = 'abierto'`
  - `prioridad = 'normal'` o `'alta'`
  - `metadata` contiene:
    - `area_origen = 'PSI Principal'`
    - `area_destino = 'Alumnos'`
    - `motivo = 'Alumnos - Clases y cronograma'`
    - `contexto_completo` con historial de mensajes
    - `opciones_seleccionadas = ['2', '22']`

#### 2. Tabla `derivaciones`
- ✅ Nuevo registro con:
  - `ticket_id = 'PSI-2025-000001'`
  - `conversacion_id = [uuid]`
  - `area = 'Alumnos'`
  - `inbox_destino = 'Alumnos'`
  - `status = 'enviada'`
  - `payload` con información básica

#### 3. Tabla `conversaciones`
- ✅ Actualizada con:
  - `area = 'Alumnos'`
  - `estado = 'activa'`
  - `router_estado = 'derivada'`
  - `subetiqueta = 'Clases y cronograma'`
  - `submenu_actual = 'Clases y cronograma'`
  - `ts_ultima_derivacion = [timestamp]`
  - `ultima_derivacion = 'PSI-2025-000001'`
  - `metadata.ticket_activo = [uuid del ticket]`
  - `metadata.ticket_numero = 'PSI-2025-000001'`

#### 4. Tabla `mensajes`
- ✅ Nuevo mensaje del sistema con:
  - Contenido: "✅ Te derivamos con *Alumnos* - Clases y cronograma..."
  - Incluye número de ticket: "📋 *Número de ticket:* PSI-2025-000001"
  - Incluye tiempo estimado: "🕐 *Tiempo estimado de respuesta:* 1-2 horas"

#### 5. Tabla `audit_log`
- ✅ Nuevo evento con:
  - `actor = 'Sistema Router'`
  - `accion = 'ticket_creado'`
  - `datos` contiene información del ticket

## 📊 Verificación Completa

### En Supabase Studio
1. **Tabla `tickets`**: Debe tener 1 ticket con número PSI-2025-000001
2. **Tabla `derivaciones`**: Debe tener 1 registro referenciando el ticket
3. **Tabla `conversaciones`**: Debe tener la conversación actualizada
4. **Tabla `mensajes`**: Debe tener 4 mensajes (1 usuario + 3 sistema)
5. **Tabla `audit_log`**: Debe tener evento de creación

### En Logs del Servidor
- ✅ Todos los logs con emojis indicando éxito
- ✅ No hay errores de Supabase
- ✅ No hay errores de WhatsApp API

## ❌ Si Algo Falla

### Error: "column does not exist"
- Verificar que las tablas existan en Supabase
- Verificar que los nombres de columnas sean correctos

### Error: "WhatsApp Cloud API no configurada"
- Verificar `CLOUD_API_TOKEN` y `CLOUD_API_PHONE_NUMBER_ID` en `.env.local`

### Error: "No se pudo crear ticket"
- Verificar permisos en Supabase
- Verificar que `ticket_id` sea único (no duplicado)

### No se envía mensaje por WhatsApp
- Verificar logs de `sendWhatsAppMessage`
- Verificar que el token de WhatsApp sea válido
- Verificar formato del número de teléfono

## 🎯 Siguiente Paso

Una vez que todo funcione:
1. ✅ Probar con diferentes opciones del menú
2. ✅ Verificar que los tickets se crean correctamente
3. ✅ Implementar vista de tickets en CRM

