#!/bin/bash
# Script para verificar si Traefik está escuchando en puertos 80 y 443

echo "=== Verificación Puertos Traefik ==="
echo ""

# 1. Ver qué está escuchando en puertos 80 y 443
echo "1. Procesos escuchando en puertos 80 y 443:"
sudo netstat -tlnp | grep -E ':(80|443)' || ss -tlnp | grep -E ':(80|443)'
echo ""

# 2. Ver configuración de Traefik (entrypoints)
echo "2. Verificando configuración de Traefik (entrypoints):"
docker service inspect psi-traefik_traefik --format '{{json .Spec.TaskTemplate.ContainerSpec.Args}}' | python3 -m json.tool | grep -E '(entryPoints|web|websecure|80|443)'
echo ""

# 3. Ver puertos expuestos del servicio Traefik
echo "3. Puertos expuestos del servicio Traefik:"
docker service inspect psi-traefik_traefik --format '{{json .Endpoint.Ports}}' | python3 -m json.tool
echo ""

# 4. Ver logs de Traefik para ver si hay errores de puertos
echo "4. Logs recientes de Traefik (buscando errores de puertos):"
docker service logs psi-traefik_traefik --tail 30 | grep -E '(port|80|443|listen|entryPoint)'
echo ""

# 5. Verificar si hay Nginx u otro proceso bloqueando
echo "5. Verificando si hay Nginx u otro proceso:"
sudo systemctl status nginx 2>/dev/null || echo "   Nginx no está corriendo como servicio systemd"
ps aux | grep -E '(nginx|apache)' | grep -v grep || echo "   No hay procesos nginx/apache corriendo"
echo ""

# 6. Ver contenedores de Traefik
echo "6. Contenedores de Traefik:"
docker ps | grep traefik
echo ""

# 7. Ver puertos del contenedor directamente
echo "7. Puertos del contenedor Traefik:"
TRAEFIK_CONTAINER=$(docker ps | grep traefik | awk '{print $1}' | head -1)
if [ ! -z "$TRAEFIK_CONTAINER" ]; then
    docker port $TRAEFIK_CONTAINER
else
    echo "   No se encontró contenedor de Traefik"
fi
echo ""

echo "=== Fin verificación ==="

