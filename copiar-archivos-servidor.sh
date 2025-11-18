#!/bin/bash

# Script para copiar archivos modificados al servidor manualmente
# Uso: ./copiar-archivos-servidor.sh

echo "📋 Archivos que se copiarán:"
echo "  - lib/router/processor.ts"
echo "  - components/crm/ChatPanel.tsx"
echo "  - app/api/messages/send/route.ts"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "lib/router/processor.ts" ]; then
    echo "❌ Error: No se encuentra lib/router/processor.ts"
    echo "   Asegúrate de estar en el directorio raíz del proyecto"
    exit 1
fi

echo "✅ Archivos encontrados. Listo para copiar."
echo ""
echo "Para copiar manualmente, ejecuta estos comandos en el servidor:"
echo ""
echo "--- COMANDOS PARA EJECUTAR EN EL SERVIDOR ---"
echo ""
echo "# 1. Hacer backup de los archivos actuales"
echo "cd /opt/psi-vision-hub"
echo "mkdir -p /root/backups/$(date +%Y%m%d)"
echo "cp lib/router/processor.ts /root/backups/$(date +%Y%m%d)/processor.ts"
echo "cp components/crm/ChatPanel.tsx /root/backups/$(date +%Y%m%d)/ChatPanel.tsx"
echo "cp app/api/messages/send/route.ts /root/backups/$(date +%Y%m%d)/route.ts"
echo ""
echo "# 2. Crear los archivos nuevos (copiar y pegar el contenido)"
echo "# O usar scp desde tu máquina local:"
echo "# scp lib/router/processor.ts root@161.97.136.77:/opt/psi-vision-hub/lib/router/processor.ts"
echo "# scp components/crm/ChatPanel.tsx root@161.97.136.77:/opt/psi-vision-hub/components/crm/ChatPanel.tsx"
echo "# scp app/api/messages/send/route.ts root@161.97.136.77:/opt/psi-vision-hub/app/api/messages/send/route.ts"
echo ""
echo "# 3. Reconstruir y reiniciar"
echo "cd /opt/psi-vision-hub"
echo "npm run build"
echo "pm2 restart psi-vision-hub"
echo ""
echo "--- FIN DE COMANDOS ---"

