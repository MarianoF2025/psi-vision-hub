#!/bin/bash

# Script para deployar el código nuevo con logging exhaustivo
# Ejecutar en el servidor: bash deploy-nuevo-codigo.sh

set -e  # Salir si hay error

echo "🚀 Iniciando deploy del código nuevo..."
echo ""

# 1. Ir al directorio del proyecto
cd /opt/psi-vision-hub || { echo "❌ Error: No se encontró /opt/psi-vision-hub"; exit 1; }

# 2. Verificar estado de Git
echo "📋 Verificando estado de Git..."
git status

# 3. Hacer pull del código nuevo
echo ""
echo "📥 Descargando código nuevo desde GitHub..."
git pull origin master

# 4. Verificar que se actualizó
echo ""
echo "✅ Último commit:"
git log --oneline -1

# 5. Limpiar build anterior
echo ""
echo "🧹 Limpiando build anterior..."
rm -rf .next
rm -rf node_modules/.cache

# 6. Reinstalar dependencias (por si acaso)
echo ""
echo "📦 Reinstalando dependencias..."
npm install

# 7. Construir aplicación
echo ""
echo "🔨 Construyendo aplicación..."
npm run build

# 8. Verificar que el build fue exitoso
if [ ! -d ".next" ]; then
    echo "❌ Error: El build falló - no se creó el directorio .next"
    exit 1
fi

echo "✅ Build exitoso"

# 9. Reiniciar PM2
echo ""
echo "🔄 Reiniciando PM2..."
pm2 restart psi-vision-hub

# 10. Esperar un momento para que inicie
sleep 3

# 11. Verificar que está corriendo
echo ""
echo "📊 Estado de PM2:"
pm2 status

# 12. Mostrar últimos logs
echo ""
echo "📋 Últimos logs (últimas 30 líneas):"
pm2 logs psi-vision-hub --lines 30 --nostream

echo ""
echo "✅✅✅ Deploy completado ✅✅✅"
echo ""
echo "Para ver logs en tiempo real, ejecuta:"
echo "  pm2 logs psi-vision-hub --lines 100"
echo ""
echo "Para verificar que el código nuevo está corriendo, busca en los logs:"
echo "  🚀🚀🚀 RouterProcessor.processMessage INICIADO 🚀🚀🚀"

