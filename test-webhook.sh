#!/bin/bash

# Script para probar el webhook del Router PSI

echo "🧪 Probando webhook del Router PSI..."
echo ""

# URL del endpoint
URL="https://app.psivisionhub.com/api/router/whatsapp/webhook"

# Payload de prueba
PAYLOAD='{
  "messages": [
    {
      "from": "5491112345678",
      "id": "wamid.TEST'$(date +%s)'",
      "timestamp": "'$(date +%s)'",
      "type": "text",
      "text": {
        "body": "Hola, este es un mensaje de prueba desde el script"
      }
    }
  ],
  "metadata": {
    "display_phone_number": "5491156090819",
    "phone_number_id": "809951985523815"
  }
}'

echo "📤 Enviando payload:"
echo "$PAYLOAD" | jq '.' 2>/dev/null || echo "$PAYLOAD"
echo ""

# Enviar request
echo "📡 Enviando request a $URL..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Separar body y status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "📥 Respuesta (HTTP $HTTP_CODE):"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ Webhook respondió correctamente"
else
  echo "❌ Webhook respondió con error (HTTP $HTTP_CODE)"
fi

echo ""
echo "📋 Para ver los logs del servidor:"
echo "   pm2 logs psi-vision-hub --lines 50"

