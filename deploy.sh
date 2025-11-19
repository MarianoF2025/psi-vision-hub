#!/bin/bash

# Script de deploy rápido para servidor
# Uso: ./deploy.sh

set -e  # Salir si hay error

echo "🚀 Iniciando deploy..."

cd /opt/psi-vision-hub

echo "📥 Pulling latest changes..."
git pull origin master

echo "📦 Instalando dependencias (si hay cambios)..."
npm install

echo "🔨 Building aplicación..."
npm run build

echo "🔄 Reiniciando PM2..."
pm2 restart psi-vision-hub

echo "📋 Últimos logs:"
pm2 logs psi-vision-hub --lines 20 --nostream

echo "✅ Deploy completado!"
