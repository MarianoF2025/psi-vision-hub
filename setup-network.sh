#!/bin/bash
# Script para crear la red public si no existe

echo "Verificando red 'public'..."

if docker network ls | grep -q "public"; then
    echo "✓ La red 'public' ya existe"
else
    echo "Creando red 'public'..."
    docker network create --driver overlay --attachable public
    echo "✓ Red 'public' creada exitosamente"
fi

echo ""
echo "Redes disponibles:"
docker network ls | grep -E "NETWORK|public"

