# Deploy PSI Vision Hub Router - PM2 + Traefik

## Configuración actual

- **Aplicación**: Next.js corriendo en `localhost:3001` via PM2
- **Dominio**: `router.psivisionhub.com`
- **Proxy**: Traefik (necesita configuración)

## Paso 1: Iniciar aplicación con PM2

```bash
cd /opt/psi-vision-hub
pm2 delete psi-vision-hub  # Si existe
pm2 start "npm run start -- -p 3001" --name psi-vision-hub
pm2 save
pm2 logs psi-vision-hub  # Verificar que está corriendo
```

## Paso 2: Verificar que la app responde localmente

```bash
curl http://localhost:3001/api/router/whatsapp/webhook
# Debería responder (aunque sea un error 400, significa que está funcionando)
```

## Paso 3: Configurar Traefik

Traefik necesita saber que `router.psivisionhub.com` debe apuntar a `localhost:3001`.

### Opción A: Archivo de configuración estático (Recomendado)

Si Traefik usa archivos de configuración, crea o edita el archivo de configuración de Traefik:

```bash
# Ubicación típica: /etc/traefik/traefik.yml o /opt/traefik/traefik.yml
# O donde tengas configurado Traefik
```

Agrega esta configuración al archivo `traefik.yml`:

```yaml
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
          - url: "http://localhost:3001"
```

### Opción B: Usar archivo dinámico (file provider)

Crea un archivo de configuración dinámico (ej: `/etc/traefik/dynamic/router-psi.yml`):

```yaml
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
          - url: "http://localhost:3001"
```

Y en `traefik.yml` principal, asegúrate de tener:

```yaml
providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true
```

### Opción C: Si Traefik está en Docker Swarm

Si Traefik está corriendo en Docker Swarm pero la app está en PM2, necesitas usar la IP del host:

```yaml
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
          - url: "http://host.docker.internal:3001"  # Docker Desktop
          # O usar la IP del host:
          # - url: "http://172.17.0.1:3001"  # Docker en Linux
          # O si Traefik está en el mismo host:
          # - url: "http://161.97.136.77:3001"  # IP pública (no recomendado)
```

**Mejor opción para Docker Swarm**: Usar `host.docker.internal` o la IP de la interfaz Docker bridge.

## Paso 4: Recargar Traefik

```bash
# Si Traefik está en Docker Swarm
docker service update --force traefik_traefik

# O si Traefik está como servicio systemd
sudo systemctl reload traefik

# O si Traefik está en Docker pero no en Swarm
docker restart traefik
```

## Paso 5: Verificar configuración

```bash
# Ver logs de Traefik
docker service logs traefik | grep router-psi
# O
docker logs traefik | grep router-psi

# Probar endpoint
curl https://router.psivisionhub.com/api/router/whatsapp/webhook
# Debería responder (aunque sea un error, significa que está funcionando)
```

## Paso 6: Verificar que n8n puede alcanzar el endpoint

En n8n, verifica que el webhook apunte a:
```
https://router.psivisionhub.com/api/router/whatsapp/webhook
```

## Troubleshooting

### Error 502 Bad Gateway

1. **Verificar que la app está corriendo**:
   ```bash
   pm2 list
   pm2 logs psi-vision-hub
   curl http://localhost:3001/api/router/whatsapp/webhook
   ```

2. **Verificar configuración de Traefik**:
   ```bash
   # Ver configuración de Traefik
   docker service inspect traefik_traefik
   # O
   docker exec traefik cat /etc/traefik/traefik.yml
   ```

3. **Verificar red de Docker**:
   Si Traefik está en Docker y la app en PM2, asegúrate de que Traefik pueda alcanzar `localhost:3001` o usa `host.docker.internal:3001`.

### Error 404 Not Found

- Verifica que el endpoint `/api/router/whatsapp/webhook` existe en la app
- Verifica que Traefik está enrutando correctamente: `curl -H "Host: router.psivisionhub.com" http://localhost/api/router/whatsapp/webhook`

### SSL no funciona

- Verifica que el dominio `router.psivisionhub.com` apunta al servidor (IP: 161.97.136.77)
- Verifica que el certresolver `letsencrypt` está configurado en Traefik
- Revisa logs de Let's Encrypt: `docker service logs traefik | grep letsencrypt`

## Comandos útiles

### Ver logs de la aplicación
```bash
pm2 logs psi-vision-hub
pm2 logs psi-vision-hub --lines 100
```

### Reiniciar aplicación
```bash
pm2 restart psi-vision-hub
```

### Ver estado
```bash
pm2 status
pm2 info psi-vision-hub
```

### Ver logs de Traefik
```bash
docker service logs -f traefik_traefik
# O
docker logs -f traefik
```

## Verificación final

1. ✅ App corriendo en `localhost:3001`
2. ✅ Traefik configurado para `router.psivisionhub.com` → `localhost:3001`
3. ✅ SSL funcionando (certificado Let's Encrypt)
4. ✅ Endpoint accesible: `https://router.psivisionhub.com/api/router/whatsapp/webhook`
5. ✅ n8n apunta al endpoint correcto

