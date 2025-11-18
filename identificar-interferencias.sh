#!/bin/bash
# Script para identificar qué está interfiriendo

echo "=== IDENTIFICACIÓN DE INTERFERENCIAS ==="
echo ""

# 1. Servicios Docker relacionados con router
echo "1. SERVICIOS DOCKER RELACIONADOS CON ROUTER:"
docker service ls | grep -i router || echo "   ✓ No hay servicios Docker con 'router'"
echo ""

# 2. Stacks Docker
echo "2. STACKS DOCKER:"
docker stack ls
echo ""

# 3. Contenedores relacionados
echo "3. CONTENEDORES RELACIONADOS CON ROUTER:"
docker ps -a | grep -i router || echo "   ✓ No hay contenedores con 'router'"
echo ""

# 4. Procesos PM2
echo "4. PROCESOS PM2:"
pm2 list
echo ""

# 5. Puertos en uso
echo "5. PUERTOS EN USO:"
echo "   Puerto 3001:"
lsof -i :3001 2>/dev/null || echo "   ✓ Libre"
echo ""
echo "   Puerto 80:"
lsof -i :80 2>/dev/null || echo "   ✓ Libre"
echo ""
echo "   Puerto 443:"
lsof -i :443 2>/dev/null || echo "   ✓ Libre"
echo ""

# 6. Configuraciones de Traefik relacionadas
echo "6. CONFIGURACIONES TRAEFIK RELACIONADAS:"
find /opt -name "*router*" -type f 2>/dev/null | head -10 || echo "   ✓ No se encontraron archivos relacionados"
echo ""

# 7. Redes Docker
echo "7. REDES DOCKER:"
docker network ls | grep -E "(router|psi)" || echo "   ✓ Solo redes estándar"
echo ""

echo "=== FIN IDENTIFICACIÓN ==="

