# Flujo Completo de Mensajes: WhatsApp → CRM

## 📋 Resumen del Flujo

```
WhatsApp → n8n → Router PSI → Supabase → CRM
```

## 🗺️ Diagrama del Flujo

```
┌─────────────┐
│  WhatsApp   │ Usuario envía mensaje
│  Cloud API  │
└──────┬──────┘
       │ Webhook (formato estándar)
       ▼
┌─────────────┐
│     n8n     │ Recibe webhook
│   Trigger   │ Transforma formato
└──────┬──────┘
       │ HTTP POST
       │ /api/router/whatsapp/webhook
       ▼
┌─────────────────────┐
│   Router PSI        │
│  (Next.js API)      │
│  - Parsea JSON      │
│  - Normaliza msg    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  RouterProcessor    │
│  - Busca/crea conv   │
│  - Guarda mensaje    │
│  - Procesa menú     │
└──────┬──────────────┘
       │ INSERT/UPDATE
       ▼
┌─────────────┐
│  Supabase   │
│  - contactos       │
│  - conversaciones  │
│  - mensajes        │
└──────┬──────┘
       │ SELECT (tiempo real)
       ▼
┌─────────────┐
│     CRM     │
│  - Lista convs     │
│  - Chat panel      │
│  - Tiempo real     │
└─────────────┘
```

## 🔄 Paso a Paso

### 1. **WhatsApp recibe mensaje** 📱
- Usuario envía mensaje a WhatsApp Business
- WhatsApp Cloud API recibe el mensaje

### 2. **WhatsApp envía webhook a n8n** 🔔
- WhatsApp Cloud API envía webhook al trigger de n8n
- Formato estándar WhatsApp Cloud API:
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "metadata": {
          "display_phone_number": "5491156090819",
          "phone_number_id": "809951985523815"
        },
        "messages": [{
          "from": "5491112345678",
          "id": "wamid.XXXXX",
          "timestamp": "1731930000",
          "type": "text",
          "text": { "body": "Hola" }
        }]
      }
    }]
  }]
}
```

### 3. **n8n procesa y reenvía** ⚙️
- **Nodo WhatsApp Trigger**: Recibe el webhook de WhatsApp
- **Nodo HTTP Request**: Reenvía al Router PSI
  - URL: `https://app.psivisionhub.com/api/router/whatsapp/webhook`
  - Method: `POST`
  - Headers: `Content-Type: application/json`
  - Body: Transforma a formato simplificado:
```json
{
  "messages": [{
    "from": "5491112345678",
    "id": "wamid.XXXXX",
    "timestamp": "1731930000",
    "type": "text",
    "text": { "body": "Hola" }
  }],
  "metadata": {
    "display_phone_number": "5491156090819",
    "phone_number_id": "809951985523815"
  }
}
```

### 4. **Router PSI recibe webhook** 🛣️
**Archivo**: `app/api/router/whatsapp/webhook/route.ts`

**Proceso**:
1. Lee el body del request
2. Parsea el JSON
3. Detecta el formato (3 formatos soportados)
4. Normaliza el mensaje
5. Crea instancia de `RouterProcessor`
6. Llama a `processor.processMessage()`

**Logs esperados**:
```
Webhook recibido - Content-Type: application/json, Content-Length: XXX
Body recibido (XXX caracteres): {...}
Procesando mensaje de 5491112345678: Hola...
```

### 5. **RouterProcessor procesa mensaje** 🔧
**Archivo**: `lib/router/processor.ts`

**Proceso** (`processMessage()`):

#### 5.1. Buscar o crear conversación
- **Método**: `findOrCreateConversation(phone)`
- **Pasos**:
  1. Busca conversación existente por teléfono
  2. Si no existe:
     - Busca contacto existente
     - Si no existe contacto, lo crea en tabla `contactos`
     - Crea nueva conversación en tabla `conversaciones` con:
       - `contacto_id`: ID del contacto
       - `telefono`: Número de teléfono
       - `area`: `'PSI Principal'` (hardcoded)
       - `estado`: `'nueva'`
       - `ts_ultimo_mensaje`: Timestamp actual

**Logs esperados**:
```
Conversación existente encontrada: <id>
O
Creando nuevo contacto para 5491112345678
Contacto creado: <id>
Creando nueva conversación para contacto <id>
Conversación creada: <id>
```

#### 5.2. Verificar anti-loop
- **Método**: `getLastInteraction()` y `isWithinAntiLoopWindow()`
- Ignora mensajes si hubo interacción en los últimos 15 minutos

#### 5.3. Procesar media (si aplica)
- **Método**: `processMedia()`
- Descarga media de WhatsApp
- Sube a Supabase Storage
- Genera thumbnails para imágenes
- Transcribe audio

#### 5.4. Guardar mensaje
- **Método**: `saveMessage()`
- Inserta en tabla `mensajes`:
  - `conversacion_id`: ID de la conversación
  - `mensaje`: Texto del mensaje
  - `remitente`: Teléfono del remitente
  - `timestamp`: Timestamp actual
  - `metadata`: Metadatos (tipo, media, links, attribution)
- Actualiza `conversaciones.ts_ultimo_mensaje`

#### 5.5. Notificar ingesta
- **Método**: `notifyIngestionWebhook()`
- Envía webhook a n8n para ingesta (opcional)
- Usa `N8N_WEBHOOK_INGESTA_ROUTER_WSP4` o específico por área

#### 5.6. Procesar comando/menú
- Si el mensaje es "MENU" o "VOLVER": muestra menú principal
- Si está en menú principal: procesa selección
- Si está en submenú: procesa selección y deriva conversación

### 6. **Datos guardados en Supabase** 💾

#### Tabla `contactos`
```sql
{
  id: uuid,
  telefono: string,
  nombre: string (default: telefono),
  created_at: timestamp,
  updated_at: timestamp
}
```

#### Tabla `conversaciones`
```sql
{
  id: uuid,
  contacto_id: uuid (FK -> contactos),
  telefono: string,
  area: string ('PSI Principal', 'Ventas', 'Alumnos', etc.),
  estado: string ('nueva', 'activa', 'cerrada'),
  ts_ultimo_mensaje: timestamp,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### Tabla `mensajes`
```sql
{
  id: uuid,
  conversacion_id: uuid (FK -> conversaciones),
  mensaje: text,
  remitente: string (teléfono o 'system'),
  timestamp: timestamp,
  metadata: jsonb (tipo, media, links, attribution)
}
```

### 7. **CRM lee desde Supabase** 📊
**Archivo**: `components/crm/CRMInterface.tsx`

**Proceso** (`loadConversations()`):

1. **Query a Supabase**:
```typescript
supabase
  .from('conversaciones')
  .select(`
    *,
    contactos (
      id,
      telefono,
      nombre
    )
  `)
  .eq('area', 'PSI Principal')  // Para inbox "PSI Principal"
  .order('ts_ultimo_mensaje', { ascending: false })
```

2. **Transforma datos**:
   - Mapea `contactos` a formato esperado
   - Mapea `ts_ultimo_mensaje` a `last_message_at`
   - Calcula `unread_count` (TODO: implementar)

3. **Suscripción en tiempo real**:
   - Se suscribe a cambios en tabla `conversaciones`
   - Cuando hay cambios, recarga automáticamente

4. **Renderiza en UI**:
   - Muestra lista de conversaciones
   - Al seleccionar, carga mensajes de esa conversación

### 8. **Cargar mensajes de conversación** 💬
**Archivo**: `components/crm/ChatPanel.tsx`

Cuando se selecciona una conversación:

1. **Carga inicial** (`loadMessages()`):
```typescript
supabase
  .from('mensajes')
  .select('*')
  .eq('conversacion_id', conversation.id)
  .order('timestamp', { ascending: true })
```

2. **Transforma mensajes**:
   - Mapea `mensaje` → `content`
   - Mapea `remitente` → `from_phone`
   - Determina `is_from_contact` (si el remitente es el contacto)

3. **Suscripción en tiempo real**:
   - Se suscribe a cambios en tabla `mensajes` filtrados por `conversacion_id`
   - Cuando hay nuevos mensajes, recarga automáticamente
   - Actualiza la lista de conversaciones

4. **Renderiza mensajes**:
   - Muestra mensajes en orden cronológico
   - Scroll automático al final
   - Diferencia entre mensajes del contacto y del sistema/agente

## 🔍 Puntos de Verificación

### ✅ Verificar que n8n envía correctamente
```bash
# Ver logs de n8n
docker logs <n8n-container> | grep webhook
```

### ✅ Verificar que Router PSI recibe
```bash
# Ver logs de PM2
pm2 logs psi-vision-hub --lines 50 | grep "Webhook recibido"
```

### ✅ Verificar que se guarda en Supabase
```bash
# Endpoint de diagnóstico
curl https://app.psivisionhub.com/api/router/debug
```

O directamente en Supabase:
```sql
SELECT * FROM conversaciones WHERE area = 'PSI Principal' ORDER BY ts_ultimo_mensaje DESC LIMIT 5;
SELECT * FROM mensajes WHERE conversacion_id = '<id>' ORDER BY timestamp;
```

### ✅ Verificar que CRM muestra
- Abrir `https://app.psivisionhub.com/crm-com`
- Seleccionar inbox "PSI Principal"
- Verificar que aparecen las conversaciones
- Abrir consola del navegador (F12) para ver logs

## 🐛 Problemas Comunes

### 1. **Body vacío en webhook**
- **Causa**: n8n no está enviando el body correctamente
- **Solución**: Verificar configuración del nodo HTTP Request en n8n

### 2. **No se crea contacto/conversación**
- **Causa**: Error en Supabase (permisos, RLS, etc.)
- **Solución**: Verificar logs del servidor, verificar permisos de `SUPABASE_SERVICE_ROLE_KEY`

### 3. **CRM no muestra conversaciones**
- **Causa**: Query incorrecta o permisos RLS
- **Solución**: Verificar query en `loadConversations()`, verificar que `area = 'PSI Principal'`

### 4. **Mensajes no aparecen en tiempo real**
- **Causa**: Suscripción a tiempo real no funciona
- **Solución**: Verificar configuración de Supabase Realtime, verificar logs de suscripción

## 📝 Notas Importantes

1. **Área hardcoded**: Las conversaciones nuevas siempre se crean con `area = 'PSI Principal'`
2. **Anti-loop**: Mensajes dentro de 15 minutos se ignoran
3. **Formato de teléfono**: Debe incluir código de país (ej: `5491112345678`)
4. **Permisos Supabase**: El Router usa `SERVICE_ROLE_KEY` (bypassa RLS), el CRM usa `ANON_KEY` (sujeto a RLS)

