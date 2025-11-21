# 🔍 Análisis Completo de Arquitectura: Router PSI

## 📋 Resumen Ejecutivo

El **Router PSI** es un servicio independiente de Node.js/Express que:
- ✅ Escucha en el **puerto 3002**
- ✅ Recibe webhooks de **WhatsApp Cloud API**
- ✅ Procesa mensajes y gestiona menús interactivos
- ✅ Guarda datos en **Supabase** (contactos, conversaciones, mensajes)
- ✅ Se comunica con **n8n** para derivar mensajes a diferentes áreas
- ✅ Envía respuestas vía **WhatsApp Cloud API**

---

## 1. 🏗️ ARQUITECTURA ACTUAL

### 1.1 Estructura de Archivos

```
router-psi/
├── src/
│   ├── app.ts                    # Punto de entrada Express
│   ├── config/
│   │   ├── environment.ts        # Validación de variables de entorno
│   │   ├── supabase.ts           # Cliente Supabase (admin + anon)
│   │   └── whatsapp.ts           # Cliente Axios para WhatsApp API
│   ├── middleware/
│   │   ├── auth.ts               # Verificación de webhook (GET)
│   │   ├── errorHandler.ts       # Manejo centralizado de errores
│   │   └── rateLimit.ts          # Rate limiting (120 req/min)
│   ├── models/
│   │   ├── enums.ts              # Enums: Area, Inbox, VentanaTipo
│   │   └── types.ts              # Interfaces: Contacto, Conversacion, Mensaje
│   ├── routes/
│   │   ├── api.ts                # Endpoints internos (/api/derivar, /api/toggle-bypass)
│   │   ├── health.ts             # Health check (/health)
│   │   └── webhook.ts            # Webhooks de WhatsApp
│   ├── services/
│   │   ├── CentralTelefonica.ts  # Orquesta envío de mensajes
│   │   ├── DatabaseService.ts    # CRUD en Supabase
│   │   ├── MenuService.ts        # Lógica de menús interactivos
│   │   ├── MessageProcessor.ts   # Procesador principal de mensajes
│   │   ├── MetaAdsHandler.ts     # Manejo de leads de Meta Ads
│   │   ├── RedireccionService.ts # Redirecciones entre números
│   │   └── WhatsAppService.ts    # Envío de mensajes vía API
│   └── utils/
│       ├── antiloop.ts           # Prevención de loops (15 min)
│       ├── logger.ts             # Winston logger
│       └── validation.ts         # Schemas Joi para validación
├── ecosystem.config.cjs          # Configuración PM2
├── package.json                  # Dependencias
└── tsconfig.json                # Configuración TypeScript
```

### 1.2 Stack Tecnológico

- **Runtime**: Node.js
- **Framework**: Express.js
- **Lenguaje**: TypeScript
- **Base de Datos**: Supabase (PostgreSQL)
- **Cliente Supabase**: `@supabase/supabase-js` v2.38.0
- **HTTP Client**: Axios v1.7.7
- **Validación**: Joi v17.11.0
- **Logging**: Winston v3.11.0
- **Process Manager**: PM2
- **Puerto**: 3002

### 1.3 Flujo de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│              WhatsApp Cloud API                              │
│  - WSP4 (Administración)                                     │
│  - VENTAS1 (Ventas)                                          │
│  - ADMIN, ALUMNOS, COMUNIDAD (áreas específicas)            │
└───────────────────────┬─────────────────────────────────────┘
                        │ POST /webhook/whatsapp/{area}
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Router PSI (Puerto 3002)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. webhook.ts → Recibe payload                      │   │
│  │ 2. MessageProcessor → Procesa mensaje              │   │
│  │ 3. DatabaseService → Guarda en Supabase            │   │
│  │ 4. MenuService → Genera respuesta                   │   │
│  │ 5. CentralTelefonica → Envía respuesta             │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ INSERT/UPDATE
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase                                  │
│  - contactos                                                │
│  - conversaciones                                            │
│  - mensajes                                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ SELECT (tiempo real)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              CRM (Puerto 3000/3001)                          │
│  - Lee conversaciones y mensajes                            │
│  - Interfaz de usuario para agentes                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 🔌 CONEXIONES Y CONFIGURACIÓN

### 2.1 Variables de Entorno Requeridas

El Router PSI requiere las siguientes variables (definidas en `router-psi/.env`):

#### Servidor
```bash
NODE_ENV=production
PORT=3002
LOG_LEVEL=info
ANTILOOP_MINUTES=15
```

#### Seguridad
```bash
WEBHOOK_VERIFY_TOKEN=tu_token_aqui
```

#### Supabase
```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_STORAGE_BUCKET_AUDIOS=audios
SUPABASE_STORAGE_BUCKET_DOCUMENTOS=documentos
```

#### WhatsApp Cloud API
```bash
WHATSAPP_TOKEN=tu_whatsapp_token
CLOUD_API_BASE_URL=https://graph.facebook.com/v21.0
WSP4_PHONE_ID=tu_phone_id_wsp4
VENTAS1_PHONE_ID=tu_phone_id_ventas1
ADMIN_PHONE_ID=tu_phone_id_admin
ALUMNOS_PHONE_ID=tu_phone_id_alumnos
COMUNIDAD_PHONE_ID=tu_phone_id_comunidad
WSP4_NUMBER=5491156090819
VENTAS1_NUMBER=tu_numero_ventas1
```

#### Webhooks n8n
```bash
N8N_WEBHOOK_ENVIOS_ROUTER_CRM=https://tu-n8n.com/webhook/crm
N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION=https://tu-n8n.com/webhook/admin
N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS=https://tu-n8n.com/webhook/alumnos
N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD=https://tu-n8n.com/webhook/comunidad
N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1=https://tu-n8n.com/webhook/ventas1
```

### 2.2 Configuración de Supabase

**Archivo**: `router-psi/src/config/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { Env } from './environment';

// Cliente con permisos de administrador (service_role_key)
export const supabaseAdmin = createClient(
  Env.supabase.url, 
  Env.supabase.serviceKey, 
  {
    auth: { persistSession: false }
  }
);

// Cliente con permisos anónimos (anon_key)
export const supabaseAnon = createClient(
  Env.supabase.url, 
  Env.supabase.anonKey, 
  {
    auth: { persistSession: false }
  }
);
```

**Uso**:
- `supabaseAdmin`: Usado para todas las operaciones de escritura (INSERT, UPDATE)
- `supabaseAnon`: Disponible pero no se usa actualmente

**Tablas utilizadas**:
1. `contactos` - Información de contactos
2. `conversaciones` - Conversaciones activas
3. `mensajes` - Historial de mensajes

### 2.3 Configuración de WhatsApp

**Archivo**: `router-psi/src/config/whatsapp.ts`

```typescript
import axios from 'axios';
import { Env } from './environment';

export const whatsappClient = axios.create({
  baseURL: Env.whatsapp.baseUrl, // https://graph.facebook.com/v21.0
  headers: {
    Authorization: `Bearer ${Env.whatsapp.token}`,
    'Content-Type': 'application/json',
  },
});
```

**Phone IDs configurados**:
- `wsp4` → WSP4_PHONE_ID
- `ventas1` → VENTAS1_PHONE_ID
- `administracion` → ADMIN_PHONE_ID
- `alumnos` → ALUMNOS_PHONE_ID
- `comunidad` → COMUNIDAD_PHONE_ID

### 2.4 Carga de Variables de Entorno

**Archivo**: `router-psi/src/config/environment.ts`

El sistema carga el archivo `.env` desde `router-psi/.env` usando `dotenv`:

```typescript
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}
```

**Validación**: Todas las variables se validan con Joi antes de iniciar el servidor. Si falta alguna variable requerida, el proceso falla con error.

---

## 3. 🔄 FLUJO DE DATOS

### 3.1 Recepción de Mensajes de WhatsApp

**Endpoint**: `POST /webhook/whatsapp/{area}`

**Rutas disponibles**:
- `/webhook/whatsapp/wsp4` → Área: ADMINISTRACION
- `/webhook/whatsapp/ventas1` → Área: VENTAS1
- `/webhook/whatsapp/administracion` → Área: ADMINISTRACION
- `/webhook/whatsapp/alumnos` → Área: ALUMNOS
- `/webhook/whatsapp/comunidad` → Área: COMUNIDAD

**Flujo de recepción**:

```12:33:router-psi/src/routes/webhook.ts
webhookRouter.post('/webhook/whatsapp/wsp4', async (req, res, next) => {
  try {
    // Si es webhook de status directo de WhatsApp Cloud API (sin messages)
    if (req.body.messaging_product === 'whatsapp' && !req.body.messages) {
      Logger.info('Webhook de status WhatsApp Cloud API ignorado (WSP4)');
      return res.status(200).json({ success: true, ignored: true });
    }

    const { error, value } = webhookPayloadSchema.validate(req.body);
    if (error) {
      Logger.warn('Payload invalido WSP4', { error });
      return res.status(400).json({ success: false, error: 'payload invalido' });
    }

    const message = value.messages[0];
    const result = await messageProcessor.processIncoming(message, Area.ADMINISTRACION);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});
```

### 3.2 Procesamiento de Mensajes

**Archivo**: `router-psi/src/services/MessageProcessor.ts`

**Flujo completo**:

```13:112:router-psi/src/services/MessageProcessor.ts
async processIncoming(message: WebhookMessage, area: Area = Area.ADMINISTRACION) {
    const telefono = message.from;
    const conversacion = await databaseService.buscarOCrearConversacion(
      telefono,
      Env.whatsapp.numbers.wsp4,
      area
    );

    if (antiLoop.isWithinWindow(conversacion.id)) {
      Logger.warn('Mensaje dentro de ventana anti-loop, se ignora', { conversacionId: conversacion.id });
      return { ignored: true };
    }

    antiLoop.touch(conversacion.id);

    const texto = message.text?.body || message.interactive?.button_reply?.title || '';
    Logger.info('[MessageProcessor] Iniciando procesamiento', {
      conversacionId: conversacion.id,
      telefono,
      texto,
      textoLength: texto.length,
      messageType: message.type,
    });
    
    // 1. Guardar mensaje del usuario ANTES de procesar
    Logger.info('[MessageProcessor] Guardando mensaje del usuario en Supabase');
    await databaseService.saveMessage({
      conversacion_id: conversacion.id,
      remitente: telefono,
      tipo: message.type,
      mensaje: texto,
      telefono: telefono, // Agregar teléfono explícitamente
      timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(), // Convertir timestamp de WhatsApp
      whatsapp_message_id: message.id,
      metadata: {
        interactive: message.interactive,
      },
    });
    Logger.info('[MessageProcessor] Mensaje del usuario guardado en Supabase', {
      conversacionId: conversacion.id,
      telefono,
      texto: texto.substring(0, 50),
    });

    // 2. Procesar lógica de menú
    Logger.info('[MessageProcessor] Procesando entrada con MenuService', { texto });
    const menuResponse = menuService.procesarEntrada(texto);
    Logger.info('[MessageProcessor] Respuesta del menú obtenida', {
      replyLength: menuResponse.reply?.length || 0,
      submenu: menuResponse.submenu,
      area: menuResponse.area,
      derivar: menuResponse.derivar,
      replyPreview: menuResponse.reply?.substring(0, 100),
    });

    const updates = {
      router_estado: menuResponse.submenu || conversacion.router_estado,
      submenu_actual: menuResponse.submenu,
      area: menuResponse.area || conversacion.area,
    };
    Logger.info('[MessageProcessor] Actualizando conversación', {
      conversacionId: conversacion.id,
      updates,
      routerEstadoAnterior: conversacion.router_estado,
      routerEstadoNuevo: updates.router_estado,
    });

    await databaseService.updateConversacion(conversacion.id, updates);
    Logger.info('[MessageProcessor] Conversación actualizada');

    const areaEnvio = menuResponse.area || conversacion.area || Area.ADMINISTRACION;
    Logger.info('[MessageProcessor] Enviando mensaje', {
      conversacionId: conversacion.id,
      areaEnvio,
      derivar: menuResponse.derivar,
      replyLength: menuResponse.reply?.length || 0,
    });

    if (menuResponse.derivar && menuResponse.area) {
      Logger.info('[MessageProcessor] Enviando con derivación a área específica', { area: menuResponse.area });
      await centralTelefonica.enviarMensaje(
        conversacion.id,
        menuResponse.reply,
        menuResponse.area
      );
    } else {
      Logger.info('[MessageProcessor] Enviando sin derivación', { areaEnvio });
      await centralTelefonica.enviarMensaje(
        conversacion.id,
        menuResponse.reply,
        areaEnvio
      );
    }
    Logger.info('[MessageProcessor] Mensaje enviado exitosamente');

    return {
      conversacionId: conversacion.id,
      menuResponse,
    };
  }
```

**Pasos del procesamiento**:

1. **Buscar/Crear Conversación**: `databaseService.buscarOCrearConversacion()`
2. **Verificar Anti-Loop**: Evita procesar mensajes duplicados en ventana de 15 minutos
3. **Guardar Mensaje del Usuario**: `databaseService.saveMessage()` → INSERT en `mensajes`
4. **Procesar Menú**: `menuService.procesarEntrada()` → Genera respuesta según entrada
5. **Actualizar Conversación**: `databaseService.updateConversacion()` → UPDATE en `conversaciones`
6. **Enviar Respuesta**: `centralTelefonica.enviarMensaje()` → Envía vía WhatsApp API

### 3.3 Guardado en Supabase

**Archivo**: `router-psi/src/services/DatabaseService.ts`

#### 3.3.1 Guardar Mensaje

```96:162:router-psi/src/services/DatabaseService.ts
async saveMessage(message: Mensaje) {
    // Determinar si es mensaje del usuario o del sistema
    const isSystem = message.remitente === 'system';
    const direccion = isSystem ? 'outbound' : 'inbound';
    const remitente_tipo = isSystem ? 'system' : 'user';
    
    // Obtener el teléfono: del mensaje o de la conversación
    let telefono = message.telefono;
    if (!telefono) {
      // Si no viene en el mensaje, obtenerlo de la conversación
      const { data: conv } = await supabaseAdmin
        .from('conversaciones')
        .select('telefono')
        .eq('id', message.conversacion_id)
        .single();
      telefono = conv?.telefono || message.remitente;
    }

    // Timestamp: usar el del mensaje o el actual
    const timestamp = message.timestamp || new Date().toISOString();

    const mensajeData = {
      conversacion_id: message.conversacion_id,
      remitente: message.remitente,
      tipo: message.tipo,
      mensaje: message.mensaje || '',
      telefono: telefono,
      direccion: direccion,
      remitente_tipo: remitente_tipo,
      timestamp: timestamp,
      whatsapp_message_id: message.whatsapp_message_id,
      metadata: message.metadata || {},
      created_at: timestamp,
    };

    const { data, error } = await supabaseAdmin
      .from('mensajes')
      .insert(mensajeData)
      .select()
      .single();

    if (error) {
      Logger.error('Error guardando mensaje', { error, message: mensajeData });
      throw error;
    }

    Logger.info('Mensaje guardado en Supabase', {
      mensajeId: data?.id,
      conversacionId: message.conversacion_id,
      remitente: message.remitente,
      remitente_tipo,
      direccion,
      telefono,
      tipo: message.tipo,
    });

    await supabaseAdmin
      .from('conversaciones')
      .update({
        ts_ultimo_mensaje: timestamp,
        updated_at: new Date().toISOString(),
        ultimo_mensaje: message.mensaje || '',
      })
      .eq('id', message.conversacion_id);

    return data;
  }
```

**Operaciones realizadas**:
1. INSERT en tabla `mensajes`
2. UPDATE en tabla `conversaciones` (actualiza `ts_ultimo_mensaje`, `updated_at`, `ultimo_mensaje`)

#### 3.3.2 Buscar/Crear Conversación

```41:94:router-psi/src/services/DatabaseService.ts
async buscarOCrearConversacion(
    telefono: string,
    numeroOrigen: string,
    area: Area = Area.ADMINISTRACION
  ): Promise<Conversacion> {
    const { data, error } = await supabaseAdmin
      .from('conversaciones')
      .select('*')
      .eq('telefono', telefono)
      .order('ts_ultimo_mensaje', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      Logger.error('Error buscando conversacin', { error });
      throw error;
    }

    if (data) return data as Conversacion;

    const contacto = await this.buscarOCrearContacto(telefono, {});

    // Mapear área a inbox_id
    // WSP4 (ADMINISTRACION) usa inbox_id 79828
    // VENTAS1 usa inbox_id 81935
    const inboxIdMap: Partial<Record<Area, number>> = {
      [Area.ADMINISTRACION]: 79828, // WSP4 inbox_id
      [Area.VENTAS1]: 81935,
    };
    const inbox_id = inboxIdMap[area] || null;

    const { data: convData, error: convError } = await supabaseAdmin
      .from('conversaciones')
      .insert({
        contacto_id: contacto.id,
        telefono,
        area,
        numero_origen: numeroOrigen,
        numero_activo: numeroOrigen,
        ts_ultimo_mensaje: new Date().toISOString(),
        estado: 'nueva',
        router_estado: 'menu_principal',
        inbox_id: inbox_id,
      })
      .select()
      .single();

    if (convError) {
      Logger.error('Error creando conversacin', { convError });
      throw convError;
    }

    return convData as Conversacion;
  }
```

**Operaciones**:
1. SELECT en `conversaciones` (busca conversación existente)
2. Si no existe, busca/crea contacto en `contactos`
3. INSERT en `conversaciones` (crea nueva conversación)

### 3.4 Envío de Respuestas

**Archivo**: `router-psi/src/services/CentralTelefonica.ts`

```8:56:router-psi/src/services/CentralTelefonica.ts
async enviarMensaje(conversacionId: string, mensaje: string, area: Area = Area.ADMINISTRACION) {
    Logger.info('[CentralTelefonica] Iniciando envío de mensaje', {
      conversacionId,
      area,
      mensajeLength: mensaje.length,
      mensajePreview: mensaje.substring(0, 100),
    });

    const conversacion = await databaseService.updateConversacion(conversacionId, {});
    Logger.info('[CentralTelefonica] Conversación obtenida', {
      telefono: conversacion.telefono,
      bypass: conversacion.bypass_wsp4,
    });

    const bypass = conversacion.bypass_wsp4;
    const numeroEnvio = bypass ? conversacion.numero_origen || Env.whatsapp.numbers.ventas1 : Env.whatsapp.numbers.wsp4;
    const contexto = bypass ? 'ventas1' : 'wsp4';
    Logger.info('[CentralTelefonica] Configuración de envío', {
      bypass,
      numeroEnvio,
      contexto,
      telefonoDestino: conversacion.telefono,
    });

    Logger.info('[CentralTelefonica] Enviando mensaje vía WhatsApp Service');
    await whatsappService.sendTextMessage({
      to: conversacion.telefono,
      body: mensaje,
      fromContext: contexto as any,
    });
    Logger.info('[CentralTelefonica] Mensaje enviado vía WhatsApp Service exitosamente');

    await databaseService.saveMessage({
      conversacion_id: conversacionId,
      remitente: 'system',
      tipo: 'text',
      mensaje,
      metadata: {
        numero_envio: numeroEnvio,
        area,
      },
    });

    Logger.info('Mensaje del sistema guardado y enviado', {
      conversacionId,
      contexto,
      mensaje: mensaje.substring(0, 50),
    });
  }
```

**Flujo de envío**:
1. Obtiene conversación de Supabase
2. Determina número de envío (WSP4 o VENTAS1 según `bypass_wsp4`)
3. Envía mensaje vía `whatsappService.sendTextMessage()` → POST a WhatsApp Cloud API
4. Guarda mensaje del sistema en Supabase

---

## 4. 🌐 ENDPOINTS DISPONIBLES

### 4.1 Endpoints de Webhook (WhatsApp)

| Método | Ruta | Descripción | Área |
|--------|------|-------------|------|
| `GET` | `/webhook/whatsapp/:inbox` | Verificación de webhook (Meta) | Todas |
| `POST` | `/webhook/whatsapp/wsp4` | Recibe mensajes de WSP4 | ADMINISTRACION |
| `POST` | `/webhook/whatsapp/ventas1` | Recibe mensajes de VENTAS1 | VENTAS1 |
| `POST` | `/webhook/whatsapp/administracion` | Recibe mensajes de Administración | ADMINISTRACION |
| `POST` | `/webhook/whatsapp/alumnos` | Recibe mensajes de Alumnos | ALUMNOS |
| `POST` | `/webhook/whatsapp/comunidad` | Recibe mensajes de Comunidad | COMUNIDAD |

**Verificación de Webhook**:

```5:21:router-psi/src/middleware/auth.ts
export function verifyWebhook(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === Env.verifyToken) {
      Logger.info('Verificacin de webhook exitosa');
      return res.status(200).send(challenge);
    }

    Logger.warn('Intento de verificacin invlido');
    return res.status(403).send('Forbidden');
  }

  next();
}
```

### 4.2 Endpoints de API Interna

| Método | Ruta | Descripción | Body |
|--------|------|-------------|------|
| `POST` | `/api/derivar` | Deriva mensaje a área específica | `{ conversacionId, mensaje, area }` |
| `POST` | `/api/toggle-bypass` | Activa/desactiva bypass de WSP4 | `{ conversacionId, bypass: boolean }` |
| `GET` | `/api/ventana/:conversationId` | Obtiene estado de ventanas 24h/72h | - |

**Ejemplo de derivación**:

```7:18:router-psi/src/routes/api.ts
apiRouter.post('/api/derivar', async (req, res, next) => {
  try {
    const { conversacionId, mensaje, area } = req.body;
    if (!conversacionId || !mensaje) {
      return res.status(400).json({ success: false, error: 'conversacionId y mensaje requeridos' });
    }
    await centralTelefonica.enviarMensaje(conversacionId, mensaje, area);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
```

### 4.3 Endpoint de Health Check

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Verifica que el servidor está activo |

```5:10:router-psi/src/routes/health.ts
healthRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});
```

---

## 5. ⚠️ POSIBLES PROBLEMAS IDENTIFICADOS

### 5.1 Problemas de Configuración

#### ❌ **Problema 1: Archivo .env no encontrado o mal configurado**

**Síntoma**: El Router no inicia o falla al validar variables de entorno.

**Causa**: 
- El archivo `.env` no existe en `router-psi/.env`
- Variables faltantes o incorrectas
- PM2 no está ejecutando desde el directorio correcto

**Solución**:
1. Verificar que existe `router-psi/.env`
2. Validar que todas las variables requeridas están presentes
3. Verificar que PM2 tiene `cwd: __dirname` en `ecosystem.config.cjs`

#### ❌ **Problema 2: Credenciales de Supabase incorrectas**

**Síntoma**: Los datos no se guardan en Supabase, errores 401/403.

**Causa**:
- `SUPABASE_URL` incorrecta
- `SUPABASE_SERVICE_ROLE_KEY` inválida o expirada
- Permisos de RLS (Row Level Security) bloqueando operaciones

**Solución**:
1. Verificar credenciales en Supabase Dashboard → Settings → API
2. Verificar que `SUPABASE_SERVICE_ROLE_KEY` tiene permisos de administrador
3. Revisar políticas RLS en tablas `contactos`, `conversaciones`, `mensajes`

#### ❌ **Problema 3: Token de WhatsApp inválido o expirado**

**Síntoma**: No se pueden enviar mensajes, errores 401/403 de WhatsApp API.

**Causa**:
- `WHATSAPP_TOKEN` expirado o inválido
- Phone IDs incorrectos

**Solución**:
1. Regenerar token en Meta Business Suite
2. Verificar Phone IDs en configuración de WhatsApp

### 5.2 Problemas de Código

#### ⚠️ **Problema 4: Timestamp de mensajes puede fallar**

**Ubicación**: `router-psi/src/services/MessageProcessor.ts:45`

```typescript
timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
```

**Riesgo**: Si `message.timestamp` no es un número válido, `parseInt()` devuelve `NaN`, causando fecha inválida.

**Solución sugerida**:
```typescript
const timestamp = message.timestamp 
  ? new Date(parseInt(message.timestamp) * 1000).toISOString()
  : new Date().toISOString();
```

#### ⚠️ **Problema 5: Falta manejo de errores en operaciones de Supabase**

**Ubicación**: Múltiples lugares en `DatabaseService.ts`

**Riesgo**: Si Supabase está caído o hay problemas de red, el Router puede fallar sin recuperación.

**Solución sugerida**: Implementar retry logic y circuit breaker.

#### ⚠️ **Problema 6: Anti-loop solo en memoria**

**Ubicación**: `router-psi/src/utils/antiloop.ts`

**Riesgo**: Si el Router se reinicia, el cache de anti-loop se pierde, permitiendo mensajes duplicados.

**Solución sugerida**: Usar Supabase para verificar último mensaje en lugar de cache en memoria.

### 5.3 Problemas de Flujo

#### ❌ **Problema 7: Los datos no llegan al CRM**

**Posibles causas**:

1. **El CRM no está leyendo de Supabase correctamente**
   - Verificar que el CRM tiene las credenciales correctas
   - Verificar que el CRM está consultando las tablas correctas
   - Verificar políticas RLS que permitan lectura al CRM

2. **El Router no está guardando correctamente**
   - Revisar logs del Router (`router-psi/logs/router.log`)
   - Verificar errores en `router-psi/logs/errors.log`
   - Verificar que `databaseService.saveMessage()` se ejecuta sin errores

3. **Problemas de sincronización**
   - El Router guarda, pero el CRM no refresca
   - Verificar que el CRM usa Supabase Realtime o polling

**Diagnóstico**:
```bash
# Ver logs del Router
pm2 logs router-psi --lines 100

# Verificar que hay datos en Supabase
# (usar Supabase Dashboard o SQL Editor)
SELECT COUNT(*) FROM mensajes WHERE created_at > NOW() - INTERVAL '1 hour';
SELECT COUNT(*) FROM conversaciones WHERE updated_at > NOW() - INTERVAL '1 hour';
```

---

## 6. 📦 DEPENDENCIES Y PACKAGES

### 6.1 Dependencias Principales

```json
{
  "@supabase/supabase-js": "^2.38.0",    // Cliente Supabase
  "axios": "^1.7.7",                      // HTTP client para WhatsApp API
  "cors": "^2.8.5",                       // CORS middleware
  "dotenv": "^16.4.5",                    // Carga de variables de entorno
  "express": "^4.18.2",                   // Framework web
  "express-rate-limit": "^7.1.5",         // Rate limiting
  "helmet": "^7.1.0",                     // Seguridad HTTP headers
  "joi": "^17.11.0",                      // Validación de schemas
  "morgan": "^1.10.0",                   // HTTP request logger
  "node-cron": "^3.0.3",                  // Tareas programadas (no usado actualmente)
  "winston": "^3.11.0"                    // Logger avanzado
}
```

### 6.2 Versiones Críticas

- **Supabase**: v2.38.0 (compatible con Supabase Cloud)
- **Express**: v4.18.2 (estable)
- **TypeScript**: v5.2.2 (última estable)

---

## 7. 🔍 DIAGNÓSTICO: Por qué los datos no llegan a Supabase

### 7.1 Checklist de Verificación

#### ✅ **Paso 1: Verificar que el Router está corriendo**

```bash
pm2 status
pm2 logs router-psi --lines 50
```

**Buscar**:
- `Router PSI escuchando en puerto 3002` → ✅ OK
- Errores de validación de variables → ❌ Revisar `.env`

#### ✅ **Paso 2: Verificar variables de entorno**

```bash
cd router-psi
cat .env | grep SUPABASE
```

**Debe mostrar**:
- `SUPABASE_URL=https://...`
- `SUPABASE_ANON_KEY=eyJ...`
- `SUPABASE_SERVICE_ROLE_KEY=eyJ...`

#### ✅ **Paso 3: Probar conexión a Supabase**

Crear un script de prueba:

```typescript
// test-supabase.ts
import { supabaseAdmin } from './src/config/supabase';

async function test() {
  const { data, error } = await supabaseAdmin
    .from('conversaciones')
    .select('count')
    .limit(1);
  
  if (error) {
    console.error('❌ Error conectando a Supabase:', error);
  } else {
    console.log('✅ Conexión a Supabase OK');
  }
}

test();
```

#### ✅ **Paso 4: Verificar logs del Router**

```bash
tail -f router-psi/logs/router.log | grep -i "supabase\|error\|guardado"
```

**Buscar**:
- `Mensaje guardado en Supabase` → ✅ OK
- `Error guardando mensaje` → ❌ Revisar error específico

#### ✅ **Paso 5: Verificar datos en Supabase**

En Supabase Dashboard → Table Editor:
- Verificar que hay registros en `mensajes`
- Verificar que hay registros en `conversaciones`
- Verificar timestamps recientes

#### ✅ **Paso 6: Verificar que el CRM lee de Supabase**

En el CRM (puerto 3000/3001):
- Verificar credenciales de Supabase
- Verificar que está consultando tablas correctas
- Verificar políticas RLS

### 7.2 Errores Comunes y Soluciones

#### **Error: "Error validando variables de entorno"**

**Causa**: Faltan variables requeridas en `.env`

**Solución**: Completar todas las variables según `CONFIGURAR-VARIABLES-ROUTER-PSI.md`

#### **Error: "Error guardando mensaje" con código 401/403**

**Causa**: `SUPABASE_SERVICE_ROLE_KEY` inválida o RLS bloqueando

**Solución**: 
1. Regenerar service role key en Supabase
2. Verificar políticas RLS permiten INSERT con service role

#### **Error: "Error buscando conversación"**

**Causa**: Problema de conexión a Supabase o tabla no existe

**Solución**:
1. Verificar que la tabla `conversaciones` existe
2. Verificar conexión a internet
3. Verificar URL de Supabase

---

## 8. 🔧 RECOMENDACIONES DE MEJORA

### 8.1 Mejoras Inmediatas

1. **Agregar retry logic para operaciones de Supabase**
   - Reintentar 3 veces con backoff exponencial
   - Loggear errores persistentes

2. **Mejorar manejo de timestamps**
   - Validar formato antes de parsear
   - Usar fallback a fecha actual si inválido

3. **Agregar health check de Supabase**
   - Endpoint `/health/supabase` que verifica conexión
   - Usar en monitoreo

4. **Mejorar logging**
   - Agregar correlation IDs para rastrear mensajes
   - Loggear todos los errores de Supabase con contexto

### 8.2 Mejoras a Mediano Plazo

1. **Mover anti-loop a Supabase**
   - Consultar último mensaje en DB en lugar de cache en memoria
   - Más confiable ante reinicios

2. **Implementar circuit breaker**
   - Detectar cuando Supabase está caído
   - Degradar gracefully

3. **Agregar métricas**
   - Contador de mensajes procesados
   - Tiempo de respuesta
   - Errores por tipo

4. **Mejorar validación de payloads**
   - Validar estructura completa antes de procesar
   - Rechazar payloads malformados temprano

---

## 9. 📊 RESUMEN DE CONEXIONES

### 9.1 Conexiones Entrantes (Router recibe)

| Origen | Protocolo | Endpoint | Propósito |
|--------|-----------|----------|-----------|
| WhatsApp Cloud API | HTTPS POST | `/webhook/whatsapp/*` | Recibir mensajes |
| Meta (verificación) | HTTPS GET | `/webhook/whatsapp/:inbox` | Verificar webhook |
| CRM (interno) | HTTPS POST | `/api/derivar` | Derivar mensajes |
| CRM (interno) | HTTPS POST | `/api/toggle-bypass` | Activar bypass |

### 9.2 Conexiones Salientes (Router envía)

| Destino | Protocolo | Método | Propósito |
|---------|-----------|--------|-----------|
| Supabase | HTTPS | INSERT/UPDATE | Guardar datos |
| WhatsApp Cloud API | HTTPS POST | `/v21.0/{phone_id}/messages` | Enviar mensajes |
| n8n (futuro) | HTTPS POST | Webhooks configurados | Derivar a áreas |

### 9.3 Flujo Completo de Datos

```
WhatsApp → Router (3002) → Supabase → CRM (3000/3001)
   ↓            ↓              ↓
Webhook    Procesa        Guarda      Lee
   ↓            ↓              ↓
           Envía respuesta
           (WhatsApp API)
```

---

## 10. ✅ CHECKLIST DE VERIFICACIÓN

### Configuración
- [ ] Archivo `.env` existe en `router-psi/.env`
- [ ] Todas las variables requeridas están presentes
- [ ] `SUPABASE_URL` es correcta
- [ ] `SUPABASE_SERVICE_ROLE_KEY` es válida
- [ ] `WHATSAPP_TOKEN` es válido
- [ ] Phone IDs están correctos

### Servidor
- [ ] Router está corriendo en puerto 3002
- [ ] PM2 está gestionando el proceso
- [ ] Logs se están generando correctamente
- [ ] Health check responde en `/health`

### Supabase
- [ ] Tablas `contactos`, `conversaciones`, `mensajes` existen
- [ ] Políticas RLS permiten operaciones con service role
- [ ] Se pueden insertar datos manualmente desde Supabase Dashboard

### WhatsApp
- [ ] Webhooks configurados en Meta Business Suite
- [ ] URLs de webhook apuntan a `https://tu-dominio.com/webhook/whatsapp/*`
- [ ] Verify token coincide con `WEBHOOK_VERIFY_TOKEN`

### Flujo
- [ ] Mensaje de prueba llega al Router
- [ ] Mensaje se guarda en Supabase
- [ ] Conversación se crea/actualiza en Supabase
- [ ] Respuesta se envía vía WhatsApp
- [ ] CRM puede leer los datos de Supabase

---

## 📝 CONCLUSIÓN

El Router PSI está **bien estructurado** y sigue buenas prácticas:
- ✅ Separación de responsabilidades
- ✅ Validación de datos
- ✅ Logging detallado
- ✅ Manejo de errores
- ✅ TypeScript para type safety

**Problemas principales identificados**:
1. ⚠️ Falta verificación de que `.env` está correctamente configurado
2. ⚠️ No hay retry logic para operaciones de Supabase
3. ⚠️ Anti-loop solo en memoria (se pierde al reiniciar)
4. ⚠️ Falta validación robusta de timestamps

**Para diagnosticar por qué los datos no llegan a Supabase**:
1. Revisar logs del Router (`router-psi/logs/router.log`)
2. Verificar credenciales de Supabase
3. Probar conexión manual a Supabase
4. Verificar que el Router está guardando (buscar "Mensaje guardado en Supabase" en logs)
5. Verificar que el CRM está leyendo correctamente

¿Quieres que profundice en algún aspecto específico o que cree scripts de diagnóstico?

