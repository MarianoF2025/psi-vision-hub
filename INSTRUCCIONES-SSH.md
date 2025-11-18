# Instrucciones SSH - Configurar Router PSI

## ✅ Estado actual
- ✅ Build completado exitosamente
- ✅ App compilada en `/opt/psi-vision-hub`
- ⚠️ Falta configurar Traefik para `router.psivisionhub.com`

## Paso 1: Iniciar aplicación con PM2

```bash
cd /opt/psi-vision-hub
pm2 delete psi-vision-hub  # Si existe
pm2 start "npm run start -- -p 3001" --name psi-vision-hub
pm2 save
pm2 logs psi-vision-hub --lines 50  # Verificar que está corriendo sin errores
```

**Verificar que responde:**
```bash
curl http://localhost:3001/api/router/whatsapp/webhook
# Debería responder (aunque sea un error 400, significa que funciona)
```

## Paso 2: Configurar Traefik

### Opción A: Usar script automático (Recomendado)

```bash
# Copiar script al servidor (desde tu máquina local)
scp setup-traefik-router.sh root@161.97.136.77:/tmp/

# En el servidor, ejecutar:
chmod +x /tmp/setup-traefik-router.sh
/tmp/setup-traefik-router.sh
```

### Opción B: Configuración manual

**1. Crear archivo de configuración dinámica:**

```bash
mkdir -p /etc/traefik/dynamic
cat > /etc/traefik/dynamic/router-psi.yml << 'EOF'
http:
  routers:
    router-psi:
      rule: "Host(`router.psivisionhub.com`)"
      entryPoints:
        - websecure
      service: router-psi-service
      tls:
        certResolver: letsencrypt

  services:
    router-psi-service:
      loadBalancer:
        servers:
          - url: "http://host.docker.internal:3001"
EOF
```

**2. Verificar que Traefik tiene file provider configurado:**

```bash
# Ver configuración de Traefik
docker service inspect traefik_traefik --format '{{json .Spec.TaskTemplate.ContainerSpec.Config}}' | jq .
# O si está en archivo:
cat /etc/traefik/traefik.yml | grep -A 5 "file:"
```

Si no tiene file provider, necesitas agregarlo. Busca el archivo de configuración de Traefik y agrega:

```yaml
providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true
```

**3. Recargar Traefik:**

```bash
# Si está en Docker Swarm
docker service update --force traefik_traefik

# O si está como contenedor normal
docker restart traefik
```

## Paso 3: Verificar configuración

```bash
# Ver logs de Traefik
docker service logs traefik_traefik --tail 50 | grep router-psi

# Probar endpoint localmente
curl -H "Host: router.psivisionhub.com" http://localhost/api/router/whatsapp/webhook

# Probar endpoint público (desde tu máquina local)
curl https://router.psivisionhub.com/api/router/whatsapp/webhook
```

## Paso 4: Verificar que n8n puede alcanzar el endpoint

En n8n, el webhook debe apuntar a:
```
https://router.psivisionhub.com/api/router/whatsapp/webhook
```

## Troubleshooting

### Si `host.docker.internal` no funciona:

Edita `/etc/traefik/dynamic/router-psi.yml` y cambia:

```yaml
servers:
  - url: "http://172.17.0.1:3001"  # IP del bridge Docker
```

O usa la IP del host directamente (menos seguro):

```yaml
servers:
  - url: "http://161.97.136.77:3001"
```

### Si Traefik no detecta la configuración:

1. Verifica que el archivo existe:
   ```bash
   ls -la /etc/traefik/dynamic/router-psi.yml
   ```

2. Verifica permisos:
   ```bash
   chmod 644 /etc/traefik/dynamic/router-psi.yml
   ```

3. Verifica que Traefik tiene acceso al directorio:
   ```bash
   docker exec traefik ls -la /etc/traefik/dynamic/
   ```

4. Revisa logs de Traefik:
   ```bash
   docker service logs traefik_traefik | tail -100
   ```

### Si obtienes 502 Bad Gateway:

1. Verifica que la app está corriendo:
   ```bash
   pm2 list
   pm2 logs psi-vision-hub
   curl http://localhost:3001/api/router/whatsapp/webhook
   ```

2. Verifica que Traefik puede alcanzar el puerto:
   ```bash
   # Desde dentro del contenedor de Traefik
   docker exec traefik curl http://host.docker.internal:3001/api/router/whatsapp/webhook
   ```

## Comandos de verificación rápida

```bash
# Estado de la app
pm2 status
pm2 logs psi-vision-hub --lines 20

# Estado de Traefik
docker service ls | grep traefik
docker service logs traefik_traefik --tail 20

# Probar endpoints
curl http://localhost:3001/api/router/whatsapp/webhook
curl -H "Host: router.psivisionhub.com" http://localhost/api/router/whatsapp/webhook
curl https://router.psivisionhub.com/api/router/whatsapp/webhook
```

## Checklist final

- [ ] App corriendo en `localhost:3001` (PM2)
- [ ] Traefik configurado para `router.psivisionhub.com` → `localhost:3001`
- [ ] SSL funcionando (certificado Let's Encrypt)
- [ ] Endpoint accesible: `https://router.psivisionhub.com/api/router/whatsapp/webhook`
- [ ] n8n apunta al endpoint correcto
- [ ] Logs sin errores

