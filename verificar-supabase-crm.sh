#!/bin/bash

# Script de verificación de configuración Supabase para CRM
# Uso: ./verificar-supabase-crm.sh

echo "🔍 VERIFICACIÓN DE CONFIGURACIÓN SUPABASE - CRM"
echo "================================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar archivo .env.local
echo "1️⃣  Verificando archivo .env.local..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ Archivo .env.local existe${NC}"
else
    echo -e "${RED}❌ Archivo .env.local NO existe${NC}"
    echo "   Crear archivo .env.local en la raíz del proyecto"
    exit 1
fi

# Verificar variable NEXT_PUBLIC_SUPABASE_URL
echo ""
echo "2️⃣  Verificando NEXT_PUBLIC_SUPABASE_URL..."
if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
    URL=$(grep "NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [ -z "$URL" ] || [[ "$URL" == *"tu-proyecto"* ]] || [[ "$URL" == *"placeholder"* ]]; then
        echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL está vacío o es un placeholder${NC}"
        echo "   Valor actual: $URL"
    else
        echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_URL configurado${NC}"
        echo "   URL: $URL"
    fi
else
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL NO encontrado en .env.local${NC}"
fi

# Verificar variable NEXT_PUBLIC_SUPABASE_ANON_KEY
echo ""
echo "3️⃣  Verificando NEXT_PUBLIC_SUPABASE_ANON_KEY..."
if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local; then
    KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [ -z "$KEY" ] || [[ "$KEY" == *"tu_anon_key"* ]] || [[ "$KEY" == *"placeholder"* ]]; then
        echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY está vacío o es un placeholder${NC}"
        echo "   Valor actual: ${KEY:0:20}..."
    else
        echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_ANON_KEY configurado${NC}"
        echo "   Key (primeros 20 chars): ${KEY:0:20}..."
        
        # Verificar formato de JWT
        if [[ "$KEY" =~ ^eyJ ]]; then
            echo -e "${GREEN}   ✅ Formato JWT válido${NC}"
        else
            echo -e "${YELLOW}   ⚠️  El formato no parece ser un JWT válido${NC}"
        fi
    fi
else
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY NO encontrado en .env.local${NC}"
fi

# Verificar que las variables no tengan espacios al inicio
echo ""
echo "4️⃣  Verificando formato de variables..."
if grep -q "^NEXT_PUBLIC_SUPABASE" .env.local; then
    echo -e "${GREEN}✅ Variables empiezan al inicio de línea${NC}"
else
    echo -e "${YELLOW}⚠️  Posible problema de formato en .env.local${NC}"
fi

# Verificar conexión con Supabase (si está disponible curl)
echo ""
echo "5️⃣  Verificando conectividad con Supabase..."
if command -v curl &> /dev/null; then
    URL=$(grep "NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [ ! -z "$URL" ] && [[ "$URL" != *"tu-proyecto"* ]]; then
        # Test de conexión
        if curl -s -o /dev/null -w "%{http_code}" "$URL/rest/v1/" | grep -q "200\|401"; then
            echo -e "${GREEN}✅ Conexión con Supabase exitosa${NC}"
        else
            echo -e "${YELLOW}⚠️  No se pudo verificar la conexión (puede requerir autenticación)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Saltando verificación de conexión (URL no configurada)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  curl no disponible, saltando verificación de conexión${NC}"
fi

# Resumen
echo ""
echo "================================================"
echo "📋 RESUMEN"
echo "================================================"
echo ""
echo "Si todas las verificaciones pasan (✅), el CRM debería poder conectarse a Supabase."
echo ""
echo "Si hay errores (❌), sigue estos pasos:"
echo "1. Crea/edita .env.local en la raíz del proyecto"
echo "2. Agrega las variables:"
echo "   NEXT_PUBLIC_SUPABASE_URL=https://rbtczzjlvnymylkvcwdv.supabase.co"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_real"
echo "3. Reinicia el servidor: npm run dev"
echo ""
echo "Para más detalles, consulta: ANALISIS-ARQUITECTURA-CRM.md"





