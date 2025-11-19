#!/bin/bash

# Script para eliminar completamente el Router del CRM
# USO: ./limpiar-router-del-crm.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧹 LIMPIEZA COMPLETA DEL ROUTER DEL CRM"
echo "========================================"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encontró package.json${NC}"
    echo "   Ejecutar este script desde la raíz del proyecto CRM"
    exit 1
fi

# 1. Buscar referencias al Router
echo "🔍 Paso 1: Buscando referencias al Router..."
echo ""

ROUTER_REFS=$(grep -r "lib/router" app/ components/ lib/ 2>/dev/null | grep -v node_modules || true)
ROUTER_PROCESSOR=$(grep -r "RouterProcessor" app/ components/ lib/ 2>/dev/null | grep -v node_modules || true)
ROUTER_IMPORTS=$(grep -r "from.*router" app/ components/ lib/ 2>/dev/null | grep -v node_modules || true)

if [ -n "$ROUTER_REFS" ] || [ -n "$ROUTER_PROCESSOR" ] || [ -n "$ROUTER_IMPORTS" ]; then
    echo -e "${YELLOW}⚠️  Se encontraron referencias al Router:${NC}"
    echo ""
    if [ -n "$ROUTER_REFS" ]; then
        echo "$ROUTER_REFS"
        echo ""
    fi
    if [ -n "$ROUTER_PROCESSOR" ]; then
        echo "$ROUTER_PROCESSOR"
        echo ""
    fi
    if [ -n "$ROUTER_IMPORTS" ]; then
        echo "$ROUTER_IMPORTS"
        echo ""
    fi
    echo -e "${YELLOW}⚠️  Estas referencias deben eliminarse manualmente antes de continuar${NC}"
    echo ""
    read -p "¿Deseas continuar de todas formas? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Limpieza cancelada${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ No se encontraron referencias al Router${NC}"
    echo ""
fi

# 2. Verificar que el Router nuevo está funcionando
echo "🔍 Paso 2: Verificando que el Router nuevo está funcionando..."
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Asegúrate de que:${NC}"
echo "   1. El Router nuevo está deployado y funcionando"
echo "   2. El webhook de WhatsApp apunta al Router nuevo"
echo "   3. Los mensajes se están procesando correctamente"
echo ""
read -p "¿El Router nuevo está funcionando correctamente? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Limpieza cancelada - Deployar Router nuevo primero${NC}"
    exit 1
fi

# 3. Crear backup
echo ""
echo "💾 Paso 3: Creando backup..."
git add . || true
git commit -m "Backup antes de eliminar Router del CRM" || echo "⚠️  No se pudo crear commit (puede ser normal si no hay cambios)"
echo -e "${GREEN}✅ Backup creado${NC}"
echo ""

# 4. Eliminar directorios
echo "🗑️  Paso 4: Eliminando directorios del Router..."
echo ""

if [ -d "lib/router" ]; then
    echo "   Eliminando lib/router/..."
    rm -rf lib/router/
    echo -e "${GREEN}   ✅ lib/router/ eliminado${NC}"
else
    echo -e "${YELLOW}   ⚠️  lib/router/ no existe${NC}"
fi

if [ -d "app/api/router" ]; then
    echo "   Eliminando app/api/router/..."
    rm -rf app/api/router/
    echo -e "${GREEN}   ✅ app/api/router/ eliminado${NC}"
else
    echo -e "${YELLOW}   ⚠️  app/api/router/ no existe${NC}"
fi

echo ""

# 5. Verificar build
echo "🔨 Paso 5: Verificando build..."
echo ""

if npm run build; then
    echo -e "${GREEN}✅ Build exitoso${NC}"
else
    echo -e "${RED}❌ Error en build${NC}"
    echo "   Revisar errores y corregir antes de continuar"
    exit 1
fi

echo ""

# 6. Verificación final
echo "🔍 Paso 6: Verificación final..."
echo ""

FINAL_REFS=$(grep -r "lib/router" app/ components/ lib/ 2>/dev/null | grep -v node_modules || true)
FINAL_PROCESSOR=$(grep -r "RouterProcessor" app/ components/ lib/ 2>/dev/null | grep -v node_modules || true)

if [ -n "$FINAL_REFS" ] || [ -n "$FINAL_PROCESSOR" ]; then
    echo -e "${YELLOW}⚠️  Aún quedan referencias al Router:${NC}"
    echo ""
    if [ -n "$FINAL_REFS" ]; then
        echo "$FINAL_REFS"
    fi
    if [ -n "$FINAL_PROCESSOR" ]; then
        echo "$FINAL_PROCESSOR"
    fi
    echo ""
    echo -e "${YELLOW}⚠️  Eliminar estas referencias manualmente${NC}"
else
    echo -e "${GREEN}✅ No quedan referencias al Router${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅✅✅ LIMPIEZA COMPLETADA ✅✅✅${NC}"
echo "========================================"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Revisar variables de entorno (.env.local)"
echo "   2. Eliminar variables del Router (CLOUD_API_*, N8N_WEBHOOK_*)"
echo "   3. Actualizar README.md (eliminar sección del Router)"
echo "   4. Commit de limpieza: git add . && git commit -m 'chore: Eliminar Router del CRM'"
echo ""

