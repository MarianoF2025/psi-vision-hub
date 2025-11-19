# Arquitectura Completa: Router PSI + CRM

## 📋 Índice
1. [Arquitectura General](#arquitectura-general)
2. [Flujo de Mensajes](#flujo-de-mensajes)
3. [Router Processor - Lógica Completa](#router-processor---lógica-completa)
4. [CRM - Lógica Completa](#crm---lógica-completa)
5. [Base de Datos (Supabase)](#base-de-datos-supabase)
6. [Problemas Identificados](#problemas-identificados)
7. [Diagramas de Flujo](#diagramas-de-flujo)

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        WhatsApp Cloud API                       │
│                    (Webhook: Mensajes entrantes)               │
└────────────────────────────┬──────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          n8n Workflow                           │
│  - Recibe webhook de WhatsApp                                  │
│  - Transforma formato                                           │
│  - Envía a Router PSI                                          │
└────────────────────────────┬──────────────────────────────────┘
                              │
                              │ HTTP POST
                              │ /api/router/whatsapp/webhook
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Router PSI (Next.js API)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  app/api/router/whatsapp/webhook/route.ts                 │  │
│  │  - Parsea JSON (4 formatos soportados)                    │  │
│  │  - Normaliza mensaje                                       │  │
│  │  - Llama a RouterProcessor                                 │  │
│  └────────────────────┬───────────────────────────────────────┘  │
│                       │                                           │
│  ┌────────────────────▼───────────────────────────────────────┐  │
│  │  lib/router/processor.ts (RouterProcessor)                 │  │
│  │  - Busca/crea conversación                                  │  │
│  │  - Guarda mensaje                                           │  │
│  │  - Procesa menú                                             │  │
│  │  - Envía respuesta por WhatsApp                            │  │
│  └────────────────────┬───────────────────────────────────────┘  │
└────────────────────────┼───────────────────────────────────────┘
                          │
                          │ INSERT/UPDATE/SELECT
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase (PostgreSQL)                      │
│  - contactos                                                    │
│  - conversaciones                                               │
│  - mensajes                                                     │
│  - tickets                                                      │
│  - derivaciones                                                 │
│  - audit_log                                                    │
└────────────────────────┬───────────────────────────────────────┘
                          │
                          │ SELECT (tiempo real)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CRM (Next.js Frontend)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  components/crm/CRMInterface.tsx                          │  │
│  │  - Lista conversaciones por área                          │  │
│  │  - Suscripción tiempo real                                 │  │
│  └────────────────────┬───────────────────────────────────────┘  │
│                       │                                           │
│  ┌────────────────────▼───────────────────────────────────────┐  │
│  │  components/crm/ChatPanel.tsx                              │  │
│  │  - Muestra mensajes                                         │  │
│  │  - Permite enviar mensajes                                 │  │
│  │  - Suscripción tiempo real                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📨 Flujo de Mensajes

### 1. Mensaje Entrante desde WhatsApp

```
WhatsApp Cloud API → n8n → Router PSI → Supabase → CRM
```

**Formato recibido en Router:**
```json
{
  "messaging_product": "whatsapp",
  "metadata": {
    "display_phone_number": "5491156090819",
    "phone_number_id": "809951985523815"
  },
  "contacts": [{
    "profile": { "name": "Mariano" },
    "wa_id": "5491133901743"
  }],
  "messages": [{
    "from": "5491133901743",
    "id": "wamid.xxx",
    "timestamp": "1763514394",
    "text": { "body": "2" },
    "type": "text"
  }]
}
```

### 2. Procesamiento en Router

**Archivo:** `app/api/router/whatsapp/webhook/route.ts`

**Pasos:**
1. ✅ Lee body del request
2. ✅ Parsea JSON
3. ✅ Detecta formato (4 formatos soportados)
4. ✅ Extrae mensajes y metadata
5. ✅ Normaliza cada mensaje
6. ✅ Llama a `RouterProcessor.processMessage()`

**Código clave:**
```typescript
const normalized = normalizeWhatsAppMessage(message, metadata);
const result = await processor.processMessage(normalized);
```

---

## ⚙️ Router Processor - Lógica Completa

### Método Principal: `processMessage()`

**Archivo:** `lib/router/processor.ts`

**Flujo completo:**

```
1. Validar mensaje
   ├─ From: teléfono
   ├─ Message: texto
   └─ Type: tipo de mensaje

2. Buscar/Crear conversación
   ├─ Buscar conversación existente por teléfono
   ├─ Si existe: actualizar ts_ultimo_mensaje
   └─ Si no existe:
       ├─ Buscar contacto existente
       ├─ Si no existe: crear contacto
       └─ Crear conversación (área: 'PSI Principal')

3. Verificar anti-loop
   ├─ Obtener última interacción
   ├─ Si < 15 minutos: retornar (ignorar)
   └─ Si >= 15 minutos: continuar

4. Preparar metadata
   ├─ Tipo de mensaje
   ├─ Media (si aplica)
   ├─ Links (si aplica)
   └─ Attribution (si aplica)

5. Verificar mensajes del sistema (ANTES de guardar)
   ├─ hasSystemMessages(conversationId)
   └─ Busca mensajes con remitente_tipo = 'system'

6. Guardar mensaje del usuario
   ├─ saveMessage(conversationId, phone, text, metadata)
   └─ Actualiza ts_ultimo_mensaje en conversación

7. Notificar webhook de ingesta
   └─ notifyIngestionWebhook(area, payload)

8. Procesar comando/selección
   ├─ Si comando === 'MENU' → showMainMenu()
   ├─ Si comando === 'VOLVER' → showMainMenu()
   ├─ Si !hasSystemMessages → showMainMenu() (primera vez)
   └─ Si hasSystemMessages:
       ├─ Obtener estado del menú
       ├─ Si currentMenu === 'main' → processMainMenuSelection()
       └─ Si currentMenu === 'area' → processSubmenuSelection()
```

### Métodos Clave

#### `findOrCreateConversation(phone: string)`

```typescript
1. Buscar conversación existente
   └─ SELECT * FROM conversaciones WHERE telefono = phone ORDER BY created_at DESC LIMIT 1

2. Si existe:
   └─ UPDATE conversaciones SET ts_ultimo_mensaje = NOW(), estado = 'activa' WHERE id = ...

3. Si no existe:
   ├─ Buscar contacto
   │  └─ SELECT * FROM contactos WHERE telefono = phone
   ├─ Si no existe contacto:
   │  └─ INSERT INTO contactos (telefono, nombre) VALUES (phone, phone)
   └─ INSERT INTO conversaciones (contacto_id, telefono, area, estado)
      VALUES (contacto_id, phone, 'PSI Principal', 'nueva')
```

#### `hasSystemMessages(conversationId: string)`

```typescript
SELECT id, remitente_tipo, mensaje
FROM mensajes
WHERE conversacion_id = conversationId
  AND remitente_tipo = 'system'
LIMIT 5

Retorna: true si hay mensajes, false si no hay
```

**⚠️ PROBLEMA IDENTIFICADO:**
- Este método se ejecuta ANTES de guardar el mensaje del usuario
- Si es la primera interacción, retorna `false`
- Esto debería activar `showMainMenu()` automáticamente

#### `getMenuState(conversationId: string)`

```typescript
1. Obtener últimos 10 mensajes
   └─ SELECT * FROM mensajes WHERE conversacion_id = ... ORDER BY timestamp DESC LIMIT 10

2. Buscar último mensaje del sistema
   └─ Iterar mensajes buscando:
       - remitente_tipo === 'system'
       - O contenido que empiece con "¡Hola! 👋"
       - O contenido que empiece con "Administración:", "Alumnos:", etc.
       - O contenido que incluya "Te derivamos con"

3. Determinar menú actual:
   ├─ Si mensaje incluye "¡Hola! 👋" → 'main'
   ├─ Si mensaje incluye "Te derivamos con" → 'main'
   └─ Si mensaje empieza con "Área:" → 'area' (ej: "Administración:")

4. Retornar MenuState:
   {
     conversationId,
     currentMenu: 'main' | MenuArea,
     lastInteraction: Date
   }
```

**⚠️ PROBLEMA IDENTIFICADO:**
- Si no encuentra mensaje del sistema, asume `'main'`
- Esto puede causar que procese selecciones incorrectamente

#### `showMainMenu(conversationId: string, phone: string)`

```typescript
1. Obtener texto del menú principal
   └─ getMainMenuText() → "¡Hola! 👋 Para ayudarte mejor..."

2. Guardar mensaje del sistema
   └─ saveMessage(conversationId, 'system', menuText, { type: 'text' })

3. Actualizar estado del menú
   └─ updateMenuState(conversationId, 'main')

4. Enviar por WhatsApp
   └─ sendWhatsAppMessage(phone, menuText)

5. Retornar RouterResponse
```

#### `processMainMenuSelection(conversationId, phone, selection)`

```typescript
1. Buscar opción en menú principal
   └─ findMainMenuOption(selection) → MenuOption | undefined

2. Si no existe opción:
   └─ Retornar showMainMenu() (mostrar menú de nuevo)

3. Si existe opción:
   ├─ Obtener texto del submenú
   │  └─ getSubmenuText(option.area) → "Administración:\n\n11- ..."
   ├─ Guardar mensaje del sistema
   │  └─ saveMessage(conversationId, 'system', submenuText, { type: 'text' })
   ├─ Actualizar estado del menú
   │  └─ updateMenuState(conversationId, option.area)
   └─ Enviar submenú por WhatsApp
      └─ sendWhatsAppMessage(phone, submenuText)
```

**⚠️ PROBLEMA IDENTIFICADO:**
- Los logs muestran que este método NO se está ejecutando
- El código se detiene después de "✅ Conversación encontrada/creada"
- No aparecen logs de "🔄 Procesando como selección de menú principal"

#### `processSubmenuSelection(conversationId, phone, selection, area)`

```typescript
1. Buscar opción en submenú
   └─ findSubmenuOption(area, selection) → SubMenuOption | undefined

2. Si no existe opción:
   └─ Mostrar submenú de nuevo

3. Si existe opción:
   ├─ Derivar conversación (crea ticket)
   │  └─ deriveConversation(conversationId, option.area, option.subarea)
   ├─ Generar mensaje de derivación
   │  └─ "✅ Te derivamos con *Administración*\n\n📋 *Número de ticket:* PSI-2025-000001..."
   ├─ Guardar mensaje de derivación
   │  └─ saveMessage(conversationId, 'system', derivationMessage, { type: 'text' })
   ├─ Enviar mensaje por WhatsApp
   │  └─ sendWhatsAppMessage(phone, derivationMessage)
   └─ Notificar webhook de área
      └─ notifyAreaWebhook(option.area, payload)
```

#### `saveMessage(conversationId, remitente, mensaje, metadata)`

```typescript
1. Determinar remitente_tipo y remitente_nombre:
   ├─ Si remitente === 'system' → remitente_tipo = 'system', remitente_nombre = 'Router PSI'
   ├─ Si remitente.match(/^549\d+$/) → remitente_tipo = 'contact', remitente_nombre = remitente
   └─ Si no → remitente_tipo = 'agent', remitente_nombre = remitente

2. Determinar tipo de mensaje:
   └─ tipo = metadata?.type || 'text' (debe ser en inglés: 'text', 'image', etc.)

3. INSERT INTO mensajes:
   {
     conversacion_id: conversationId,
     mensaje: mensaje,
     tipo: tipo, // 'text', 'image', etc.
     remitente_tipo: remitente_tipo, // 'system', 'contact', 'agent'
     remitente_nombre: remitente_nombre,
     remitente: remitente, // Para compatibilidad
     timestamp: NOW(),
     metadata: metadata
   }

4. UPDATE conversaciones:
   └─ SET ts_ultimo_mensaje = NOW(), updated_at = NOW() WHERE id = conversationId
```

**⚠️ PROBLEMA IDENTIFICADO:**
- El constraint `mensajes_tipo_check` requiere que `tipo` sea en inglés
- Si se envía 'texto' (español), falla con error 23514

#### `updateMenuState(conversationId, menu)`

```typescript
1. Determinar estado:
   └─ estado = menu === 'main' ? 'principal' : menu

2. Obtener metadata actual:
   └─ SELECT metadata FROM conversaciones WHERE id = conversationId

3. UPDATE conversaciones:
   {
     router_estado: estado, // 'principal' | 'Administración' | 'Alumnos' | etc.
     metadata: {
       ...metadataActual,
       menu_actual: estado
     }
   }
```

---

## 🖥️ CRM - Lógica Completa

### Componente Principal: `CRMInterface`

**Archivo:** `components/crm/CRMInterface.tsx`

**Flujo:**

```
1. Inicialización
   ├─ selectedInbox = 'PSI Principal' (default)
   ├─ conversations = []
   ├─ loading = true
   └─ error = null

2. useEffect (cuando cambia selectedInbox)
   ├─ loadConversations()
   ├─ loadInboxStats()
   └─ Suscripción tiempo real:
       └─ supabase.channel('conversations-changes')
          .on('postgres_changes', { table: 'conversaciones' }, ...)
          .subscribe()

3. loadConversations()
   ├─ Construir query:
   │  └─ SELECT *, contactos(*) FROM conversaciones WHERE area = selectedInbox
   ├─ Ordenar por ts_ultimo_mensaje DESC
   ├─ Transformar datos para UI
   └─ setConversations(transformedConversations)

4. Renderizado
   ├─ InboxSidebar (lista de inboxes)
   ├─ ConversationList (lista de conversaciones)
   ├─ ChatPanel (mensajes de conversación seleccionada)
   └─ ContactInfo (información del contacto)
```

### Componente: `ChatPanel`

**Archivo:** `components/crm/ChatPanel.tsx`

**Flujo:**

```
1. useEffect (cuando cambia conversation)
   ├─ loadMessages()
   └─ Suscripción tiempo real:
       └─ supabase.channel(`messages-${conversation.id}`)
          .on('postgres_changes', { table: 'mensajes', filter: `conversacion_id=eq.${conversation.id}` }, ...)
          .subscribe()

2. loadMessages()
   ├─ SELECT * FROM mensajes WHERE conversacion_id = ... ORDER BY timestamp ASC
   ├─ Transformar mensajes:
   │  ├─ content = mensaje
   │  ├─ from_phone = remitente_nombre || remitente
   │  └─ is_from_contact = remitente_tipo === 'contact' || remitente === telefono
   └─ setMessages(transformedMessages)

3. handleSendMessage()
   ├─ POST /api/messages/send
   │  {
   │    conversacion_id: conversation.id,
   │    mensaje: newMessage,
   │    remitente: user.email || 'system'
   │  }
   ├─ loadMessages() (recargar)
   └─ onUpdateConversation() (actualizar lista)
```

---

## 🗄️ Base de Datos (Supabase)

### Tabla: `contactos`

```sql
CREATE TABLE contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono TEXT NOT NULL UNIQUE,
  nombre TEXT,
  email TEXT,
  area TEXT,
  estado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ,
  origen TEXT,
  ubicacion TEXT,
  notas TEXT
);
```

### Tabla: `conversaciones`

```sql
CREATE TABLE conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contacto_id UUID REFERENCES contactos(id),
  telefono TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'PSI Principal',
  estado TEXT DEFAULT 'nueva', -- 'nueva', 'activa', 'esperando', 'resuelta', 'cerrada'
  inbox_id TEXT,
  ts_ultimo_mensaje TIMESTAMPTZ,
  asignado_a UUID,
  router_estado TEXT, -- 'principal', 'Administración', 'Alumnos', etc.
  subetiqueta TEXT,
  submenu_actual TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  ultimo_mensaje_at TIMESTAMPTZ,
  ts_ultima_derivacion TIMESTAMPTZ,
  ultima_derivacion TEXT, -- Número de ticket
  metadata JSONB,
  nombre TEXT
);
```

### Tabla: `mensajes`

```sql
CREATE TABLE mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id UUID REFERENCES conversaciones(id) ON DELETE CASCADE,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'text', 'image', 'audio', 'video', 'document'
  remitente_tipo TEXT NOT NULL, -- 'system', 'contact', 'agent'
  remitente_nombre TEXT NOT NULL,
  remitente_id UUID, -- UUID del contacto o agente
  remitente TEXT, -- Para compatibilidad (deprecated)
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  estado TEXT, -- 'sent', 'delivered', 'read'
  metadata JSONB,
  CONSTRAINT mensajes_tipo_check CHECK (tipo IN ('text', 'image', 'audio', 'video', 'document', 'location', 'contact'))
);
```

**⚠️ PROBLEMA IDENTIFICADO:**
- El constraint `mensajes_tipo_check` requiere valores en inglés
- Si se envía 'texto' (español), falla con error 23514

### Tabla: `tickets`

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL UNIQUE, -- 'PSI-2025-000001'
  conversacion_id UUID REFERENCES conversaciones(id),
  telefono TEXT NOT NULL,
  area TEXT NOT NULL,
  origen TEXT DEFAULT 'n8n', -- 'n8n', 'Router Automático'
  estado TEXT DEFAULT 'abierto', -- 'abierto', 'en_progreso', 'resuelto', 'cerrado'
  prioridad TEXT, -- 'Alta', 'Normal', 'Baja'
  metadata JSONB,
  ts_abierto TIMESTAMPTZ DEFAULT NOW(),
  ts_cerrado TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: `derivaciones`

```sql
CREATE TABLE derivaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT, -- Referencia a tickets.ticket_id
  conversacion_id UUID REFERENCES conversaciones(id),
  telefono TEXT NOT NULL,
  area TEXT NOT NULL,
  inbox_destino TEXT,
  api_destino TEXT,
  subetiqueta TEXT,
  status TEXT DEFAULT 'enviada', -- 'enviada', 'recibida', 'error'
  payload JSONB,
  ts_derivacion TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🐛 Problemas Identificados

### 1. **El Router NO procesa selecciones de menú**

**Síntoma:**
- Usuario envía "2" desde WhatsApp
- Logs muestran: "✅ Conversación encontrada/creada"
- NO aparecen logs de:
  - "🔍 Verificando si hay mensajes del sistema"
  - "🔍 Obteniendo estado del menú"
  - "🔄 Procesando como selección de menú principal"

**Causa probable:**
- El código se detiene después de guardar el mensaje
- No llega a la sección de procesamiento de comandos
- Puede ser un error silencioso o un return temprano

**Ubicación del problema:**
```typescript
// lib/router/processor.ts línea ~176
console.log(`✅ Webhook de ingesta notificado`);

// Después de esto, debería continuar con:
// - Procesar comando o selección (línea ~178)
// Pero los logs no muestran que llegue ahí
```

### 2. **Error de constraint `mensajes_tipo_check`**

**Síntoma:**
```
Error guardando mensaje: {
  code: '23514',
  message: 'new row for relation "mensajes" violates check constraint "mensajes_tipo_check"',
  details: 'Failing row contains (..., texto, ...)'
}
```

**Causa:**
- El código intenta guardar `tipo = 'texto'` (español)
- El constraint requiere valores en inglés: 'text', 'image', etc.

**Solución aplicada:**
```typescript
const tipoFromMetadata = metadata?.type || 'text';
const tipo = tipoFromMetadata === 'texto' ? 'text' : tipoFromMetadata;
```

**Estado:** ✅ Corregido en código, pero puede persistir si hay datos antiguos

### 3. **El menú no se muestra automáticamente en primera interacción**

**Síntoma:**
- Usuario envía primer mensaje (ej: "Hola")
- El Router NO responde con el menú principal

**Causa probable:**
- `hasSystemMessages()` se ejecuta ANTES de guardar el mensaje del usuario
- Si retorna `false`, debería activar `showMainMenu()`
- Pero el código puede no estar llegando a esa sección

**Ubicación:**
```typescript
// lib/router/processor.ts línea ~188
if (!hasSystemMessages) {
  console.log(`🎯 Primera interacción detectada...`);
  return await this.showMainMenu(conversation.id, phone);
}
```

### 4. **El submenú no se muestra después de seleccionar opción del menú principal**

**Síntoma:**
- Usuario envía "2" (Alumnos)
- El Router NO responde con el submenú de Alumnos

**Causa probable:**
- `processMainMenuSelection()` no se está ejecutando
- O `getMenuState()` está retornando un estado incorrecto
- O hay un error silencioso en `sendWhatsAppMessage()`

---

## 📊 Diagramas de Flujo

### Flujo Completo: Mensaje "2" (Alumnos)

```
1. WhatsApp → n8n → Router PSI
   └─ Webhook recibido: { messages: [{ from: "549...", text: { body: "2" } }] }

2. RouterProcessor.processMessage()
   ├─ ✅ Buscar/Crear conversación
   ├─ ✅ Verificar anti-loop
   ├─ ✅ hasSystemMessages() → true (ya hay menú principal enviado)
   ├─ ✅ Guardar mensaje del usuario: "2"
   ├─ ✅ Notificar webhook de ingesta
   └─ ❌ NO LLEGA AQUÍ:
       ├─ getMenuState() → { currentMenu: 'main' }
       ├─ processMainMenuSelection("2")
       │  ├─ findMainMenuOption("2") → { code: "2", label: "Alumnos", area: "Alumnos" }
       │  ├─ getSubmenuText("Alumnos")
       │  ├─ saveMessage(..., "Alumnos:\n\n21- ...")
       │  ├─ updateMenuState(..., "Alumnos")
       │  └─ sendWhatsAppMessage(..., "Alumnos:\n\n21- ...")
       └─ ❌ NO SE EJECUTA
```

### Flujo Esperado vs Real

**Esperado:**
```
Usuario: "2"
Router: "Alumnos:\n\n21- Acceso al campus\n22- Clases y cronograma..."
```

**Real:**
```
Usuario: "2"
Router: (sin respuesta)
```

---

## 🔍 Puntos de Debugging

### 1. Verificar si `processMessage()` completa

**Agregar logging después de cada paso crítico:**
```typescript
console.log(`✅ Paso 1: Conversación encontrada`);
console.log(`✅ Paso 2: Anti-loop verificado`);
console.log(`✅ Paso 3: hasSystemMessages = ${hasSystemMessages}`);
console.log(`✅ Paso 4: Mensaje guardado`);
console.log(`✅ Paso 5: Webhook notificado`);
console.log(`🔄 Paso 6: Procesando comando...`);
```

### 2. Verificar si `getMenuState()` se ejecuta

**Agregar logging:**
```typescript
console.log(`🔍 getMenuState() INICIADO para conversación ${conversationId}`);
console.log(`📊 Mensajes encontrados: ${lastMessages?.length || 0}`);
console.log(`📊 Último mensaje del sistema:`, lastSystemMessage);
console.log(`📊 Estado detectado:`, menuState);
```

### 3. Verificar si `processMainMenuSelection()` se ejecuta

**Agregar logging:**
```typescript
console.log(`🔄🔄🔄 processMainMenuSelection INICIADO`);
console.log(`   - Selección: "${selection}"`);
console.log(`   - Opción encontrada:`, option);
console.log(`   - Submenú generado:`, submenuText.substring(0, 100));
```

### 4. Verificar errores silenciosos

**Agregar try-catch en cada sección:**
```typescript
try {
  // Procesar comando
} catch (error) {
  console.error('❌ ERROR en procesamiento de comando:', error);
  console.error('   - Stack:', error.stack);
}
```

---

## 🎯 Próximos Pasos

1. **Agregar logging exhaustivo** en cada punto crítico
2. **Verificar si hay errores silenciosos** que interrumpen el flujo
3. **Revisar si `notifyIngestionWebhook()` está lanzando excepciones**
4. **Verificar si `sendWhatsAppMessage()` está fallando silenciosamente**
5. **Probar con un mensaje simple** (ej: "MENU") para verificar que el flujo básico funciona

---

## 📝 Notas Finales

- El código tiene la lógica correcta, pero **no se está ejecutando completamente**
- Los logs muestran que el procesamiento se detiene después de guardar el mensaje
- Necesitamos identificar **dónde exactamente se está deteniendo** el flujo
- Una vez identificado, podemos corregir el problema específico

