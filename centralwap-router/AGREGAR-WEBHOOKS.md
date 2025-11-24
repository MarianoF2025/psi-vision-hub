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