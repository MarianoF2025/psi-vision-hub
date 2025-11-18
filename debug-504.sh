#!/bin/bash
# Debug del error 504 Gateway Timeout

echo "=== Debug 504 Gateway Timeout ==="
echo ""

# 1. Verificar que el router está en PsiNet
echo "1. Red del router:"
docker service inspect psi-router_psi-router --format '{{json .Spec.TaskTemplate.Networks}}' | python3 -m json.tool
echo ""

# 2. Verificar que el router está corriendo y respondiendo
echo "2. Estado del router:"
docker service ps psi-router_psi-router --no-trunc
echo ""

# 3. Obtener IP del contenedor del router
echo "3. IP del contenedor router:"
ROUTER_CONTAINER=$(docker ps | grep psi-router | awk '{print $1}' | head -1)
if [ ! -z "$ROUTER_CONTAINER" ]; then
    echo "   Contenedor: $ROUTER_CONTAINER"
    docker inspect $ROUTER_CONTAINER --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
    echo ""
    echo "   Probando conectividad desde Traefik:"
    TRAEFIK_CONTAINER=$(docker ps | grep traefik | awk '{print $1}' | head -1)
    ROUTER_IP=$(docker inspect $ROUTER_CONTAINER --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
    if [ ! -z "$ROUTER_IP" ]; then
        docker exec $TRAEFIK_CONTAINER wget -qO- --timeout=2 http://$ROUTER_IP:3001/api/router/whatsapp/webhook 2>&1 | head -1 || echo "   ❌ No se pudo conectar"
    fi
fi
echo ""

# 4. Verificar labels del router
echo "4. Labels del router (Traefik):"
docker service inspect psi-router_psi-router --format '{{range $k, $v := .Spec.Labels}}{{if (hasPrefix $k "traefik")}}{{$k}}={{$v}}{{"\n"}}{{end}}{{end}}'
echo ""

# 5. Ver logs de Traefik cuando se hace la petición
echo "5. Hacer petición y ver logs en tiempo real:"
echo "   (Ejecuta en otra terminal: curl https://router.psivisionhub.com/api/router/whatsapp/webhook)"
echo "   Luego presiona Enter para ver logs..."
read
docker service logs psi-traefik_traefik --tail 20 --since 10s
echo ""

# 6. Verificar conectividad usando el nombre del servicio
echo "6. Probando conectividad por nombre de servicio:"
docker exec $TRAEFIK_CONTAINER wget -qO- --timeout=2 http://psi-router:3001/api/router/whatsapp/webhook 2>&1 | head -1 || echo "   ❌ No se pudo conectar por nombre"
echo ""

echo "=== Fin Debug ==="

