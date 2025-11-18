# Solución: Socat como Proxy TCP para Router PSI

## Problema
Traefik no puede alcanzar directamente `localhost:3001` desde el contenedor. Usaremos un contenedor `socat` como proxy TCP simple.

## Solución
Un contenedor `socat` que:
1. Escucha en el puerto 80 dentro del contenedor
2. Redirige todo el tráfico TCP a `172.17.0.1:3001` (o IP del host)
3. Traefik detecta automáticamente el servicio y lo enruta

## Ventajas
- ✅ Muy ligero (imagen Alpine pequeña)
- ✅ Solo hace forwarding TCP, sin procesar HTTP
- ✅ No interfiere con Traefik
- ✅ Simple y confiable

## Pasos de implementación

### 1. Desplegar servicio Socat

```bash
cd /opt/psi-vision-hub
docker stack deploy -c docker-compose.socat-proxy.yml router-socat
```

### 2. Verificar que está corriendo

```bash
docker service ls | grep router-socat
docker service logs router-socat_router-socat-proxy --tail 20
```

### 3. Verificar que Traefik lo detectó

```bash
docker service logs psi-traefik_traefik --tail 30 | grep router-psi
```

### 4. Probar endpoint

```bash
curl https://router.psivisionhub.com/api/router/whatsapp/webhook
```

## Si 172.17.0.1 no funciona

Edita el archivo `docker-compose.socat-proxy.yml` y cambia:
```yaml
command: TCP-LISTEN:80,fork,reuseaddr TCP-CONNECT:172.17.0.1:3001
```

Por:
```yaml
command: TCP-LISTEN:80,fork,reuseaddr TCP-CONNECT:161.97.136.77:3001
```

Luego actualiza:
```bash
docker stack deploy -c docker-compose.socat-proxy.yml router-socat
```

## Comandos útiles

```bash
# Ver estado del servicio
docker service ps router-socat_router-socat-proxy

# Ver logs
docker service logs -f router-socat_router-socat-proxy

# Reiniciar servicio
docker service update --force router-socat_router-socat-proxy

# Eliminar servicio
docker stack rm router-socat
```

