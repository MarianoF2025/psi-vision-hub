#!/bin/bash
# Script para configurar Nginx para router.psivisionhub.com

set -e

echo "=== CONFIGURACIÓN NGINX PARA ROUTER PSI VISION HUB ==="
echo ""

# 1. Verificar que Nginx está instalado
echo "1. Verificando Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "   Instalando Nginx..."
    apt update
    apt install -y nginx
else
    echo "   ✓ Nginx ya está instalado"
fi

# 2. Verificar que el router PM2 está corriendo
echo ""
echo "2. Verificando router PM2..."
if pm2 list | grep -q "psi-vision-hub"; then
    echo "   ✓ Router PM2 está corriendo"
else
    echo "   ⚠ Router PM2 NO está corriendo. Iniciándolo..."
    cd /opt/psi-vision-hub
    pm2 start "npm run start" --name psi-vision-hub
    pm2 save
fi

# 3. Verificar puertos
echo ""
echo "3. Verificando puertos..."
if lsof -i :80 | grep -q nginx || lsof -i :80 | grep -q "traefik\|docker"; then
    echo "   ⚠ Puerto 80 está en uso. Verificando..."
    lsof -i :80
fi

if lsof -i :443 | grep -q nginx || lsof -i :443 | grep -q "traefik\|docker"; then
    echo "   ⚠ Puerto 443 está en uso. Verificando..."
    lsof -i :443
fi

# 4. Copiar configuración
echo ""
echo "4. Copiando configuración Nginx..."
if [ -f "nginx-router.conf" ]; then
    cp nginx-router.conf /etc/nginx/sites-available/router.psivisionhub.com
    echo "   ✓ Configuración copiada"
else
    echo "   ❌ Error: nginx-router.conf no encontrado"
    exit 1
fi

# 5. Crear enlace simbólico
echo ""
echo "5. Creando enlace simbólico..."
ln -sf /etc/nginx/sites-available/router.psivisionhub.com /etc/nginx/sites-enabled/
echo "   ✓ Enlace creado"

# 6. Verificar configuración
echo ""
echo "6. Verificando configuración Nginx..."
if nginx -t; then
    echo "   ✓ Configuración válida"
else
    echo "   ❌ Error en la configuración"
    exit 1
fi

# 7. Instalar Certbot si no está instalado
echo ""
echo "7. Verificando Certbot..."
if ! command -v certbot &> /dev/null; then
    echo "   Instalando Certbot..."
    apt install -y certbot python3-certbot-nginx
else
    echo "   ✓ Certbot ya está instalado"
fi

# 8. Obtener certificado SSL
echo ""
echo "8. Obteniendo certificado SSL..."
if [ -f "/etc/letsencrypt/live/router.psivisionhub.com/fullchain.pem" ]; then
    echo "   ✓ Certificado SSL ya existe"
else
    echo "   Obteniendo nuevo certificado..."
    certbot certonly --nginx -d router.psivisionhub.com --non-interactive --agree-tos --email admin@psivisionhub.com || {
        echo "   ⚠ Error obteniendo certificado. Continuando sin SSL..."
        # Comentar líneas SSL en la configuración
        sed -i 's/ssl_certificate/#ssl_certificate/g' /etc/nginx/sites-available/router.psivisionhub.com
        sed -i 's/listen 443 ssl/listen 443/g' /etc/nginx/sites-available/router.psivisionhub.com
    }
fi

# 9. Recargar Nginx
echo ""
echo "9. Recargando Nginx..."
systemctl reload nginx || systemctl restart nginx
echo "   ✓ Nginx recargado"

# 10. Verificar que funciona
echo ""
echo "10. Verificando funcionamiento..."
sleep 2
if curl -s http://localhost/api/router/whatsapp/webhook > /dev/null; then
    echo "   ✓ Router responde localmente"
else
    echo "   ⚠ Router no responde localmente. Verifica PM2."
fi

# 11. Configurar auto-renovación SSL
echo ""
echo "11. Configurando auto-renovación SSL..."
systemctl enable certbot.timer
systemctl start certbot.timer
echo "   ✓ Auto-renovación configurada"

echo ""
echo "=== CONFIGURACIÓN COMPLETADA ==="
echo ""
echo "Prueba el router con:"
echo "  curl https://router.psivisionhub.com/api/router/whatsapp/webhook"
echo ""
echo "Ver logs con:"
echo "  tail -f /var/log/nginx/router-access.log"
echo "  tail -f /var/log/nginx/router-error.log"

