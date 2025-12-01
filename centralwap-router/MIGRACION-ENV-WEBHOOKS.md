# Variables de Entorno para Webhooks de N8N

## Variables Requeridas para Inboxs

Agregar estas variables al archivo `.env`:

```env
# Webhooks N8N para notificar a inboxs
N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION=https://tu-n8n.com/webhook/administracion
N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS=https://tu-n8n.com/webhook/alumnos
N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1=https://tu-n8n.com/webhook/ventas
N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD=https://tu-n8n.com/webhook/comunidad
N8N_WEBHOOK_ENVIOS_ROUTER_CRM=https://tu-n8n.com/webhook/crm
```

## Formato del Payload Enviado

El servicio `InboxNotifierService` envía el siguiente payload a los webhooks:

```json
{
  "conversacion_id": "uuid",
  "telefono": "+5491134567890",
  "mensaje": "Texto del mensaje",
  "area": "ventas",
  "tipo": "derivacion" | "mensaje_proxy" | "mensaje_normal",
  "timestamp": "2025-11-22T13:00:00Z",
  "ticket_id": "20251122-143052-A3F2",
  "derivacion_id": "uuid",
  "metadata": {
    "source": "centralwap-router",
    "proxy_activo": true
  }
}
```

## Cuándo se Envían Notificaciones

1. **Al crear derivación**: Se notifica al inbox correspondiente
2. **Con proxy activo**: Cada mensaje entrante se notifica al inbox del área proxy







