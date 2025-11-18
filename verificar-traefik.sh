#!/bin/bash
# Script para verificar y corregir configuración de Traefik

echo "=== Verificación Traefik Router PSI ==="
echo ""

# 1. Verificar que la app está corriendo
echo "1. Verificando app en localhost:3001..."
curl -s http://localhost:3001/api/router/whatsapp/webhook | head -1
echo ""

# 2. Obtener contenedor de Traefik
TRAEFIK_CONTAINER=$(docker ps | grep traefik | awk '{print $1}' | head -1)
echo "2. Contenedor Traefik: $TRAEFIK_CONTAINER"
echo ""

# 3. Verificar IP del bridge Docker
echo "3. IP del bridge Docker:"
docker network inspect bridge | grep -A 5 Gateway | grep Gateway | head -1
BRIDGE_IP=$(docker network inspect bridge | grep Gateway | head -1 | awk -F'"' '{print $4}')
echo "   Bridge IP: $BRIDGE_IP"
echo ""

# 4. Probar conectividad desde Traefik
echo "4. Probando conectividad desde Traefik..."
echo "   a) host.docker.internal:3001"
docker exec $TRAEFIK_CONTAINER curl -s --connect-timeout 2 http://host.docker.internal:3001/api/router/whatsapp/webhook 2>&1 | head -1 || echo "   ❌ No funciona"
echo ""

echo "   b) 172.17.0.1:3001"
docker exec $TRAEFIK_CONTAINER curl -s --connect-timeout 2 http://172.17.0.1:3001/api/router/whatsapp/webhook 2>&1 | head -1 || echo "   ❌ No funciona"
echo ""

echo "   c) $BRIDGE_IP:3001"
docker exec $TRAEFIK_CONTAINER curl -s --connect-timeout 2 http://$BRIDGE_IP:3001/api/router/whatsapp/webhook 2>&1 | head -1 || echo "   ❌ No funciona"
echo ""

# 5. Verificar que Traefik puede leer el archivo de configuración
echo "5. Verificando archivo de configuración en Traefik..."
docker exec $TRAEFIK_CONTAINER ls -la /etc/traefik/dynamic/router-psi.yml 2>&1 || echo "   ⚠️ Archivo no encontrado en contenedor"
echo ""

# 6. Ver logs recientes de Traefik para router-psi
echo "6. Logs recientes de Traefik (router-psi):"
docker service logs psi-traefik_traefik --tail 20 | grep -i "router-psi" || echo "   (No hay logs específicos de router-psi)"
echo ""

# 7. Verificar configuración actual
echo "7. Configuración actual:"
cat /etc/traefik/dynamic/router-psi.yml
echo ""

echo "=== Recomendación ==="
echo "Si ninguna IP funciona, prueba con la IP del host: 161.97.136.77:3001"
echo "Edita: nano /etc/traefik/dynamic/router-psi.yml"
echo "Y cambia la URL a: http://161.97.136.77:3001"

