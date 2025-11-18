#!/bin/bash
# Script para agregar puertos 80/443 a Traefik

echo "=== Agregar Puertos a Traefik ==="
echo ""

# 1. Ver configuración actual
echo "1. Configuración actual de puertos:"
docker service inspect psi-traefik_traefik --format '{{json .Spec.EndpointSpec}}' | python3 -m json.tool
echo ""

# 2. Ver archivo de configuración de Traefik
echo "2. Verificando archivo de configuración:"
if [ -f "/root/traefik-stack.yml" ]; then
    echo "   Archivo encontrado: /root/traefik-stack.yml"
    cat /root/traefik-stack.yml | grep -A 5 ports
else
    echo "   Archivo no encontrado"
fi
echo ""

# 3. Agregar puertos 80 y 443
echo "3. Agregando puertos 80 y 443 a Traefik..."
docker service update \
  --publish-add 80:80 \
  --publish-add 443:443 \
  psi-traefik_traefik

echo ""
echo "4. Esperando a que se actualice..."
sleep 5

# 4. Verificar que los puertos se agregaron
echo "5. Verificando puertos:"
docker service inspect psi-traefik_traefik --format '{{json .Spec.EndpointSpec}}' | python3 -m json.tool
echo ""

# 5. Verificar que está escuchando
echo "6. Verificando que está escuchando en 80/443:"
sleep 3
sudo netstat -tlnp | grep -E ':(80|443)' || ss -tlnp | grep -E ':(80|443)'
echo ""

echo "=== Fin ==="

