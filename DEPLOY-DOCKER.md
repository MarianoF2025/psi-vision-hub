# Deployment PSI Vision Hub Router - Docker Swarm + Traefik

## Arquitectura

- **Next.js App** → Contenedor Docker en Swarm
- **Traefik** → Detecta automáticamente por labels
- **Red `public`** → Red compartida entre servicios

## Prerrequisitos

1. Docker Swarm inicializado
2. Traefik corriendo en Swarm
3. Red `public` creada (overlay, attachable)
4. Archivo `.env.local` con todas las variables

## Pasos de Deployment

### 1. Preparar variables de entorno

Asegúrate de tener `.env.local` con todas las variables necesarias:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# WhatsApp Cloud API
CLOUD_API_TOKEN=...
CLOUD_API_BASE_URL=...
CLOUD_API_PHONE_NUMBER_ID=...

# Webhooks n8n (todos los que necesites)
N8N_WEBHOOK_ENVIOS_ROUTER_CRM=...
# ... etc
```

### 2. Construir y desplegar

```bash
# Opción A: Usar script automático
chmod +x deploy-docker.sh
./deploy-docker.sh

# Opción B: Manual
docker build -t psi-vision-hub-router:latest .
docker stack deploy -c docker-compose.router.yml psi-router
```

### 3. Verificar deployment

```bash
# Ver servicios
docker service ls | grep psi-router

# Ver logs
docker service logs -f psi-router_psi-router

# Verificar que Traefik lo detectó
docker service logs psi-traefik_traefik --tail 50 | grep router-psi

# Probar endpoint
curl https://router.psivisionhub.com/api/router/whatsapp/webhook
```

## Ventajas de esta solución

✅ **Consistencia**: Todo en Docker Swarm  
✅ **Automático**: Traefik detecta por labels  
✅ **Mantenible**: Un solo comando para deploy  
✅ **Escalable**: Fácil escalar réplicas  
✅ **Sin proxies intermedios**: Directo desde Traefik  

## Comandos útiles

### Actualizar después de cambios

```bash
# Rebuild imagen
docker build -t psi-vision-hub-router:latest .

# Actualizar servicio
docker service update --image psi-vision-hub-router:latest psi-router_psi-router
```

### Ver logs

```bash
docker service logs -f psi-router_psi-router
```

### Escalar servicio

```bash
docker service scale psi-router_psi-router=2
```

### Eliminar stack

```bash
docker stack rm psi-router
```

## Troubleshooting

### El servicio no aparece en Traefik

1. Verifica que la red `public` existe:
   ```bash
   docker network ls | grep public
   ```

2. Verifica que el servicio está en la red:
   ```bash
   docker service inspect psi-router_psi-router --format '{{json .Spec.TaskTemplate.Networks}}'
   ```

3. Verifica labels:
   ```bash
   docker service inspect psi-router_psi-router --format '{{json .Spec.Labels}}'
   ```

### Error de conexión

1. Verifica logs del servicio:
   ```bash
   docker service logs psi-router_psi-router
   ```

2. Verifica variables de entorno:
   ```bash
   docker service inspect psi-router_psi-router --format '{{json .Spec.TaskTemplate.ContainerSpec.Env}}'
   ```

### SSL no funciona

1. Verifica que el dominio apunta al servidor
2. Verifica logs de Let's Encrypt en Traefik
3. Verifica que `certresolver=letsencrypt` está configurado en Traefik

