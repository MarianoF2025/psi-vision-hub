# Configurar Variables de Entorno para Router PSI

## Problema

El router-psi está fallando porque no encuentra las variables de entorno requeridas. El proceso entra en un loop de reinicios.

## Solución

Necesitas crear un archivo `.env` en el directorio `router-psi/` con todas las variables requeridas.

### 1. Crear archivo .env

```bash
cd /opt/psi-vision-hub/router-psi
nano .env
```

### 2. Variables Requeridas

Copia y completa este template con tus valores reales:

```bash
# Servidor
NODE_ENV=production
PORT=3002
LOG_LEVEL=info
ANTILOOP_MINUTES=15

# Seguridad
WEBHOOK_VERIFY_TOKEN=tu_token_aqui

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_STORAGE_BUCKET_AUDIOS=audios
SUPABASE_STORAGE_BUCKET_DOCUMENTOS=documentos

# WhatsApp Cloud API
WHATSAPP_TOKEN=tu_whatsapp_token
CLOUD_API_BASE_URL=https://graph.facebook.com/v21.0
WSP4_PHONE_ID=tu_phone_id_wsp4
VENTAS1_PHONE_ID=tu_phone_id_ventas1
ADMIN_PHONE_ID=tu_phone_id_admin
ALUMNOS_PHONE_ID=tu_phone_id_alumnos
COMUNIDAD_PHONE_ID=tu_phone_id_comunidad
WSP4_NUMBER=5491156090819
VENTAS1_NUMBER=tu_numero_ventas1

# Webhooks n8n
N8N_WEBHOOK_ENVIOS_ROUTER_CRM=https://tu-n8n.com/webhook/crm
N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION=https://tu-n8n.com/webhook/admin
N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS=https://tu-n8n.com/webhook/alumnos
N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD=https://tu-n8n.com/webhook/comunidad
N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1=https://tu-n8n.com/webhook/ventas1
```

### 3. Verificar que el archivo existe

```bash
ls -la /opt/psi-vision-hub/router-psi/.env
```

### 4. Reiniciar router-psi

```bash
pm2 delete router-psi
cd /opt/psi-vision-hub/router-psi
pm2 start ecosystem.config.cjs --env production
pm2 logs router-psi --lines 50
```

## Nota Importante

- El archivo `.env` NO debe estar en Git (ya está en .gitignore)
- Asegúrate de usar los valores correctos de tu entorno
- Si las variables ya están en el sistema, PM2 las cargará automáticamente
- El `ecosystem.config.cjs` ahora carga el `.env` automáticamente si existe

## Verificar que funciona

Después de crear el `.env` y reiniciar, deberías ver en los logs:

```
Router PSI escuchando en puerto 3002
```

En lugar de errores de validación.

