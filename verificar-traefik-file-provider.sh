#!/bin/bash
# Script para verificar si Traefik puede leer el archivo de configuración

echo "=== Verificación Traefik File Provider ==="
echo ""

# 1. Verificar que el archivo existe en el host
echo "1. Archivo en el host:"
ls -la /etc/traefik/dynamic/router-psi.yml
echo ""

# 2. Obtener contenedor de Traefik
TRAEFIK_CONTAINER=$(docker ps | grep traefik | awk '{print $1}' | head -1)
echo "2. Contenedor Traefik: $TRAEFIK_CONTAINER"
echo ""

# 3. Verificar si el archivo está montado en el contenedor
echo "3. Verificando si el archivo está en el contenedor:"
docker exec $TRAEFIK_CONTAINER ls -la /etc/traefik/dynamic/router-psi.yml 2>&1
echo ""

# 4. Verificar montajes de Traefik
echo "4. Montajes de Traefik:"
docker service inspect psi-traefik_traefik --format '{{json .Spec.TaskTemplate.ContainerSpec.Mounts}}' | python3 -m json.tool 2>/dev/null || docker service inspect psi-traefik_traefik --format '{{json .Spec.TaskTemplate.ContainerSpec.Mounts}}'
echo ""

# 5. Verificar configuración de Traefik (file provider)
echo "5. Verificando si Traefik tiene file provider configurado:"
docker exec $TRAEFIK_CONTAINER cat /etc/traefik/traefik.yml 2>/dev/null | grep -A 5 "file:" || echo "   (No se encontró file provider en traefik.yml)"
echo ""

# 6. Ver logs recientes de Traefik
echo "6. Logs recientes de Traefik (últimas 10 líneas):"
docker service logs psi-traefik_traefik --tail 10
echo ""

echo "=== Diagnóstico ==="
echo "Si el archivo NO está en el contenedor, Traefik no puede leerlo."
echo "Necesitas montar el directorio /etc/traefik/dynamic como volumen en Traefik."

