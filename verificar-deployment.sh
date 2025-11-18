#!/bin/bash
# Script para verificar el deployment

echo "=== Verificación Deployment PSI Router ==="
echo ""

# 1. Verificar que el servicio está corriendo
echo "1. Estado del servicio:"
docker service ls | grep psi-router
echo ""

# 2. Verificar que está en la red public
echo "2. Red del servicio:"
docker service inspect psi-router_psi-router --format '{{json .Spec.TaskTemplate.Networks}}' | python3 -m json.tool 2>/dev/null || docker service inspect psi-router_psi-router --format '{{json .Spec.TaskTemplate.Networks}}'
echo ""

# 3. Verificar labels de Traefik
echo "3. Labels de Traefik:"
docker service inspect psi-router_psi-router --format '{{range .Spec.Labels}}{{.}}{{"\n"}}{{end}}' | grep traefik
echo ""

# 4. Verificar que Traefik detectó el servicio
echo "4. Logs de Traefik (buscando router-psi):"
docker service logs psi-traefik_traefik --tail 50 --since 2m | grep -i router-psi || echo "   (Aún no detectado, espera unos segundos)"
echo ""

# 5. Probar conectividad interna
echo "5. Probando conectividad interna:"
CONTAINER_ID=$(docker ps | grep psi-router | awk '{print $1}' | head -1)
if [ ! -z "$CONTAINER_ID" ]; then
    echo "   Contenedor: $CONTAINER_ID"
    docker exec $CONTAINER_ID wget -qO- http://localhost:3001/api/router/whatsapp/webhook 2>&1 | head -1 || echo "   (No se pudo probar)"
else
    echo "   (Contenedor no encontrado)"
fi
echo ""

# 6. Probar endpoint público
echo "6. Probando endpoint público:"
curl -v --max-time 10 https://router.psivisionhub.com/api/router/whatsapp/webhook 2>&1 | head -20
echo ""

echo "=== Verificación completada ==="

