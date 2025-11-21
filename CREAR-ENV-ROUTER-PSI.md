# Crear .env para Router PSI desde .env.local existente

## Situación Actual

- ✅ Existe: `/opt/psi-vision-hub/.env.local` (raíz del proyecto)
- ❌ Falta: `/opt/psi-vision-hub/router-psi/.env` (router-psi)

## Solución

### Opción 1: Ver .env.local y crear .env para router-psi

```bash
# 1. Ver el contenido de .env.local
cat /opt/psi-vision-hub/.env.local

# 2. Crear .env en router-psi basado en .env.local
cd /opt/psi-vision-hub/router-psi
nano .env
```

### Variables que necesitas en router-psi/.env

Basándote en `.env.local`, necesitas estas variables (con nombres adaptados):

```bash
# Servidor
NODE_ENV=production
PORT=3002
LOG_LEVEL=info
ANTILOOP_MINUTES=15

# Seguridad
WEBHOOK_VERIFY_TOKEN=valor_de_WHATSAPP_VERIFY_TOKEN_del_env.local

# Supabase (mismos valores que en .env.local)
SUPABASE_URL=valor_de_NEXT_PUBLIC_SUPABASE_URL
SUPABASE_ANON_KEY=valor_de_NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=valor_de_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET_AUDIOS=audios
SUPABASE_STORAGE_BUCKET_DOCUMENTOS=documentos

# WhatsApp Cloud API
WHATSAPP_TOKEN=valor_de_CLOUD_API_TOKEN
CLOUD_API_BASE_URL=valor_de_CLOUD_API_BASE_URL
WSP4_PHONE_ID=valor_de_CLOUD_API_PHONE_NUMBER_ID
VENTAS1_PHONE_ID=valor_si_existe
ADMIN_PHONE_ID=valor_si_existe
ALUMNOS_PHONE_ID=valor_si_existe
COMUNIDAD_PHONE_ID=valor_si_existe
WSP4_NUMBER=5491156090819
VENTAS1_NUMBER=valor_si_existe

# Webhooks n8n
N8N_WEBHOOK_ENVIOS_ROUTER_CRM=valor_de_N8N_WEBHOOK_ENVIOS_ROUTER_CRM
N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION=valor_de_N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION
N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS=valor_de_N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS
N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD=valor_de_N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD
N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1=valor_de_N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1
```

### Opción 2: Script para extraer variables

Puedes crear un script que extraiga las variables necesarias de `.env.local`:

```bash
cd /opt/psi-vision-hub/router-psi

# Crear .env desde .env.local
cat > .env << 'EOF'
NODE_ENV=production
PORT=3002
LOG_LEVEL=info
ANTILOOP_MINUTES=15
EOF

# Agregar variables de .env.local (necesitas ajustar los nombres)
grep "NEXT_PUBLIC_SUPABASE_URL" /opt/psi-vision-hub/.env.local | sed 's/NEXT_PUBLIC_//' >> .env
grep "SUPABASE_SERVICE_ROLE_KEY" /opt/psi-vision-hub/.env.local >> .env
grep "CLOUD_API_TOKEN" /opt/psi-vision-hub/.env.local | sed 's/CLOUD_API_TOKEN/WHATSAPP_TOKEN/' >> .env
# ... etc
```

## Pasos Recomendados

1. **Ver .env.local:**
   ```bash
   cat /opt/psi-vision-hub/.env.local
   ```

2. **Crear .env en router-psi manualmente** con los valores correctos

3. **Verificar que se creó:**
   ```bash
   ls -la /opt/psi-vision-hub/router-psi/.env
   ```

4. **Reiniciar router-psi:**
   ```bash
   pm2 delete router-psi
   cd /opt/psi-vision-hub/router-psi
   pm2 start ecosystem.config.cjs --env production
   ```

