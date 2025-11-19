#!/bin/bash

# Script de deploy ROBUSTO con verificación en cada paso
# Uso: bash deploy-robusto.sh

set -e  # Salir si hay error

echo "🚀🚀🚀 DEPLOY ROBUSTO INICIADO 🚀🚀🚀"
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

# 2. Verificar estado de Git ANTES del pull
echo "📋 Paso 2: Estado de Git ANTES del pull..."
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

# 6. Verificar que el archivo tiene el código nuevo
echo "🔍 Paso 6: Verificando que el código nuevo está presente..."
if grep -q "ANTI_LOOP_SECONDS" lib/router/processor.ts; then
    echo -e "${GREEN}✅ Código nuevo detectado (ANTI_LOOP_SECONDS)${NC}"
else
    echo -e "${RED}❌ Error: Código nuevo NO encontrado${NC}"
    echo "   Verificando contenido del archivo..."
    head -30 lib/router/processor.ts | grep -i "anti_loop" || echo "   No se encontró ANTI_LOOP en las primeras 30 líneas"
    exit 1
fi
echo ""

# 7. Limpiar build anterior COMPLETAMENTE
echo "🧹 Paso 7: Limpiando build anterior..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache 2>/dev/null || true
npm cache clean --force 2>/dev/null || true
echo -e "${GREEN}✅ Build anterior limpiado${NC}"
echo ""

# 8. Verificar que .next fue eliminado
if [ -d ".next" ]; then
    echo -e "${RED}❌ Error: .next todavía existe${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Verificado: .next eliminado${NC}"
echo ""

# 9. Reinstalar dependencias (por si acaso)
echo "📦 Paso 8: Reinstalando dependencias..."
npm install --no-audit --no-fund
check_command "npm install"
echo ""

# 10. Construir aplicación
echo "🔨 Paso 9: Construyendo aplicación..."
npm run build
check_command "npm run build"
echo ""

# 11. Verificar que el build fue exitoso
echo "✅ Paso 10: Verificando que el build fue exitoso..."
if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Error: El build falló - no se creó el directorio .next${NC}"
    exit 1
fi

if [ ! -f ".next/BUILD_ID" ]; then
    echo -e "${RED}❌ Error: El build falló - no se creó BUILD_ID${NC}"
    exit 1
fi

BUILD_ID=$(cat .next/BUILD_ID)
echo "   - BUILD_ID: $BUILD_ID"
echo -e "${GREEN}✅ Build exitoso${NC}"
echo ""

# 12. Detener PM2
echo "🛑 Paso 11: Deteniendo PM2..."
pm2 stop psi-vision-hub 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ PM2 detenido${NC}"
echo ""

# 13. Limpiar logs de PM2
echo "🧹 Paso 12: Limpiando logs de PM2..."
pm2 flush 2>/dev/null || true
echo -e "${GREEN}✅ Logs limpiados${NC}"
echo ""

# 14. Reiniciar PM2
echo "🔄 Paso 13: Reiniciando PM2..."
pm2 restart psi-vision-hub || pm2 start npm --name "psi-vision-hub" -- start
check_command "PM2 restart"
echo ""

# 15. Esperar a que inicie
echo "⏳ Paso 14: Esperando a que PM2 inicie..."
sleep 5
echo ""

# 16. Verificar que está corriendo
echo "📊 Paso 15: Verificando estado de PM2..."
PM2_STATUS=$(pm2 status | grep psi-vision-hub | awk '{print $10}')
if [ "$PM2_STATUS" != "online" ]; then
    echo -e "${RED}❌ Error: PM2 no está online (estado: $PM2_STATUS)${NC}"
    pm2 status
    exit 1
fi
echo -e "${GREEN}✅ PM2 está online${NC}"
echo ""

# 17. Verificar que el código nuevo está corriendo
echo "🔍 Paso 16: Verificando que el código nuevo está corriendo..."
sleep 3
LOGS=$(pm2 logs psi-vision-hub --lines 20 --nostream 2>&1)

if echo "$LOGS" | grep -q "ANTI_LOOP_SECONDS\|🚀🚀🚀 RouterProcessor.processMessage INICIADO"; then
    echo -e "${GREEN}✅ Código nuevo detectado en logs${NC}"
else
    echo -e "${YELLOW}⚠️  No se detectó código nuevo en logs (puede ser normal si no hay mensajes recientes)${NC}"
    echo "   Últimas líneas de log:"
    echo "$LOGS" | tail -5
fi
echo ""

# 18. Mostrar resumen
echo "📋 Paso 17: Resumen del deploy..."
echo "   - Commit desplegado: $NEW_COMMIT"
echo "   - BUILD_ID: $BUILD_ID"
echo "   - PM2 estado: $PM2_STATUS"
echo "   - Directorio: $(pwd)"
echo ""

# 19. Mostrar logs recientes
echo "📋 Últimos logs (últimas 30 líneas):"
pm2 logs psi-vision-hub --lines 30 --nostream
echo ""

echo -e "${GREEN}✅✅✅ DEPLOY COMPLETADO EXITOSAMENTE ✅✅✅${NC}"
echo ""
echo "Para ver logs en tiempo real:"
echo "  pm2 logs psi-vision-hub --lines 100"
echo ""
echo "Para verificar que el código nuevo está corriendo, busca en los logs:"
echo "  🚀🚀🚀 RouterProcessor.processMessage INICIADO 🚀🚀🚀"
echo "  - Diferencia: X.X segundos"
echo "  - Ventana anti-loop: 30 segundos"

