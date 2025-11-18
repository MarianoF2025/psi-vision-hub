#!/bin/bash

# Script de deployment rápido para el servidor
# Uso: ./deploy.sh

set -e  # Salir si hay errores

echo "🚀 Iniciando deployment..."

cd /opt/psi-vision-hub

echo "📥 Actualizando código desde GitHub..."
git pull origin master

if [ $? -ne 0 ]; then
    echo "❌ Error al hacer pull. Verificar conexión a GitHub."
    exit 1
fi

echo "🔨 Construyendo aplicación..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error en el build. Revisar errores."
    exit 1
fi

echo "🔄 Reiniciando PM2..."
pm2 restart psi-vision-hub

if [ $? -ne 0 ]; then
    echo "❌ Error al reiniciar PM2."
    exit 1
fi

echo "✅ Deployment completado exitosamente"
echo ""
echo "📋 Estado de PM2:"
pm2 status

echo ""
echo "📝 Últimos logs (10 líneas):"
pm2 logs psi-vision-hub --lines 10 --nostream

