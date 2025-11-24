# 🏗️ Arquitectura de Envío de Mensajes - Centralwap Router

## 📋 Resumen Ejecutivo

El Centralwap Router maneja mensajes entrantes desde múltiples fuentes, los procesa mediante una arquitectura de 4 nodos optimizada, y envía respuestas tanto a WhatsApp como a sistemas externos (N8N/inboxs). El sistema incluye **gestión completa de menús interactivos** y **sistema de derivaciones automáticas** que crea tickets y notifica a los inboxs correspondientes. Esta arquitectura garantiza **< 200ms P95** de latencia y **100% de compatibilidad** con el sistema anterior.

### Funcionalidades Clave

- ✅ **Menús Interactivos**: Generación automática de menús con opciones 1-5
- ✅ **Derivaciones Automáticas**: Creación de tickets y notificación a inboxs
- ✅ **Sistema de Proxy**: Redirección automática de mensajes al área correspondiente
- ✅ **Anti-Loop**: Protección contra derivaciones repetidas (15 min)
- ✅ **Comandos Especiales**: MENU para volver al menú principal

---

## 📥 Recepción de Mensajes

### Escenarios de Recepción

El Router Centralwap puede recibir mensajes en diferentes contextos, y el comportamiento varía según el estado de la conversación:

```
┌─────────────────────────────────────────────────────────────┐
│          ESCENARIOS DE RECEPCIÓN DE MENSAJES                │
└─────────────────────────────────────────────────────────────┘

1. MENSAJE AL ROUTER (WSP4) - Sin proxy activo
   └─> area_actual = 'wsp4'
   └─> proxy_activo = false
   └─> Comportamiento: Procesamiento normal, muestra menú

2. MENSAJE CON PROXY ACTIVO - Redirección a inbox
   └─> proxy_activo = true
   └─> area_proxy = 'administracion' | 'alumnos' | 'ventas' | 'comunidad'
   └─> Comportamiento: Notifica inbox, NO genera respuesta automática

3. MENSAJE POR INGESTA N8N - Área específica
   └─> Llega por /webhook/router/:area/incoming
   └─> Ya tiene área definida desde origen
   └─> Comportamiento: Procesamiento normal con metadata de área
```

### 1. Recepción de Mensajes al Router (WSP4)

**Condición:** `area_actual = 'wsp4'` y `proxy_activo = false`

```
┌─────────────────────────────────────────────────────────────┐
│      FLUJO: MENSAJE RECIBIDO EN ROUTER (WSP4)                │
└─────────────────────────────────────────────────────────────┘

1. MENSAJE ENTRANTE
   └─> Usuario envía mensaje por WhatsApp
   └─> Llega al Router (webhook Meta/Evolution)
   │
   ▼
2. PROCESADOR ENTRADA
   └─> Crea/actualiza conversación
   └─> Establece/verifica area_actual = 'wsp4'
   └─> Verifica proxy_activo = false
   └─> Registra interacción entrante
   └─> NO notifica inbox (está en WSP4)
   │
   ▼
3. EVALUADOR ESTADO
   └─> Detecta area_actual = 'wsp4'
   └─> Evalúa mensaje:
       • Si es comando especial (MENU) → mostrar menú
       • Si es opción numérica (1-5) → derivar
       • Si es otro texto → mostrar menú automáticamente
   │
   ▼
4. EJECUTOR ACCIÓN
   └─> Genera menú o prepara derivación
   │
   ▼
5. PERSISTOR RESPUESTA
   └─> Envía menú/respuesta por WhatsApp
   └─> NO notifica a inboxs (está en área principal)
   │
   ▼
6. RESULTADO
   └─> Usuario recibe menú o mensaje de derivación
   └─> Inboxs NO son notificados
   └─> Conversación permanece en WSP4 hasta derivación
```

**Características:**
- ✅ Mensajes se procesan normalmente
- ✅ Se muestran menús automáticamente
- ✅ NO se notifica a ningún inbox
- ✅ Usuario interactúa con el bot del Router

---

### 2. Recepción de Mensajes con Proxy Activo (Áreas Específicas)

**Condición:** `proxy_activo = true` y `area_proxy` definida

```
┌─────────────────────────────────────────────────────────────┐
│      FLUJO: MENSAJE CON PROXY ACTIVO → INBOX                 │
└─────────────────────────────────────────────────────────────┘

1. MENSAJE ENTRANTE
   └─> Usuario envía mensaje por WhatsApp
   └─> Conversación tiene proxy_activo = true
   └─> area_proxy = 'administracion' (ejemplo)
   │
   ▼
2. PROCESADOR ENTRADA
   └─> Obtiene contexto completo
   └─> Detecta proxy_activo = true
   └─> Detecta area_proxy = 'administracion'
   │
   ▼
3. NOTIFICACIÓN INMEDIATA AL INBOX ⚡
   └─> ProcesadorEntrada.notificarMensajeProxyInbox()
   └─> InboxNotifierService.notificarMensajeInbox()
   └─> Tipo: 'mensaje_proxy'
   └─> POST a webhook de Administración:
       {
         conversacion_id: "uuid",
         telefono: "+5491134567890",
         mensaje: "Contenido del mensaje del usuario",
         area: "administracion",
         tipo: "mensaje_proxy",
         metadata: {
           source: "centralwap-router",
           proxy_activo: true
         }
       }
   └─> INBOX RECIBE EL MENSAJE INMEDIATAMENTE
   │
   ▼
4. EVALUADOR ESTADO
   └─> Detecta proxy_activo = true (PRIORIDAD ALTA)
   └─> Si mensaje NO es "MENU":
       └─> Retorna:
           {
             accion: 'continuar_conversacion',
             requiere_derivacion: false,
             es_mensaje_automatico: false,
             razon: 'proxy_activo_redireccion_automatica'
           }
   └─> Si mensaje es "MENU":
       └─> Permite desactivar proxy
       └─> Retorna: mostrar_menu con desactivar_proxy = true
   │
   ▼
5. EJECUTOR ACCIÓN
   └─> Si acción = 'continuar_conversacion':
       └─> Genera acción silenciosa (sin contenido)
       └─> NO genera respuesta automática
   │
   ▼
6. PERSISTOR RESPUESTA
   └─> Si acción es silenciosa:
       └─> NO envía mensaje por WhatsApp
       └─> Solo registra interacción entrante
   │
   ▼
7. RESULTADO
   └─> Usuario NO recibe respuesta automática
   └─> Inbox de Administración recibe el mensaje
   └─> Agente humano puede responder desde CRM
   └─> Conversación continúa en área derivada
```

**Características:**
- ✅ Mensajes se notifican **inmediatamente** al inbox correspondiente
- ✅ **NO se genera respuesta automática** (silencio)
- ✅ Agente humano recibe el mensaje en su inbox
- ✅ Usuario espera respuesta del agente, no del bot
- ✅ Solo comando "MENU" puede desactivar proxy y volver al Router

**Webhooks de Notificación (por área):**
- `N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION` → Inbox Administración
- `N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS` → Inbox Alumnos
- `N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1` → Inbox Ventas
- `N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD` → Inbox Comunidad

---

### 3. Recepción de Mensajes por Ingesta N8N (Área Específica)

**Condición:** Mensaje llega por webhook de ingesta con área definida

```
┌─────────────────────────────────────────────────────────────┐
│      FLUJO: INGESTA DESDE N8N CON ÁREA ESPECÍFICA            │
└─────────────────────────────────────────────────────────────┘

1. MENSAJE ENTRANTE DESDE N8N
   └─> N8N recibe mensaje de WhatsApp (Meta/Evolution)
   └─> N8N identifica área: "administracion"
   └─> POST a: /webhook/router/administracion/incoming
   └─> Body incluye metadata del área
   │
   ▼
2. RUTA DE INGESTA
   └─> Router recibe en endpoint específico
   └─> Extrae área de URL: "administracion"
   └─> Mapea a área interna: "admin"
   └─> Agrega metadata:
       {
         webhook_source: 'n8n_router',
         area_ingesta: 'admin',
         area_url: 'administracion'
       }
   │
   ▼
3. PROCESADOR ENTRADA
   └─> Crea/actualiza conversación
   └─> Puede establecer area_actual desde metadata
   └─> Registra interacción entrante
   └─> NO notifica inbox (ya viene procesado por N8N)
   │
   ▼
4. PROCESAMIENTO NORMAL
   └─> Continúa flujo normal de 4 nodos
   └─> Puede mostrar menú o procesar según contexto
   │
   ▼
5. RESULTADO
   └─> Mensaje procesado con contexto de área específica
   └─> Útil para números de WhatsApp dedicados por área
```

**Casos de Uso:**
- ✅ Números de WhatsApp separados por área
- ✅ N8N recibe mensajes y los enruta al Router
- ✅ El Router procesa según el área de origen
- ✅ Permite organización de múltiples números de WhatsApp

**Endpoints de Ingesta Disponibles:**
- `/webhook/router/wsp4/incoming`
- `/webhook/router/administracion/incoming`
- `/webhook/router/alumnos/incoming`
- `/webhook/router/comunidad/incoming`
- `/webhook/router/ventas1/incoming`
- `/webhook/router/ventas2/incoming`
- `/webhook/router/ventas3/incoming`
- `/webhook/evolution/administracion/incoming`
- `/webhook/evolution/alumnos/incoming`
- `/webhook/evolution/comunidad/incoming`

---

### 4. Comparación de Flujos de Recepción

| Característica | Router (WSP4) | Proxy Activo | Ingesta N8N |
|----------------|---------------|--------------|-------------|
| **Notifica Inbox** | ❌ No | ✅ Sí (inmediato) | ❌ No (N8N ya procesó) |
| **Genera Respuesta** | ✅ Sí (menú) | ❌ No (silencio) | ✅ Sí (normal) |
| **Área Actual** | `wsp4` | Área derivada | Desde metadata |
| **Proxy Activo** | `false` | `true` | Según contexto |
| **Comando MENU** | Muestra menú | Desactiva proxy + menú | Muestra menú |
| **Uso Típico** | Área principal | Conversación con agente | Números dedicados |

---

### 5. Diagrama Completo de Recepción

```
┌─────────────────────────────────────────────────────────────┐
│         RECEPCIÓN DE MENSAJES - DECISION TREE                │
└─────────────────────────────────────────────────────────────┘

MENSAJE ENTRANTE
    │
    ├─> ¿Llega por ingesta N8N?
    │   │
    │   ├─> SÍ → Procesar con área de metadata
    │   │        → Flujo normal (puede mostrar menú)
    │   │
    │   └─> NO → Continuar evaluación
    │
    ├─> ¿Proxy activo?
    │   │
    │   ├─> SÍ → Notificar inbox inmediatamente
    │   │        → NO generar respuesta
    │   │        → Esperar respuesta de agente
    │   │        │
    │   │        └─> ¿Mensaje es "MENU"?
    │   │             ├─> SÍ → Desactivar proxy + mostrar menú
    │   │             └─> NO → Continuar silencioso
    │   │
    │   └─> NO → Continuar evaluación
    │
    └─> ¿Área actual = WSP4?
        │
        ├─> SÍ → Mostrar menú o procesar selección
        │        → NO notificar inbox
        │
        └─> NO → Continuar conversación humana
                 → (Raro: proxy debería estar activo)
```

---

### 6. Registro de Mensajes Entrantes

Todos los mensajes entrantes se registran en la tabla `interacciones`:

```sql
{
  id: UUID,
  conversacion_id: UUID,
  tipo: 'mensaje_entrante',
  contenido: "Texto del mensaje",
  timestamp: TIMESTAMP,
  metadata: {
    webhook_source: 'evolution' | 'meta' | 'n8n_ingesta' | 'n8n_router' | 'evolution_directa',
    area_ingesta: 'admin' | 'alumnos' | 'ventas' | 'comunidad' | 'wsp4',
    proxy_activo: true | false,
    area_proxy: 'administracion' | null,
    request_id: "..."
  }
}
```

---

## 🔄 Flujo Completo de Mensajería

### 1. **PUNTOS DE ENTRADA** (Ingest)

Los mensajes pueden llegar al Router desde múltiples fuentes:

```
┌─────────────────────────────────────────────────────────────┐
│                    PUNTOS DE ENTRADA                         │
└─────────────────────────────────────────────────────────────┘

📥 1. WhatsApp Directo (Meta Cloud API)
   └─> POST /api/centralwap/webhooks/meta
       └─> Webhook directo de Meta Cloud API

📥 2. Evolution API Webhook
   └─> POST /api/centralwap/webhooks/evolution
       └─> Webhook de Evolution API

📥 3. N8N Router Ingesta (por área)
   └─> POST /webhook/router/:area/incoming
       └─> Áreas: wsp4, administracion, alumnos, comunidad, ventas1-3
       └─> N8N recibe mensaje y lo reenvía al Router

📥 4. Evolution Directa (por área)
   └─> POST /webhook/evolution/:area/incoming
       └─> Áreas: administracion, alumnos, comunidad
       └─> Mensajes directos desde Evolution organizados por área

📥 5. API Manual
   └─> POST /api/centralwap/message
       └─> Envío manual para testing/admin
```

**Todos los mensajes se normalizan a formato `MensajeEntrante` antes del procesamiento.**

---

### 2. **PROCESAMIENTO INTERNO** (4-Nodos)

Una vez recibido el mensaje, pasa por los 4 nodos core del Router. El sistema puede:
- **Generar menús** automáticamente cuando el usuario está en área wsp4
- **Procesar selecciones** numéricas (1-5) para derivar a áreas específicas
- **Crear derivaciones** con tickets y notificaciones automáticas

```
┌─────────────────────────────────────────────────────────────┐
│              ARQUITECTURA DE 4 NODOS                         │
└─────────────────────────────────────────────────────────────┘

📥 MENSAJE ENTRANTE
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│ 1. PROCESADOR ENTRADA                                    │
│    • Normaliza teléfono E.164                            │
│    • Extrae UTM tracking (Meta Ads)                      │
│    • Crea/actualiza conversación (UPSERT)                │
│    • Registra interacción entrante                       │
│    • Notifica inbox si proxy activo                      │
└──────────────────────────────────────────────────────────┘
   │
   ▼ ContextoConversacion
┌──────────────────────────────────────────────────────────┐
│ 2. EVALUADOR ESTADO                                      │
│    • Evalúa estado de conversación                       │
│    • Verifica timeout 24h                                │
│    • Detecta antiloop                                    │
│    • Identifica comandos especiales                      │
│    • Verifica proxy activo (prioridad alta)              │
│    • Determina acción a ejecutar                         │
└──────────────────────────────────────────────────────────┘
   │
   ▼ EstadoEvaluado
┌──────────────────────────────────────────────────────────┐
│ 3. EJECUTOR ACCIÓN                                       │
│    • Genera contenido según acción                       │
│    • Construye menús                                     │
│    • Prepara mensajes de derivación                      │
│    • Define datos de persistencia                        │
└──────────────────────────────────────────────────────────┘
   │
   ▼ AccionProcesada
┌──────────────────────────────────────────────────────────┐
│ 4. PERSISTOR RESPUESTA                                   │
│    • Inicia transacción atómica                          │
│    • Crea ticket si hay derivación                       │
│    • Actualiza estado conversación                       │
│    • Registra interacción saliente                       │
│    • ENVÍA MENSAJE VÍA WHATSAPP ⚡                       │
│    • Notifica inbox si hay derivación                    │
│    • Rollback automático si hay error                    │
└──────────────────────────────────────────────────────────┘
   │
   ▼ ResultadoPersistencia
   │
   ✅ RESPUESTA AL CLIENTE
```

---

### 3. **CANALES DE SALIDA** (Egress)

Después del procesamiento, el Router puede enviar mensajes por diferentes canales:

```
┌─────────────────────────────────────────────────────────────┐
│                    CANALES DE SALIDA                         │
└─────────────────────────────────────────────────────────────┘

📤 1. WhatsApp → Usuario Final
   └─> Servicio: WhatsAppService
   └─> Provider: Evolution API (configurado) / Meta Cloud API
   └─> Cuando: Siempre que hay contenido en la acción (no silencioso)
   └─> Formato: Texto plano, mensajes automáticos

📤 2. N8N Webhooks → Inboxs/CRM
   └─> Servicio: InboxNotifierService
   └─> Cuando: 
       • Derivación creada → Notificar inbox correspondiente
       • Proxy activo → Notificar inbox con mensaje entrante
   └─> Destinos:
       • N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION
       • N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS
       • N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1
       • N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD
       • N8N_WEBHOOK_ENVIOS_ROUTER_CRM
```

---

## 📋 Menús y Derivaciones

### Flujo Completo: Generación de Menú

```
┌─────────────────────────────────────────────────────────────┐
│      FLUJO: GENERACIÓN Y MUESTRA DE MENÚ                     │
└─────────────────────────────────────────────────────────────┘

1. MENSAJE ENTRANTE
   └─> Usuario envía "Hola" o cualquier mensaje
   └─> Llega al Router

2. PROCESADOR ENTRADA
   └─> Crea/actualiza conversación
   └─> Establece area_actual = 'wsp4' (si es primera vez)
   │
   ▼
3. EVALUADOR ESTADO
   └─> Evalúa contexto de conversación
   └─> Detecta que area_actual = 'wsp4'
   └─> Si no hay comando especial:
       │
       ▼
   └─> Retorna:
       {
         accion: 'mostrar_menu',
         menu_a_mostrar: 'principal',
         requiere_derivacion: false,
         es_mensaje_automatico: true,
         razon: 'area_wsp4_mostrar_menu'
       }
   │
   ▼
4. EJECUTOR ACCIÓN
   └─> Ejecuta: generarMenu()
   └─> Genera contenido del menú:
       ```
       ¡Hola! 👋
       
       Soy tu asistente virtual. ¿En qué puedo ayudarte?
       
       Elige una opción:
       1️⃣ Administración
       2️⃣ Alumnos
       3️⃣ Inscripciones
       4️⃣ Comunidad
       5️⃣ Otra consulta
       
       Escribe el número de la opción que necesites, 
       o escribe MENU para volver a ver este menú.
       ```
   └─> Retorna:
       {
         tipo: 'menu',
         contenido: "...",
         requiere_persistencia: true,
         datos_persistencia: {
           actualizar_menu: {
             menu_actual: 'principal',
             nivel_menu: 0
           },
           desactivar_proxy: true  // Si había proxy activo
         }
       }
   │
   ▼
5. PERSISTOR RESPUESTA
   └─> Actualiza conversación:
       • menu_actual = 'principal'
       • nivel_menu = 0
       • proxy_activo = false (si estaba activo)
   └─> Registra interacción saliente
   └─> ENVÍA MENSAJE POR WHATSAPP ⚡
       └─> WhatsAppService.enviarMensaje()
       └─> Usuario recibe el menú
   │
   ▼
6. RESULTADO
   └─> Usuario ve el menú con opciones 1-5
   └─> Espera selección del usuario
```

### Flujo Completo: Selección de Menú y Derivación

```
┌─────────────────────────────────────────────────────────────┐
│      FLUJO: SELECCIÓN DE MENÚ → DERIVACIÓN                   │
└─────────────────────────────────────────────────────────────┘

1. USUARIO SELECCIONA OPCIÓN
   └─> Usuario envía "1" (Administración)
   └─> Mensaje llega al Router

2. PROCESADOR ENTRADA
   └─> Actualiza conversación
   └─> Registra interacción entrante
   │
   ▼
3. EVALUADOR ESTADO
   └─> Detecta que mensaje es número (1-5)
   └─> Ejecuta: procesarOpcionMenu()
   └─> Mapeo de opciones:
       {
         1: { area: 'admin', subetiqueta: 'administracion' },
         2: { area: 'alumnos', subetiqueta: 'alumnos' },
         3: { area: 'ventas', subetiqueta: 'inscripciones' },
         4: { area: 'comunidad', subetiqueta: 'comunidad' },
         5: { area: 'revisar', subetiqueta: 'revisar' }
       }
   └─> Si ya está en esa área:
       └─> Retorna: continuar_conversacion
   └─> Si NO está en esa área:
       └─> Retorna:
           {
             accion: 'derivar',
             area_destino: 'admin',
             subetiqueta: 'administracion',
             requiere_derivacion: true,
             razon: 'opcion_menu_seleccionada',
             metadata: { opcion_menu: 1 }
           }
   │
   ▼
4. EJECUTOR ACCIÓN
   └─> Ejecuta: prepararDerivacion()
   └─> Obtiene nombre amigable del área: "Administración"
   └─> Genera mensaje de derivación:
       ```
       ✅ Te hemos derivado a Administración.
       
       Un agente humano te responderá a la brevedad. 
       Si necesitás otra cosa, escribí MENU para volver 
       al menú principal.
       ```
   └─> Retorna:
       {
         tipo: 'derivacion',
         contenido: "...",
         requiere_persistencia: true,
         datos_persistencia: {
           area_destino: 'admin',
           subetiqueta: 'administracion',
           motivo: 'opcion_menu_seleccionada',
           crear_ticket: true,
           actualizar_menu: {
             menu_actual: '',
             nivel_menu: 0
           }
         }
       }
   │
   ▼
5. PERSISTOR RESPUESTA
   └─> Detecta crear_ticket = true
   └─> Ejecuta: procesarDerivacion()
       │
       ├─ 5a. Obtiene numero_derivaciones actual
       │
       ├─ 5b. Genera ticket_id: "20240115-103000-ABCD"
       │     (Formato: YYYYMMDD-HHMMSS-XXXX)
       │
       ├─ 5c. INSERT en tabla DERIVACIONES:
       │     {
       │       conversacion_id: "uuid",
       │       area_origen: "wsp4",
       │       area_destino: "administracion",
       │       motivo: "opcion_menu_seleccionada",
       │       ts_derivacion: "2024-01-15T10:30:00Z"
       │     }
       │
       ├─ 5d. INSERT en tabla TICKETS:
       │     {
       │       ticket_id: "20240115-103000-ABCD",
       │       conversacion_id: "uuid",
       │       area_destino: "administracion",
       │       estado: "pendiente",
       │       prioridad: "normal"
       │     }
       │
       ├─ 5e. UPDATE en tabla CONVERSACIONES:
       │     {
       │       area_actual: "admin",
       │       estado: "derivado",
       │       subetiqueta: "administracion",
       │       ts_ultima_derivacion: "2024-01-15T10:30:00Z",
       │       numero_derivaciones: 1,
       │       ticket_id: "uuid-del-ticket",
       │       proxy_activo: true,        ← ACTIVA PROXY
       │       area_proxy: "administracion"
       │     }
       │
       ├─ 5f. INSERT en tabla INTERACCIONES (log):
       │     {
       │       tipo: "derivacion",
       │       contenido: "Derivación de Atención General a Administración"
       │     }
       │
       └─ 5g. NOTIFICACIÓN A INBOX ⚡
           └─> InboxNotifierService.notificarMensajeInbox()
           └─> POST a webhook N8N de Administración
           └─> Payload:
               {
                 conversacion_id: "uuid",
                 telefono: "+5491134567890",
                 mensaje: "Nueva derivación a Administración",
                 area: "administracion",
                 tipo: "derivacion",
                 ticket_id: "20240115-103000-ABCD",
                 derivacion_id: "uuid"
               }
   │
   ▼
6. ENVÍO MENSAJE AL USUARIO
   └─> WhatsAppService.enviarMensaje()
   └─> Usuario recibe: "✅ Te hemos derivado a Administración..."
   │
   ▼
7. PROXY ACTIVO
   └─> proxy_activo = true
   └─> area_proxy = "administracion"
   └─> Todos los mensajes entrantes:
       • NO generan respuestas automáticas
       • Se notifican directamente al inbox
       • Para que el agente humano responda
   │
   ▼
8. RESULTADO
   └─> Usuario está derivado a Administración
   └─> Ticket creado y pendiente
   └─> Inbox de Administración notificado
   └─> Proxy activo: mensajes van directo al inbox
   └─> Usuario espera respuesta de agente humano
```

### Comandos Especiales: MENU

```
┌─────────────────────────────────────────────────────────────┐
│      FLUJO: COMANDO MENU                                     │
└─────────────────────────────────────────────────────────────┘

1. USUARIO ESCRIBE "MENU"
   └─> Llega al Router

2. EVALUADOR ESTADO
   └─> Detecta comando especial: procesarComandosEspeciales()
   └─> Si mensaje = "MENU" o "MENÚ":
       └─> Retorna:
           {
             accion: 'mostrar_menu',
             menu_a_mostrar: 'principal',
             requiere_derivacion: false,
             razon: 'comando_menu',
             metadata: {
               desactivar_proxy: true  ← IMPORTANTE
             }
           }
   │
   ▼
3. EJECUTOR ACCIÓN
   └─> Genera menú principal
   └─> Incluye desactivar_proxy: true
   │
   ▼
4. PERSISTOR RESPUESTA
   └─> Actualiza conversación:
       • menu_actual = 'principal'
       • nivel_menu = 0
       • proxy_activo = false  ← DESACTIVA PROXY
       • area_proxy = null
   └─> Envía menú por WhatsApp
   │
   ▼
5. RESULTADO
   └─> Usuario ve menú principal
   └─> Proxy desactivado
   └─> Puede seleccionar nueva área
```

### Estructura de Datos: Menús y Derivaciones

**Mapeo de Opciones de Menú:**
```typescript
{
  1: { area: 'admin', subetiqueta: 'administracion' },
  2: { area: 'alumnos', subetiqueta: 'alumnos' },
  3: { area: 'ventas', subetiqueta: 'inscripciones' },
  4: { area: 'comunidad', subetiqueta: 'comunidad' },
  5: { area: 'revisar', subetiqueta: 'revisar' }
}
```

**Registros Creados en Derivación:**

1. **Tabla `derivaciones`:**
   ```sql
   {
     id: UUID,
     conversacion_id: UUID,
     area_origen: 'wsp4',
     area_destino: 'administracion',
     motivo: 'opcion_menu_seleccionada',
     ts_derivacion: TIMESTAMP
   }
   ```

2. **Tabla `tickets`:**
   ```sql
   {
     id: UUID,
     ticket_id: '20240115-103000-ABCD',  // Formato YYYYMMDD-HHMMSS-XXXX
     conversacion_id: UUID,
     area_destino: 'administracion',
     estado: 'pendiente',
     prioridad: 'normal',
     ts_creacion: TIMESTAMP
   }
   ```

3. **Tabla `conversaciones` (actualización):**
   ```sql
   {
     area_actual: 'admin',
     estado: 'derivado',
     subetiqueta: 'administracion',
     ts_ultima_derivacion: TIMESTAMP,
     numero_derivaciones: 1,
     ticket_id: UUID,
     proxy_activo: true,      ← Clave para redirección
     area_proxy: 'administracion'
   }
   ```

### Anti-Loop: Protección contra Derivaciones Repetidas

```
┌─────────────────────────────────────────────────────────────┐
│      FLUJO: ANTI-LOOP (15 minutos)                          │
└─────────────────────────────────────────────────────────────┘

1. USUARIO INTENTA DERIVARSE DE NUEVO
   └─> Menos de 15 minutos desde última derivación

2. EVALUADOR ESTADO
   └─> verificarAntiloop()
   └─> Calcula minutos desde ts_ultima_derivacion
   └─> Si < 15 minutos:
       └─> antiloop_activo = true
       └─> Si mensaje parece solicitud de derivación:
           └─> Retorna: mensaje_cortesia
   │
   ▼
3. EJECUTOR ACCIÓN
   └─> Genera mensaje de cortesía:
       "Ya te derivamos a [Área]. 
        Un agente humano te responderá pronto. 
        Si necesitás cambiar de área, escribí MENU."
   │
   ▼
4. PERSISTOR RESPUESTA
   └─> Envía mensaje de cortesía
   └─> NO crea nueva derivación
   │
   ▼
5. RESULTADO
   └─> Usuario recibe mensaje informativo
   └─> Se previene spam de derivaciones
```

### Casos Especiales en Menús y Derivaciones

1. **Usuario ya está en el área seleccionada:**
   - No se crea derivación
   - Retorna: `continuar_conversacion`
   - Razón: `ya_en_area_seleccionada`

2. **Comando MENU durante proxy activo:**
   - Se permite el comando
   - Desactiva proxy automáticamente
   - Muestra menú principal
   - Permite nueva selección

3. **Error durante creación de derivación:**
   - Rollback automático
   - Elimina derivación creada
   - Elimina ticket creado
   - Mantiene estado original
   - Usuario recibe mensaje de error

4. **Timeout 24h:**
   - Si ventana WhatsApp expirada
   - Muestra menú automáticamente
   - Permite nueva interacción

---

## 🔧 Servicios de Envío

### WhatsAppService (EvolutionWhatsAppService)

**Responsabilidad:** Enviar mensajes de texto a usuarios finales vía WhatsApp.

**Implementación Actual:**
- **Provider:** Evolution API (configurado en `.env`)
- **Endpoint:** `POST /message/sendText/{instance_name}`
- **Autenticación:** API Key en headers
- **Formato Teléfono:** Sin prefijo `+` (E.164 sin `+`)

**Código:**
```typescript
// src/services/WhatsAppService.ts
class EvolutionWhatsAppService {
  async enviarMensaje(params: {
    telefono: string;      // +5491134567890
    mensaje: string;       // Contenido del mensaje
    conversacion_id: string;
    request_id: string;
  }): Promise<{
    success: boolean;
    message_id?: string;
    error?: string;
  }>
}
```

**Flujo de Envío:**
1. Recibe parámetros del `PersistorRespuesta`
2. Formatea teléfono (remueve `+`)
3. Hace POST a Evolution API
4. Extrae `message_id` de la respuesta
5. Registra en logs con métricas de tiempo
6. Retorna resultado

**Manejo de Errores:**
- Timeout: 10 segundos
- Retry: No implementado (fallback manual)
- Logging: Error detallado con status code

---

### InboxNotifierService

**Responsabilidad:** Notificar a los inboxs (N8N/CRM) sobre derivaciones y mensajes con proxy activo.

**Implementación:**
- **Método:** POST HTTP a webhooks de N8N
- **Timeout:** 10 segundos
- **Payload:** JSON con información del mensaje/derivación

**Webhooks Configurados:**
```env
N8N_WEBHOOK_ENVIOS_ROUTER_CRM=https://webhookn8n.psivisionhub.com/webhook/crm/enviar_mensaje
N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION=https://webhookn8n.psivisionhub.com/webhook/crm/enviar-mensaje-administracion
N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS=https://webhookn8n.psivisionhub.com/webhook/crm/enviar-mensaje-alumnos
N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1=https://webhookn8n.psivisionhub.com/webhook/crm/enviar-mensaje-ventas_1
N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD=https://webhookn8n.psivisionhub.com/webhook/crm/enviar-mensaje-comunidad
```

**Código:**
```typescript
// src/services/InboxNotifierService.ts
class InboxNotifierService {
  async notificarMensajeInbox(params: {
    conversacion_id: string;
    telefono: string;
    mensaje: string;
    area_destino: AreaType;
    tipo: 'derivacion' | 'mensaje_proxy' | 'mensaje_normal';
    ticket_id?: string;
    derivacion_id?: string;
  }): Promise<{ success: boolean; error?: string }>
}
```

**Payload Enviado:**
```json
{
  "conversacion_id": "uuid",
  "telefono": "+5491134567890",
  "mensaje": "Contenido del mensaje",
  "area": "administracion",
  "tipo": "derivacion",
  "timestamp": "2024-01-15T10:30:00Z",
  "ticket_id": "20240115-103000-ABCD",
  "derivacion_id": "uuid",
  "metadata": {
    "source": "centralwap-router",
    "proxy_activo": false
  }
}
```

**Casos de Uso:**

1. **Derivación Creada:**
   - Se ejecuta en `PersistorRespuesta.procesarDerivacion()`
   - Después de crear ticket en BD
   - Notifica al inbox correspondiente al área destino

2. **Mensaje con Proxy Activo:**
   - Se ejecuta en `ProcesadorEntrada.procesarEntrada()`
   - Cuando `proxy_activo = true` y hay `area_proxy`
   - Notifica al inbox con el mensaje entrante para que un agente lo vea

---

## 📊 Flujo Detallado: Envío de Mensaje a WhatsApp

```
┌─────────────────────────────────────────────────────────────┐
│      FLUJO COMPLETO: MENSAJE → WHATSAPP                      │
└─────────────────────────────────────────────────────────────┘

1. MENSAJE ENTRANTE
   └─> Usuario envía "Hola" por WhatsApp
   └─> Llega al Router vía webhook

2. PROCESAMIENTO INTERNO
   └─> 4 nodos procesan el mensaje
   └─> EjecutorAccion genera menú principal
   └─> AccionProcesada contiene el texto del menú

3. PERSISTOR RESPUESTA
   └─> persistirRespuesta() es llamado
   └─> Se registra interacción saliente en BD
   └─> Si hay contenido y no es silencioso:
       │
       ▼
4. WhatsAppService.enviarMensaje()
   └─> Parámetros:
       • telefono: "+5491134567890"
       • mensaje: "Menú principal:\n1. Admin\n2. Alumnos..."
       • conversacion_id: "uuid"
       • request_id: "req_..."
   │
   ▼
5. Llamada HTTP a Evolution API
   └─> POST https://evolution-api.com/message/sendText/instance_name
   └─> Headers:
       • Content-Type: application/json
       • apikey: {EVOLUTION_API_KEY}
   └─> Body:
       {
         "number": "5491134567890",  // Sin +
         "text": "Menú principal..."
       }
   │
   ▼
6. Evolution API procesa
   └─> Envía mensaje a WhatsApp
   └─> Retorna respuesta:
       {
         "key": { "id": "wamid.xxxxx" },
         "status": "sent"
       }
   │
   ▼
7. WhatsAppService procesa respuesta
   └─> Extrae message_id: "wamid.xxxxx"
   └─> Actualiza interacción con WhatsApp ID
   └─> Log: "Mensaje enviado exitosamente"
   └─> Retorna: { success: true, message_id: "wamid.xxxxx" }
   │
   ▼
8. PersistorRespuesta completa
   └─> Retorna: { success: true, mensaje_enviado: true }
   │
   ▼
9. RESPUESTA AL CLIENTE
   └─> Router retorna:
       {
         "success": true,
         "request_id": "...",
         "mensaje_enviado": true,
         "processing_time_ms": 150
       }
```

---

## 🔄 Flujo Detallado: Notificación a Inbox

```
┌─────────────────────────────────────────────────────────────┐
│      FLUJO: DERIVACIÓN → NOTIFICACIÓN INBOX                  │
└─────────────────────────────────────────────────────────────┘

1. USUARIO SELECCIONA ÁREA
   └─> Usuario envía "1" (Administración)
   └─> Router procesa selección

2. DERIVACIÓN CREADA
   └─> PersistorRespuesta.procesarDerivacion()
   └─> Se crea registro en tabla `derivaciones`
   └─> Se crea ticket en tabla `tickets`
   └─> Se actualiza conversación (area, estado='derivado', proxy_activo=true)
   │
   ▼
3. NOTIFICACIÓN A INBOX
   └─> notificarDerivacionInbox() es llamado
   └─> InboxNotifierService.notificarMensajeInbox()
   └─> Parámetros:
       • area_destino: "admin"
       • tipo: "derivacion"
       • ticket_id: "20240115-103000-ABCD"
       • derivacion_id: "uuid"
   │
   ▼
4. Mapeo de Área
   └─> mapearAreaABD("admin") → "administracion"
   └─> Obtiene webhook: N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION
   │
   ▼
5. POST a N8N Webhook
   └─> POST https://webhookn8n.psivisionhub.com/webhook/crm/enviar-mensaje-administracion
   └─> Body:
       {
         "conversacion_id": "uuid",
         "telefono": "+5491134567890",
         "mensaje": "Nueva derivación a Administración",
         "area": "administracion",
         "tipo": "derivacion",
         "ticket_id": "20240115-103000-ABCD",
         "derivacion_id": "uuid",
         "timestamp": "2024-01-15T10:30:00Z",
         "metadata": {
           "source": "centralwap-router",
           "proxy_activo": false
         }
       }
   │
   ▼
6. N8N Procesa
   └─> N8N recibe la notificación
   └─> Actualiza CRM/inbox
   └─> Asigna ticket a agente
   └─> Notifica al agente
   │
   ▼
7. Router Completa
   └─> Log: "Notificación enviada exitosamente a inbox"
   └─> Retorna: { success: true }
   └─> PersistorRespuesta continúa con el flujo normal
```

---

## 🎯 Casos Especiales

### Proxy Activo

Cuando `proxy_activo = true`, el flujo cambia:

1. **Mensaje Entrante:**
   - `EvaluadorEstado` detecta proxy activo (prioridad alta)
   - Retorna acción: `continuar_conversacion` (sin respuesta automática)
   - `ProcesadorEntrada` notifica inbox inmediatamente con mensaje entrante
   - No se genera menú ni respuesta automática

2. **Mensaje Saliente:**
   - Los mensajes del Router NO se envían si proxy está activo
   - Solo se notifican al inbox para que el agente responda

3. **Desactivar Proxy:**
   - Usuario envía "MENU"
   - `EjecutorAccion` marca `desactivar_proxy: true`
   - `PersistorRespuesta` actualiza `proxy_activo = false`
   - Sistema vuelve a funcionar normalmente

### Mensajes Silenciosos

Cuando `accion.tipo === 'silencioso'`:

- No se registra interacción saliente
- No se envía mensaje por WhatsApp
- Solo se actualiza estado de conversación
- Útil para cambios de estado internos

### Rollback Automático

Si hay error durante persistencia:

1. Se detecta el error
2. Se loguea el error con contexto completo
3. Se intenta enviar mensaje de recovery al usuario
4. Se registra en logs para análisis posterior
5. Se retorna error al cliente

---

## 📈 Métricas y Performance

### Latencia Objetivo
- **P95 < 200ms** (procesamiento completo extremo a extremo)
- **Envío WhatsApp:** ~50-100ms (depende de Evolution API)
- **Notificación N8N:** ~50-100ms (async, no bloquea)

### Timeouts
- **WhatsAppService:** 10 segundos
- **InboxNotifierService:** 10 segundos
- **Rate Limiting:** 60 req/min por endpoint

### Logging
- Todos los envíos se registran con:
  - Request ID
  - Timestamp
  - Processing time
  - Success/Error
  - Message ID (si aplica)

---

## 🔐 Seguridad

### Validaciones
- ✅ Validación de teléfono (E.164)
- ✅ Validación de contenido (max 4096 chars)
- ✅ Validación de campos requeridos
- ✅ Rate limiting en todos los endpoints

### Autenticación
- **Evolution API:** API Key en headers
- **N8N Webhooks:** URLs públicas (seguridad por URL única)
- **Webhooks Meta:** Verificación de webhook secret (opcional)

---

## 📝 Archivos Clave

### Servicios de Envío
- `src/services/WhatsAppService.ts` - Envío a WhatsApp
- `src/services/InboxNotifierService.ts` - Notificación a inboxs

### Nodos Core
- `src/core/ProcesadorEntrada.ts` - Procesamiento inicial
- `src/core/EvaluadorEstado.ts` - Evaluación de estado
- `src/core/EjecutorAccion.ts` - Generación de acciones
- `src/core/PersistorRespuesta.ts` - Persistencia y envío

### Rutas
- `src/routes/message.ts` - Endpoint manual
- `src/routes/webhook.ts` - Webhooks de WhatsApp
- `src/routes/ingesta.ts` - Ingesta desde N8N

---

## ✅ Resumen de Flujos de Salida

| Evento | Canal de Salida | Servicio | Condición |
|--------|----------------|----------|-----------|
| **Mensaje automático** (menú, respuesta) | WhatsApp → Usuario | WhatsAppService | `accion.contenido` existe y no es silencioso |
| **Derivación creada** | N8N → Inbox | InboxNotifierService | Se crea ticket exitosamente |
| **Mensaje con proxy activo** | N8N → Inbox | InboxNotifierService | `proxy_activo = true` y mensaje entrante |
| **Error crítico** | WhatsApp → Usuario (recovery) | WhatsAppService | Error durante persistencia |

---

**✅ Arquitectura completa implementada y documentada**

