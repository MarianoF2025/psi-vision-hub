#!/bin/bash
# Identificar qué está usando los puertos 80 y 443

echo "=== Identificación Sistema Viejo ==="
echo ""

# 1. Ver todos los servicios Docker
echo "1. Todos los servicios Docker:"
docker service ls
echo ""

# 2. Ver todos los contenedores corriendo
echo "2. Todos los contenedores corriendo:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
echo ""

# 3. Ver stacks desplegados
echo "3. Stacks desplegados:"
docker stack ls
echo ""

# 4. Buscar servicios que puedan estar usando puertos 80/443
echo "4. Buscando servicios con puertos 80/443:"
docker service ls --format "{{.Name}}" | while read service; do
    PORTS=$(docker service inspect $service --format '{{json .Endpoint.Ports}}' 2>/dev/null)
    if echo "$PORTS" | grep -qE '(80|443)'; then
        echo "   Servicio: $service"
        echo "$PORTS" | python3 -m json.tool
    fi
done
echo ""

# 5. Verificar si hay un router viejo
echo "5. Buscando servicios/router viejo:"
docker service ls | grep -i router
docker ps | grep -i router
echo ""

# 6. Verificar procesos que puedan estar escuchando
echo "6. Procesos que pueden estar usando puertos:"
lsof -i :80 2>/dev/null || echo "   (lsof no disponible)"
lsof -i :443 2>/dev/null || echo "   (lsof no disponible)"
echo ""

echo "=== Fin ==="

