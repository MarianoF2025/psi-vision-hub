#!/bin/bash
# Script de deployment para PSI Vision Hub Router en Docker Swarm

set -e

echo "=== Deployment PSI Vision Hub Router ==="
echo ""

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encuentra package.json. Ejecuta desde el directorio del proyecto."
    exit 1
fi

# 2. Verificar que existe .env.local
if [ ! -f ".env.local" ]; then
    echo "❌ Error: No se encuentra .env.local. Crea el archivo con las variables de entorno."
    exit 1
fi

# 3. Construir imagen Docker
echo "📦 Construyendo imagen Docker..."
docker build -t psi-vision-hub-router:latest .

# 4. Verificar que la red public existe
echo ""
echo "🔍 Verificando red 'public'..."
if ! docker network ls | grep -q "public"; then
    echo "⚠️  Red 'public' no existe. Creándola..."
    docker network create --driver overlay --attachable public
else
    echo "✅ Red 'public' existe"
fi

# 5. Parar PM2 si está corriendo
echo ""
echo "🛑 Parando PM2 (si está corriendo)..."
pm2 delete psi-vision-hub 2>/dev/null || echo "   PM2 no estaba corriendo"

# 6. Cargar variables de entorno desde .env.local
echo ""
echo "📝 Cargando variables de entorno..."
export $(grep -v '^#' .env.local | xargs)

# 7. Desplegar en Docker Swarm
echo ""
echo "🚀 Desplegando en Docker Swarm..."
docker stack deploy -c docker-compose.router.yml psi-router

# 8. Esperar a que el servicio esté listo
echo ""
echo "⏳ Esperando a que el servicio esté listo..."
sleep 5

# 9. Verificar estado
echo ""
echo "📋 Estado del servicio:"
docker service ls | grep psi-router

# 10. Ver logs
echo ""
echo "📋 Logs del servicio (últimas 20 líneas):"
docker service logs psi-router_psi-router --tail 20

# 11. Verificar que Traefik lo detectó
echo ""
echo "🔍 Verificando que Traefik detectó el servicio..."
sleep 3
docker service logs psi-traefik_traefik --tail 30 | grep -i router-psi || echo "   (Traefik aún no ha detectado el servicio, espera unos segundos más)"

echo ""
echo "✅ Deployment completado!"
echo ""
echo "🌐 Probar endpoint:"
echo "   curl https://router.psivisionhub.com/api/router/whatsapp/webhook"
echo ""
echo "📋 Ver logs en tiempo real:"
echo "   docker service logs -f psi-router_psi-router"

