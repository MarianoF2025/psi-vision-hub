# Arquitectura General - Centralwap

**Versión:** 1.0  
**Última actualización:** 3 de Enero 2025

---

## 1. Visión General

Centralwap es una plataforma de gestión de comunicaciones WhatsApp compuesta por múltiples servicios que trabajan en conjunto.

### 1.1 Principio Fundamental

> **"Por donde entra, sale"**
>
> Un mensaje que entra por una línea WhatsApp siempre sale por esa misma línea, independientemente del área o agente que lo atienda.

### 1.2 Diagrama de Alto Nivel
```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIOS                                │
│              (Web, Orgánico, Meta Ads CTWA)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
     ┌─────────────────┐         ┌─────────────────┐
     │  WhatsApp Cloud │         │  Evolution API  │
     │   API (Meta)    │         │   (Baileys)     │
     └────────┬────────┘         └────────┬────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
              ┌─────────────────────────────┐
              │          n8n                │
              │    (Workflows/Webhooks)     │
              └─────────────┬───────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    Router     │   │     CRM       │   │  Automations  │
│    :3002      │   │    :3001      │   │    :3003      │
│   Express     │   │   Next.js     │   │   Express     │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
              ┌─────────────────────────────┐
              │         Supabase            │
              │   PostgreSQL + Storage      │
              └─────────────────────────────┘
```

---

## 2. Componentes del Sistema

### 2.1 CRM (Puerto 3001)

| Atributo | Valor |
|----------|-------|
| **Tecnología** | Next.js 14 + TypeScript |
| **Puerto** | 3001 |
| **PM2** | psi-vision-hub |
| **Path** | /opt/psi-vision-hub |

**Responsabilidades:**
- Interfaz de usuario para agentes
- Envío de mensajes (vía n8n)
- Gestión de contactos
- Estadísticas y reportes
- Configuración de respuestas rápidas

### 2.2 Router (Puerto 3002)

| Atributo | Valor |
|----------|-------|
| **Tecnología** | Express.js + TypeScript |
| **Puerto** | 3002 |
| **PM2** | psi-router |
| **Path** | /opt/psi-vision-hub/centralwap-router |

**Responsabilidades:**
- Recibir mensajes de n8n
- Procesar menús interactivos (IVR)
- Derivar a áreas según selección
- Crear/actualizar contactos y conversaciones
- Gestionar ventanas de tiempo

### 2.3 Automations (Puerto 3003)

| Atributo | Valor |
|----------|-------|
| **Tecnología** | Express.js + TypeScript |
| **Puerto** | 3003 |
| **PM2** | psi-automations |
| **Path** | /opt/psi-vision-hub/centralwap-automations |

**Responsabilidades:**
- Menús Click-to-WhatsApp (CTWA)
- Configuración de cursos/productos
- Estadísticas CTR por opción
- Autorespuestas

### 2.4 n8n (Puerto 5678)

| Atributo | Valor |
|----------|-------|
| **Tecnología** | n8n |
| **Puerto** | 5678 |
| **Dominio** | webhookn8n.dominio.com |

**Responsabilidades:**
- Recibir webhooks de WhatsApp
- Normalizar payloads
- Subir multimedia a Storage
- Enviar mensajes a WhatsApp
- Orquestar flujos entre componentes

---

## 3. APIs de WhatsApp

### 3.1 WhatsApp Cloud API (Meta)

**Usado por:** Líneas principales (Router, Ventas)

| Característica | Valor |
|----------------|-------|
| Ventana estándar | 24 horas |
| Ventana CTWA | 72 horas |
| Templates | Requieren aprobación |
| Costo | Por conversación/template |

### 3.2 Evolution API

**Usado por:** Líneas secundarias (Admin, Alumnos, Comunidad)

| Característica | Valor |
|----------------|-------|
| Ventana | Sin límite |
| Templates | No requeridos |
| Costo | Gratis |
| Estabilidad | Menor que Cloud API |

### 3.3 Extracción de Teléfono (Evolution)
```javascript
// Jerarquía correcta para extraer teléfono
let telefonoRaw = null;

// 1. remoteJidAlt con @s.whatsapp.net
if (key.remoteJidAlt?.includes('@s.whatsapp.net')) {
  telefonoRaw = key.remoteJidAlt;
}
// 2. sender
else if (data.sender?.includes('@s.whatsapp.net')) {
  telefonoRaw = data.sender;
}
// 3. remoteJid (último recurso)
else if (key.remoteJid?.includes('@s.whatsapp.net')) {
  telefonoRaw = key.remoteJid;
}

// NUNCA usar @lid (ID interno)
const telefono = '+' + telefonoRaw.replace('@s.whatsapp.net', '');
```

---

## 4. Base de Datos

### 4.1 Supabase

| Atributo | Valor |
|----------|-------|
| **Motor** | PostgreSQL |
| **Features** | Realtime, Storage, Auth |
| **SDK** | @supabase/supabase-js |

### 4.2 Tablas Principales

**contactos**
```sql
- id (UUID, PK)
- telefono (TEXT, UNIQUE)
- nombre (TEXT)
- email (TEXT)
- origen (TEXT)
- tipo (TEXT)
- estado (TEXT)
- created_at, updated_at
```

**conversaciones**
```sql
- id (UUID, PK)
- contacto_id (UUID, FK)
- telefono (TEXT)
- nombre (TEXT)
- linea_origen (TEXT)
- area (TEXT)
- estado (TEXT)
- ultimo_mensaje (TEXT)
- ts_ultimo_mensaje (TIMESTAMPTZ)
- asignado_a (TEXT)
- asignado_nombre (TEXT)
- desconectado_wsp4 (BOOLEAN)
- inbox_fijo (TEXT)
```

**mensajes**
```sql
- id (UUID, PK)
- conversacion_id (UUID, FK)
- whatsapp_message_id (TEXT)
- mensaje (TEXT)
- tipo (TEXT)
- direccion (TEXT) -- 'entrante' o 'saliente'
- media_url (TEXT)
- media_type (TEXT)
- remitente_tipo (TEXT)
- remitente_nombre (TEXT)
- timestamp (TIMESTAMPTZ)
```

### 4.3 Valores Estandarizados

**direccion:**
- `entrante` - Del usuario al sistema
- `saliente` - Del sistema al usuario

**linea_origen / inbox_fijo:**
- `wsp4` - Router principal
- `ventas` - Línea de ventas
- `administracion` - Línea administrativa
- `alumnos` - Línea de alumnos
- `comunidad` - Línea comunidad

---

## 5. Flujos de Datos

### 5.1 Mensaje Entrante
```
Usuario envía mensaje
        ↓
WhatsApp API (Cloud/Evolution)
        ↓
Webhook n8n
        ↓
Normalizar payload
        ↓
¿Es multimedia? → Sí → Subir a Storage
        ↓
POST /router/webhook
        ↓
Router procesa:
  - Buscar/crear contacto
  - Buscar/crear conversación
  - Guardar mensaje
  - ¿Menú activo? → Procesar selección
        ↓
Supabase Realtime
        ↓
CRM actualiza UI
```

### 5.2 Mensaje Saliente
```
Agente escribe en CRM
        ↓
POST /api/mensajes/enviar
        ↓
Determinar webhook según linea_origen
        ↓
n8n recibe
        ↓
¿Qué API usar?
  - Cloud API → Enviar vía Meta
  - Evolution → Enviar vía Evolution
        ↓
Guardar mensaje en Supabase
        ↓
Confirmar al CRM
```

### 5.3 Derivación
```
Usuario selecciona área en menú
        ↓
Router detecta selección
        ↓
Actualizar conversación:
  - area = área seleccionada
  - estado = 'derivada'
        ↓
Crear ticket
        ↓
Registrar en audit_log
        ↓
Enviar mensaje confirmación
```

---

## 6. Estructura de Archivos
```
/opt/psi-vision-hub/
├── src/                          # CRM (Next.js)
│   ├── app/
│   │   ├── api/
│   │   │   ├── mensajes/enviar/
│   │   │   ├── mensajes/reaccion/
│   │   │   └── audio/convert/
│   │   └── crm/
│   │       ├── page.tsx
│   │       ├── contactos/
│   │       ├── estadisticas/
│   │       └── ...
│   ├── components/crm/
│   └── lib/
├── centralwap-router/            # Router
│   ├── src/
│   │   ├── index.ts
│   │   ├── core/
│   │   ├── services/
│   │   └── config/
│   └── dist/
├── centralwap-automations/       # Automations
│   ├── src/
│   │   ├── index.ts
│   │   ├── controllers/
│   │   └── services/
│   └── dist/
└── docs/                         # Documentación
```

---

## 7. Variables de Entorno

### 7.1 CRM (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

N8N_WEBHOOK_ENVIO_WSP4=https://webhookn8n.dominio.com/webhook/wsp4/enviar
N8N_WEBHOOK_ENVIO_VENTAS=https://webhookn8n.dominio.com/webhook/ventas/enviar
N8N_WEBHOOK_ENVIO_ADMIN=https://webhookn8n.dominio.com/webhook/admin/enviar
```

### 7.2 Router (.env)
```env
PORT=3002
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
WHATSAPP_VERIFY_TOKEN=xxx
```

### 7.3 Automations (.env)
```env
PORT=3003
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
WHATSAPP_ACCESS_TOKEN=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx
```

---

## 8. Comandos de Operación

### 8.1 PM2
```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs psi-router --lines 100
pm2 logs psi-vision-hub --lines 100
pm2 logs psi-automations --lines 100

# Reiniciar
pm2 restart psi-router
pm2 restart psi-vision-hub
pm2 restart psi-automations

# Reiniciar todos
pm2 restart all
```

### 8.2 Recompilar TypeScript
```bash
# Router
cd /opt/psi-vision-hub/centralwap-router
npm run build
pm2 restart psi-router

# Automations
cd /opt/psi-vision-hub/centralwap-automations
npm run build
pm2 restart psi-automations

# CRM
cd /opt/psi-vision-hub
npm run build
pm2 restart psi-vision-hub
```

---

## 9. Troubleshooting

### 9.1 Mensajes no llegan al CRM

1. Verificar logs de n8n
2. Verificar logs del Router: `pm2 logs psi-router`
3. Verificar conexión a Supabase
4. Verificar webhook está activo

### 9.2 Mensajes no se envían

1. Verificar logs del CRM: `pm2 logs psi-vision-hub`
2. Verificar workflow de envío en n8n
3. Verificar token de WhatsApp no expiró
4. Verificar ventana de 24h no expiró

### 9.3 Error teléfono inválido (Evolution)

- Verificar que no se usa `@lid`
- Usar jerarquía correcta de extracción

### 9.4 Menú no aparece

1. Verificar `router_estado` de la conversación
2. Verificar configuración en `interactive-menus.ts`
3. Reiniciar Router
