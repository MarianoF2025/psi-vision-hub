#!/bin/bash

echo "🔍 DIAGNÓSTICO COMPLETO DEL ROUTER"
echo "=================================="
echo ""

echo "1️⃣ Verificando que PM2 está corriendo..."
pm2 status | grep psi-vision-hub || echo "❌ PM2 no está corriendo"
echo ""

echo "2️⃣ Verificando variables de entorno críticas..."
cd /opt/psi-vision-hub
if [ -f .env.local ]; then
    echo "✅ Archivo .env.local existe"
    echo "   - CLOUD_API_TOKEN: $(grep -q "CLOUD_API_TOKEN" .env.local && echo "✅ Presente" || echo "❌ Faltante")"
    echo "   - CLOUD_API_PHONE_NUMBER_ID: $(grep -q "CLOUD_API_PHONE_NUMBER_ID" .env.local && echo "✅ Presente" || echo "❌ Faltante")"
    echo "   - NEXT_PUBLIC_SUPABASE_URL: $(grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && echo "✅ Presente" || echo "❌ Faltante")"
    echo "   - SUPABASE_SERVICE_ROLE_KEY: $(grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local && echo "✅ Presente" || echo "❌ Faltante")"
else
    echo "❌ Archivo .env.local NO existe"
fi
echo ""

echo "3️⃣ Verificando que el endpoint está accesible..."
curl -I http://localhost:3001/api/router/whatsapp/webhook 2>&1 | head -3
echo ""

echo "4️⃣ Últimos 50 logs (buscando webhooks recibidos)..."
pm2 logs psi-vision-hub --lines 50 --nostream 2>&1 | grep -E "Webhook recibido|Mensaje raw recibido|processMessage INICIADO" | tail -10 || echo "   No se encontraron webhooks recientes"
echo ""

echo "5️⃣ Últimos errores críticos..."
pm2 logs psi-vision-hub --lines 200 --nostream 2>&1 | grep -E "❌|ERROR|Error|error" | tail -20 || echo "   No se encontraron errores recientes"
echo ""

echo "6️⃣ Verificando que el código nuevo está presente..."
if grep -q "Última interacción del USUARIO" lib/router/processor.ts; then
    echo "✅ Fix de anti-loop presente"
else
    echo "❌ Fix de anti-loop NO presente"
fi
echo ""

echo "7️⃣ Verificando configuración de WhatsApp API..."
if [ -n "$CLOUD_API_TOKEN" ] && [ -n "$CLOUD_API_PHONE_NUMBER_ID" ]; then
    echo "✅ Variables de entorno cargadas"
    echo "   - CLOUD_API_TOKEN: ${CLOUD_API_TOKEN:0:20}..."
    echo "   - CLOUD_API_PHONE_NUMBER_ID: $CLOUD_API_PHONE_NUMBER_ID"
else
    echo "❌ Variables de entorno NO cargadas (verificar .env.local)"
fi
echo ""

echo "8️⃣ Estado actual de PM2..."
pm2 show psi-vision-hub | grep -E "status|uptime|restarts" | head -5
echo ""

echo "✅ Diagnóstico completado"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "   1. Enviar un mensaje 'Hola' desde WhatsApp"
echo "   2. Ejecutar: pm2 logs psi-vision-hub --lines 200"
echo "   3. Buscar en los logs:"
echo "      - 'Webhook recibido'"
echo "      - 'processMessage INICIADO'"
echo "      - 'Enviando mensaje WhatsApp'"
echo "      - Cualquier línea con '❌' o 'ERROR'"

