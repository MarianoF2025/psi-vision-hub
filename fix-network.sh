#!/bin/bash
# Script para verificar y corregir las redes

echo "=== Verificación de Redes ==="
echo ""

# 1. Ver todas las redes
echo "1. Redes disponibles:"
docker network ls
echo ""

# 2. Verificar si existe la red public
echo "2. Verificando red 'public':"
docker network ls | grep public
echo ""

# 3. Ver detalles de las redes de los servicios
echo "3. Red del servicio router:"
docker network inspect dyrg002hti1fim3po1vaxjvgl --format '{{.Name}}' 2>/dev/null || echo "   (No se pudo obtener nombre)"
echo ""

echo "4. Red del servicio Traefik:"
docker network inspect pe6bcr7b54n0xys9156xls16q --format '{{.Name}}' 2>/dev/null || echo "   (No se pudo obtener nombre)"
echo ""

# 4. Verificar si la red public existe
echo "5. Verificando si existe red 'public':"
PUBLIC_NETWORK=$(docker network ls | grep public | awk '{print $1}')
if [ -z "$PUBLIC_NETWORK" ]; then
    echo "   ⚠️  Red 'public' no existe. Creándola..."
    docker network create --driver overlay --attachable public
    echo "   ✅ Red 'public' creada"
else
    echo "   ✅ Red 'public' existe: $PUBLIC_NETWORK"
fi
echo ""

echo "=== Solución ==="
echo "Necesitas actualizar el servicio router para que use la red 'public'."
echo "Ejecuta: docker service update --network-add public psi-router_psi-router"

