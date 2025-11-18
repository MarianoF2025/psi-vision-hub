#!/bin/bash

# Script para configurar Traefik para router.psivisionhub.com → localhost:3001
# Ejecutar como root en el servidor

echo "=== Configuración Traefik para Router PSI ==="
echo ""

# Verificar que la app está corriendo
echo "1. Verificando que la app está corriendo en localhost:3001..."
if curl -s http://localhost:3001/api/router/whatsapp/webhook > /dev/null 2>&1; then
    echo "✅ App respondiendo en localhost:3001"
else
    echo "❌ ERROR: App no responde en localhost:3001"
    echo "   Ejecuta: pm2 start 'npm run start -- -p 3001' --name psi-vision-hub"
    exit 1
fi

# Verificar Traefik
echo ""
echo "2. Verificando Traefik..."
if docker service ls | grep -q traefik; then
    TRAEFIK_SERVICE=$(docker service ls | grep traefik | awk '{print $2}')
    echo "✅ Traefik encontrado: $TRAEFIK_SERVICE"
else
    echo "❌ ERROR: Traefik no encontrado en Docker Swarm"
    exit 1
fi

# Crear archivo de configuración dinámica
echo ""
echo "3. Creando configuración dinámica de Traefik..."

DYNAMIC_DIR="/etc/traefik/dynamic"
if [ ! -d "$DYNAMIC_DIR" ]; then
    echo "   Creando directorio $DYNAMIC_DIR..."
    mkdir -p "$DYNAMIC_DIR"
fi

CONFIG_FILE="$DYNAMIC_DIR/router-psi.yml"
cat > "$CONFIG_FILE" << 'EOF'
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

echo "✅ Configuración creada en $CONFIG_FILE"
echo ""
echo "NOTA: Si 'host.docker.internal' no funciona, edita el archivo y cambia a:"
echo "      - url: \"http://172.17.0.1:3001\"  (IP del bridge Docker)"
echo "      O la IP del host: http://161.97.136.77:3001"

# Verificar que Traefik tiene el file provider configurado
echo ""
echo "4. Verificando configuración de Traefik..."
echo "   Revisa que traefik.yml tenga:"
echo ""
echo "   providers:"
echo "     file:"
echo "       directory: /etc/traefik/dynamic"
echo "       watch: true"
echo ""

# Recargar Traefik
echo "5. Recargando Traefik..."
docker service update --force "$TRAEFIK_SERVICE" 2>/dev/null || docker restart traefik 2>/dev/null

echo ""
echo "✅ Configuración aplicada"
echo ""
echo "6. Verificando logs de Traefik..."
sleep 2
docker service logs "$TRAEFIK_SERVICE" --tail 20 | grep -i router-psi || echo "   (No hay logs específicos aún)"

echo ""
echo "=== Próximos pasos ==="
echo ""
echo "1. Verifica que Traefik detectó la configuración:"
echo "   docker service logs -f $TRAEFIK_SERVICE | grep router-psi"
echo ""
echo "2. Prueba el endpoint:"
echo "   curl https://router.psivisionhub.com/api/router/whatsapp/webhook"
echo ""
echo "3. Si no funciona, verifica:"
echo "   - Que el dominio router.psivisionhub.com apunta a 161.97.136.77"
echo "   - Que la app está corriendo: pm2 logs psi-vision-hub"
echo "   - Que Traefik puede alcanzar localhost:3001"
echo ""

