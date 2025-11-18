#!/bin/bash
# Script para corregir configuración de Traefik usando IP del host

echo "=== Corrigiendo configuración Traefik ==="
echo ""

# 1. Verificar que la app responde desde el host
echo "1. Verificando app desde el host..."
curl -s http://localhost:3001/api/router/whatsapp/webhook | head -1
echo ""
echo ""

# 2. Verificar que el archivo de configuración existe
echo "2. Verificando archivo de configuración..."
ls -la /etc/traefik/dynamic/router-psi.yml
echo ""

# 3. Actualizar configuración para usar IP del host
echo "3. Actualizando configuración para usar IP del host (161.97.136.77)..."
sed -i 's|http://host.docker.internal:3001|http://161.97.136.77:3001|g' /etc/traefik/dynamic/router-psi.yml

# 4. Verificar cambio
echo "4. Configuración actualizada:"
cat /etc/traefik/dynamic/router-psi.yml
echo ""

# 5. Verificar que Traefik puede leer el archivo
echo "5. Verificando acceso al archivo desde Traefik..."
TRAEFIK_CONTAINER=$(docker ps | grep traefik | awk '{print $1}' | head -1)
docker exec $TRAEFIK_CONTAINER ls -la /etc/traefik/dynamic/router-psi.yml 2>&1
echo ""

# 6. Si el archivo no está en el contenedor, verificar montajes
echo "6. Verificando montajes de Traefik..."
docker service inspect psi-traefik_traefik --format '{{json .Spec.TaskTemplate.ContainerSpec.Mounts}}' | python3 -m json.tool 2>/dev/null || echo "   (No se pudo parsear JSON)"
echo ""

echo "=== Próximos pasos ==="
echo "1. Recargar Traefik: docker service update --force psi-traefik_traefik"
echo "2. Ver logs: docker service logs psi-traefik_traefik --tail 30"
echo "3. Probar: curl https://router.psivisionhub.com/api/router/whatsapp/webhook"

