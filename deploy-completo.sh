#!/bin/bash

# Script de deploy COMPLETO para replicar cambios locales en el servidor
# Incluye: Next.js App + Router PSI
# Uso: bash deploy-completo.sh

set -e  # Salir si hay error

echo "🚀🚀🚀 DEPLOY COMPLETO INICIADO 🚀🚀🚀"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar comandos
check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ Error en: $1${NC}"
        exit 1
    fi
}

# 1. Ir al directorio correcto
echo "📁 Paso 1: Verificando directorio..."
cd /opt/psi-vision-hub || { echo -e "${RED}❌ Error: No se encontró /opt/psi-vision-hub${NC}"; exit 1; }
echo -e "${GREEN}✅ Directorio correcto: $(pwd)${NC}"
echo ""

# 2. Verificar estado de Git
echo "📋 Paso 2: Estado de Git..."
echo "   - Commit actual:"
git log --oneline -1
echo "   - Cambios locales:"
git status --short
echo ""

# 3. Descartar cambios locales que puedan interferir
echo "🧹 Paso 3: Descartando cambios locales..."
git checkout -- . 2>/dev/null || true
git clean -fd 2>/dev/null || true
echo -e "${GREEN}✅ Cambios locales descartados${NC}"
echo ""

# 4. Hacer pull del código nuevo
echo "📥 Paso 4: Descargando código nuevo desde GitHub..."
git fetch origin master
git reset --hard origin/master
check_command "Git pull/reset"
echo ""

# 5. Verificar que se actualizó
echo "✅ Paso 5: Verificando que se actualizó..."
NEW_COMMIT=$(git log --oneline -1)
echo "   - Nuevo commit: $NEW_COMMIT"
if [ -z "$NEW_COMMIT" ]; then
    echo -e "${RED}❌ Error: No se pudo obtener el commit${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Código actualizado${NC}"
echo ""

# 6. Limpiar builds anteriores
echo "🧹 Paso 6: Limpiando builds anteriores..."
rm -rf .next
rm -rf router-psi/dist
rm -rf node_modules/.cache
rm -rf .next/cache 2>/dev/null || true
npm cache clean --force 2>/dev/null || true
echo -e "${GREEN}✅ Builds anteriores limpiados${NC}"
echo ""

# 7. Reinstalar dependencias del proyecto principal
echo "📦 Paso 7: Reinstalando dependencias del proyecto principal..."
npm install --no-audit --no-fund
check_command "npm install (proyecto principal)"
echo ""

# 8. Construir aplicación Next.js
echo "🔨 Paso 8: Construyendo aplicación Next.js..."
npm run build
check_command "npm run build (Next.js)"
echo ""

# 9. Verificar que el build de Next.js fue exitoso
echo "✅ Paso 9: Verificando build de Next.js..."
if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Error: El build de Next.js falló${NC}"
    exit 1
fi
BUILD_ID=$(cat .next/BUILD_ID 2>/dev/null || echo "N/A")
echo "   - BUILD_ID: $BUILD_ID"
echo -e "${GREEN}✅ Build de Next.js exitoso${NC}"
echo ""

# 10. Compilar Router PSI
echo "🔨 Paso 10: Compilando Router PSI..."
cd router-psi
npm install --no-audit --no-fund
check_command "npm install (Router PSI)"
npm run build
check_command "npm run build (Router PSI)"
cd ..
echo ""

# 11. Verificar que el build del Router fue exitoso
echo "✅ Paso 11: Verificando build del Router PSI..."
if [ ! -d "router-psi/dist" ]; then
    echo -e "${RED}❌ Error: El build del Router PSI falló${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build del Router PSI exitoso${NC}"
echo ""

# 12. Detener PM2 (si está corriendo)
echo "🛑 Paso 12: Deteniendo PM2..."
pm2 stop psi-vision-hub 2>/dev/null || true
pm2 stop router-psi 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ PM2 detenido${NC}"
echo ""

# 13. Limpiar logs de PM2
echo "🧹 Paso 13: Limpiando logs de PM2..."
pm2 flush 2>/dev/null || true
echo -e "${GREEN}✅ Logs limpiados${NC}"
echo ""

# 14. Reiniciar PM2 - Aplicación principal
echo "🔄 Paso 14: Reiniciando PM2 - Aplicación principal..."
pm2 restart psi-vision-hub || pm2 start npm --name "psi-vision-hub" -- start
check_command "PM2 restart (aplicación principal)"
echo ""

# 15. Reiniciar PM2 - Router PSI
echo "🔄 Paso 15: Reiniciando PM2 - Router PSI..."
cd router-psi
pm2 restart router-psi || pm2 start npm --name "router-psi" -- start
check_command "PM2 restart (Router PSI)"
cd ..
echo ""

# 16. Esperar a que inicien
echo "⏳ Paso 16: Esperando a que PM2 inicie..."
sleep 5
echo ""

# 17. Verificar que están corriendo
echo "📊 Paso 17: Verificando estado de PM2..."
PM2_APP_STATUS=$(pm2 status | grep psi-vision-hub | awk '{print $10}' || echo "unknown")
PM2_ROUTER_STATUS=$(pm2 status | grep router-psi | awk '{print $10}' || echo "unknown")

if [ "$PM2_APP_STATUS" = "online" ] || pm2 status | grep -q "psi-vision-hub.*online"; then
    echo -e "${GREEN}✅ Aplicación principal está online${NC}"
else
    echo -e "${YELLOW}⚠️  Estado de aplicación principal: $PM2_APP_STATUS${NC}"
fi

if [ "$PM2_ROUTER_STATUS" = "online" ] || pm2 status | grep -q "router-psi.*online"; then
    echo -e "${GREEN}✅ Router PSI está online${NC}"
else
    echo -e "${YELLOW}⚠️  Estado de Router PSI: $PM2_ROUTER_STATUS${NC}"
fi
echo ""

# 18. Mostrar resumen
echo "📋 Paso 18: Resumen del deploy..."
echo "   - Commit desplegado: $NEW_COMMIT"
echo "   - BUILD_ID (Next.js): $BUILD_ID"
echo "   - PM2 App estado: $PM2_APP_STATUS"
echo "   - PM2 Router estado: $PM2_ROUTER_STATUS"
echo "   - Directorio: $(pwd)"
echo ""

# 19. Mostrar logs recientes
echo "📋 Últimos logs de la aplicación principal (últimas 20 líneas):"
pm2 logs psi-vision-hub --lines 20 --nostream 2>/dev/null || echo "   No hay logs disponibles"
echo ""

echo "📋 Últimos logs del Router PSI (últimas 20 líneas):"
pm2 logs router-psi --lines 20 --nostream 2>/dev/null || echo "   No hay logs disponibles"
echo ""

echo -e "${GREEN}✅✅✅ DEPLOY COMPLETO EXITOSO ✅✅✅${NC}"
echo ""
echo "Para ver logs en tiempo real:"
echo "  pm2 logs psi-vision-hub --lines 100"
echo "  pm2 logs router-psi --lines 100"
echo ""
echo "Para verificar estado:"
echo "  pm2 status"
echo ""

