#!/bin/bash
# Script para eliminar completamente el sistema viejo del router

set -e

echo "=== LIMPIEZA COMPLETA DEL SISTEMA VIEJO ==="
echo ""

# 1. Identificar y eliminar todos los servicios relacionados con router viejo
echo "1. Eliminando servicios Docker relacionados con router viejo..."
docker service ls | grep -i router | awk '{print $1}' | while read service_id; do
    if [ ! -z "$service_id" ]; then
        echo "   Eliminando servicio: $service_id"
        docker service rm $service_id 2>/dev/null || true
    fi
done

# 2. Eliminar stacks completos
echo ""
echo "2. Eliminando stacks Docker..."
docker stack ls | grep -E "(router|psi-router|router-psi)" | awk '{print $1}' | while read stack_name; do
    if [ ! -z "$stack_name" ]; then
        echo "   Eliminando stack: $stack_name"
        docker stack rm $stack_name 2>/dev/null || true
    fi
done

# 3. Eliminar contenedores huérfanos
echo ""
echo "3. Eliminando contenedores relacionados..."
docker ps -a | grep -i router | awk '{print $1}' | while read container_id; do
    if [ ! -z "$container_id" ]; then
        echo "   Eliminando contenedor: $container_id"
        docker rm -f $container_id 2>/dev/null || true
    fi
done

# 4. Eliminar imágenes relacionadas
echo ""
echo "4. Eliminando imágenes relacionadas..."
docker images | grep -E "(router|psi-router)" | awk '{print $3}' | while read image_id; do
    if [ ! -z "$image_id" ]; then
        echo "   Eliminando imagen: $image_id"
        docker rmi -f $image_id 2>/dev/null || true
    fi
done

# 5. Limpiar configuraciones de Traefik (archivos dinámicos)
echo ""
echo "5. Limpiando configuraciones de Traefik..."
# Buscar archivos de configuración de Traefik relacionados con router
find /opt -name "*router*traefik*" -o -name "*traefik*router*" 2>/dev/null | while read config_file; do
    if [ ! -z "$config_file" ]; then
        echo "   Eliminando: $config_file"
        rm -f "$config_file" 2>/dev/null || true
    fi
done

# 6. Verificar procesos PM2 relacionados con router viejo
echo ""
echo "6. Verificando procesos PM2..."
pm2 list | grep -i router | awk '{print $2}' | while read pm2_id; do
    if [ ! -z "$pm2_id" ]; then
        echo "   Eliminando proceso PM2: $pm2_id"
        pm2 delete $pm2_id 2>/dev/null || true
    fi
done

# 7. Verificar puertos en uso
echo ""
echo "7. Verificando puertos en uso..."
echo "   Puerto 3001:"
lsof -i :3001 2>/dev/null || echo "   ✓ Puerto 3001 libre"
echo "   Puerto 80:"
lsof -i :80 2>/dev/null | head -5 || echo "   ✓ Solo Traefik en puerto 80"
echo "   Puerto 443:"
lsof -i :443 2>/dev/null | head -5 || echo "   ✓ Solo Traefik en puerto 443"

# 8. Esperar a que se completen las eliminaciones
echo ""
echo "8. Esperando a que se completen las eliminaciones..."
sleep 10

# 9. Verificar estado final
echo ""
echo "=== ESTADO FINAL ==="
echo ""
echo "Servicios Docker activos:"
docker service ls
echo ""
echo "Stacks Docker activos:"
docker stack ls
echo ""
echo "Procesos PM2:"
pm2 list
echo ""
echo "=== LIMPIEZA COMPLETADA ==="
echo ""
echo "Ahora puedes desplegar el nuevo router sin interferencias."

