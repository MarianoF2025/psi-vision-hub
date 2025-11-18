# Deploy PSI Vision Hub Router - Docker Swarm + Traefik

## Prerrequisitos

- Docker Swarm inicializado
- Traefik v3.0 desplegado y funcionando
- Red `public` creada y externa
- Variables de entorno configuradas

## Paso 1: Preparar variables de entorno

Crea un archivo `.env` en el directorio del proyecto con todas las variables necesarias:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://rbtczzjlvnymylkvcwdv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# WhatsApp Cloud API
CLOUD_API_TOKEN=tu_token
CLOUD_API_BASE_URL=https://graph.facebook.com/v24.0
CLOUD_API_PHONE_NUMBER_ID=809951985523815
WHATSAPP_VERIFY_TOKEN=router-psi-verify-token

# Webhooks n8n (agregar todos los que necesites)
N8N_WEBHOOK_ENVIOS_ROUTER_CRM=https://webhookn8n.psivisionhub.com/webhook/crm/enviar_mensaje
# ... resto de webhooks
```

## Paso 2: Build de la imagen Docker

```bash
docker build -t psi-vision-hub-router:latest .
```

## Paso 3: Verificar red pública

```bash
docker network ls | grep public
```

Si no existe, créala:
```bash
docker network create --driver overlay --attachable public
```

## Paso 4: Deploy en Docker Swarm

```bash
docker stack deploy -c docker-compose.router.yml psi-router
```

## Paso 5: Verificar deployment

```bash
# Ver servicios del stack
docker stack services psi-router

# Ver logs
docker service logs -f psi-router_psi-router

# Verificar que el contenedor está corriendo
docker ps | grep psi-router
```

## Paso 6: Verificar Traefik

```bash
# Verificar que Traefik detectó el servicio
docker service logs traefik | grep router-psi

# Probar el endpoint
curl -H "Host: router.psivisionhub.com" http://localhost/api/router/whatsapp/webhook
```

## Paso 7: Verificar SSL

Accede a: `https://router.psivisionhub.com/api/router/whatsapp/webhook`

Debería responder con un error 400 (esperado sin payload) o el challenge de verificación.

## Comandos útiles

### Actualizar el stack después de cambios
```bash
# Rebuild imagen
docker build -t psi-vision-hub-router:latest .

# Actualizar stack
docker service update --image psi-vision-hub-router:latest psi-router_psi-router
```

### Ver logs en tiempo real
```bash
docker service logs -f psi-router_psi-router
```

### Escalar servicio (si es necesario)
```bash
docker service scale psi-router_psi-router=2
```

### Eliminar stack
```bash
docker stack rm psi-router
```

## Troubleshooting

### El servicio no aparece en Traefik
- Verifica que la red `public` sea externa y accesible
- Revisa los logs de Traefik: `docker service logs traefik`
- Verifica que los labels estén correctos: `docker service inspect psi-router_psi-router`

### Error de conexión
- Verifica que el puerto 3001 esté accesible internamente
- Revisa los logs del servicio: `docker service logs psi-router_psi-router`
- Verifica variables de entorno: `docker service inspect psi-router_psi-router`

### SSL no funciona
- Verifica que el dominio `router.psivisionhub.com` apunte al servidor
- Revisa logs de Let's Encrypt en Traefik
- Verifica que el certresolver `letsencrypt` esté configurado en Traefik

## Arquitectura final

```
WhatsApp Cloud API
    ↓
n8n Workflow
    ↓
Traefik (router.psivisionhub.com)
    ↓
PSI Router (Next.js en Docker)
    ↓
Supabase CRM
```

