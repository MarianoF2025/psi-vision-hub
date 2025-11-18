#!/bin/bash
# Comandos finales para configurar Traefik - Ejecutar en SSH

# 1. Crear configuración de Traefik
mkdir -p /etc/traefik/dynamic
cat > /etc/traefik/dynamic/router-psi.yml << 'EOF'
http:
  routers:
    router-psi:
      rule: "Host(`router.psivisionhub.com`)"
      entryPoints:
        - websecure
      service: router-psi-service
      tls:
        certResolver: letsencrypt

  services:
    router-psi-service:
      loadBalancer:
        servers:
          - url: "http://host.docker.internal:3001"
EOF

echo "✅ Configuración creada"

# 2. Verificar archivo
cat /etc/traefik/dynamic/router-psi.yml

# 3. Recargar Traefik
echo ""
echo "🔄 Recargando Traefik..."
docker service update --force psi-traefik_traefik

# 4. Esperar unos segundos
sleep 3

# 5. Ver logs
echo ""
echo "📋 Logs de Traefik (últimas 30 líneas):"
docker service logs psi-traefik_traefik --tail 30

# 6. Verificar que Traefik puede alcanzar el backend
echo ""
echo "🔍 Verificando conectividad desde Traefik..."
docker service ps psi-traefik_traefik --format "{{.Name}}"
TRAEFIK_CONTAINER=$(docker ps | grep traefik | awk '{print $1}' | head -1)
if [ ! -z "$TRAEFIK_CONTAINER" ]; then
    echo "   Probando desde contenedor Traefik..."
    docker exec $TRAEFIK_CONTAINER curl -s http://host.docker.internal:3001/api/router/whatsapp/webhook || echo "   ⚠️ host.docker.internal no funciona, probando 172.17.0.1..."
    docker exec $TRAEFIK_CONTAINER curl -s http://172.17.0.1:3001/api/router/whatsapp/webhook || echo "   ⚠️ 172.17.0.1 tampoco funciona"
fi

# 7. Probar endpoint
echo ""
echo "🌐 Probando endpoint..."
curl -k https://router.psivisionhub.com/api/router/whatsapp/webhook 2>&1 | head -5

