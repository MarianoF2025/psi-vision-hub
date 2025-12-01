# 📝 Guía: Agregar Webhooks al archivo .env

## Ubicación del archivo

El archivo `.env` debe estar en: `centralwap-router/.env`

## Variables a agregar

Agrega estas 5 líneas al final del archivo `.env`:

```env
# ============================================
# WEBHOOKS N8N PARA NOTIFICAR A INBOXS
# ============================================

# Webhook para inbox de Administración
N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION=TU_URL_AQUI

# Webhook para inbox de Alumnos  
N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS=TU_URL_AQUI

# Webhook para inbox de Ventas/Inscripciones
N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1=TU_URL_AQUI

# Webhook para inbox de Comunidad
N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD=TU_URL_AQUI

# Webhook para CRM
N8N_WEBHOOK_ENVIOS_ROUTER_CRM=TU_URL_AQUI
```

## Formato

- **Sin espacios** alrededor del signo `=`
- **URLs completas** con `https://`
- **Una variable por línea**
- **Sin comillas** alrededor de las URLs

## Ejemplo

```env
N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION=https://webhookn8n.psivisionhub.com/webhook/administracion
N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS=https://webhookn8n.psivisionhub.com/webhook/alumnos
N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1=https://webhookn8n.psivisionhub.com/webhook/ventas
N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD=https://webhookn8n.psivisionhub.com/webhook/comunidad
N8N_WEBHOOK_ENVIOS_ROUTER_CRM=https://webhookn8n.psivisionhub.com/webhook/crm
```

## Después de agregar

1. **Guardar el archivo** `.env`
2. **Reiniciar el servidor** si está corriendo:
   ```bash
   npm run dev
   # o
   npm start
   ```
3. **Verificar en logs** que se cargaron las variables

## Verificación

Los logs al iniciar deberían mostrar si los webhooks están configurados (sin mostrar las URLs completas por seguridad).

---

## 🔄 Webhooks para Procesar Derivaciones (Nuevo)

**IMPORTANTE:** El Router ahora usa webhooks n8n para procesar derivaciones en lugar de actualizar Supabase directamente. Esto asegura que los workflows n8n procesen las derivaciones y actualicen el CRM correctamente.

### Variables requeridas

```env
# ============================================
# WEBHOOKS N8N PARA PROCESAR DERIVACIONES
# ============================================
# Webhooks que el Router llama para procesar derivaciones
# n8n procesa la derivación, actualiza Supabase y notifica al CRM

# Webhook para procesar derivaciones a Administración
N8N_WEBHOOK_INGESTA_ROUTER_ADMINISTRACION=TU_URL_AQUI

# Webhook para procesar derivaciones a Alumnos
N8N_WEBHOOK_INGESTA_ROUTER_ALUMNOS=TU_URL_AQUI

# Webhook para procesar derivaciones a Ventas
N8N_WEBHOOK_INGESTA_ROUTER_VENTAS=TU_URL_AQUI

# Webhook para procesar derivaciones a Comunidad
N8N_WEBHOOK_INGESTA_ROUTER_COMUNIDAD=TU_URL_AQUI

# Webhook por defecto (WSP4) - usado cuando no hay webhook específico
N8N_WEBHOOK_INGESTA_ROUTER_WSP4=TU_URL_AQUI
```

### Flujo de Derivaciones

1. **Router detecta derivación** (ej: usuario selecciona opción 3 - Inscripciones)
2. **Router crea ticket y derivación** en Supabase
3. **Router llama webhook n8n** correspondiente al área destino
4. **n8n procesa la derivación**:
   - Actualiza la conversación en Supabase (campo `area`, `estado`, etc.)
   - Notifica al inbox del CRM correspondiente
   - Aplica etiquetas (`24hs` para Ventas)
5. **CRM muestra la conversación** en el inbox correcto

### Ejemplo de payload enviado a webhook

```json
{
  "conversacion_id": "uuid-de-conversacion",
  "telefono": "+5491134567890",
  "area": "ventas",
  "area_origen": "wsp4",
  "area_destino": "ventas",
  "ticket_id": "20240115-143022-ABC1",
  "derivacion_id": "uuid-de-derivacion",
  "subetiqueta": null,
  "motivo": "menu_selection",
  "etiqueta": "24hs",
  "accion": "derivacion",
  "numero_derivaciones": 1,
  "timestamp": "2024-01-15T14:30:22.000Z",
  "metadata": {
    "source": "centralwap-router",
    "request_id": "req_1234567890"
  }
}
```

### Nota Importante

Estos webhooks son **diferentes** de los webhooks de ingesta documentados en `INGESTA-N8N-IMPLEMENTACION.md`. 

- **Webhooks de ingesta** (`/webhook/router/:area/incoming`): N8N → Router (para recibir mensajes)
- **Webhooks de derivaciones** (estos): Router → N8N (para procesar derivaciones)

Ambos tipos de webhooks son necesarios para el funcionamiento completo del sistema.