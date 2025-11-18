#!/bin/bash
# Diagnóstico completo del problema

echo "=== Diagnóstico PSI Router ==="
echo ""

# 1. Verificar que el servicio está en la red public
echo "1. Red del servicio:"
docker service inspect psi-router_psi-router --format '{{json .Spec.TaskTemplate.Networks}}' | python3 -m json.tool
echo ""

# 2. Verificar que Traefik está en la red public
echo "2. Red de Traefik:"
docker service inspect psi-traefik_traefik --format '{{json .Spec.TaskTemplate.Networks}}' | python3 -m json.tool
echo ""

# 3. Verificar qué está escuchando en puertos 80 y 443
echo "3. Procesos escuchando en puertos 80 y 443:"
sudo netstat -tlnp | grep -E ':(80|443)' || ss -tlnp | grep -E ':(80|443)'
echo ""

# 4. Verificar estado del servicio
echo "4. Estado detallado del servicio:"
docker service ps psi-router_psi-router --no-trunc
echo ""

# 5. Verificar conectividad desde Traefik al servicio
echo "5. Verificando conectividad desde Traefik:"
TRAEFIK_CONTAINER=$(docker ps | grep traefik | awk '{print $1}' | head -1)
if [ ! -z "$TRAEFIK_CONTAINER" ]; then
    echo "   Contenedor Traefik: $TRAEFIK_CONTAINER"
    # Obtener IP del servicio router
    ROUTER_IP=$(docker service inspect psi-router_psi-router --format '{{range .Endpoint.VirtualIPs}}{{.Addr}}{{end}}' | cut -d'/' -f1)
    echo "   IP del servicio router: $ROUTER_IP"
    if [ ! -z "$ROUTER_IP" ]; then
        docker exec $TRAEFIK_CONTAINER wget -qO- --timeout=2 http://$ROUTER_IP:3001/api/router/whatsapp/webhook 2>&1 | head -1 || echo "   (No se pudo conectar)"
    fi
fi
echo ""

# 6. Ver logs completos de Traefik (sin filtro)
echo "6. Logs recientes de Traefik (últimas 20 líneas):"
docker service logs psi-traefik_traefik --tail 20
echo ""

# 7. Verificar configuración de Traefik (Docker provider)
echo "7. Verificando si Traefik tiene Docker provider habilitado:"
docker service inspect psi-traefik_traefik --format '{{json .Spec.TaskTemplate.ContainerSpec.Args}}' | python3 -m json.tool | grep -i docker || echo "   (No se encontró configuración de Docker provider)"
echo ""

echo "=== Fin diagnóstico ==="

