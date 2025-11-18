#!/bin/bash

# Script para limpiar y reconstruir la aplicación en el servidor

echo "🔄 Limpiando build anterior..."
cd /opt/psi-vision-hub

# Detener PM2
echo "⏸️  Deteniendo PM2..."
pm2 stop psi-vision-hub || true

# Limpiar build anterior
echo "🧹 Limpiando .next y node_modules/.cache..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .swc

# Reinstalar dependencias (por si acaso)
echo "📦 Reinstalando dependencias..."
npm ci --production=false

# Reconstruir
echo "🔨 Construyendo aplicación..."
npm run build

# Verificar que el build se completó
if [ ! -d ".next" ]; then
    echo "❌ Error: El build no se completó correctamente"
    exit 1
fi

# Reiniciar PM2
echo "▶️  Reiniciando PM2..."
pm2 restart psi-vision-hub

# Mostrar logs
echo "📋 Últimos logs:"
pm2 logs psi-vision-hub --lines 20 --nostream

echo "✅ Rebuild completado"

