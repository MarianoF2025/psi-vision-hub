#!/bin/bash
# Comandos para configurar Traefik - Copiar y pegar en SSH

# 1. Crear directorio de configuración dinámica
mkdir -p /etc/traefik/dynamic

# 2. Crear archivo de configuración para router-psi
cat > /etc/traefik/dynamic/router-psi.yml << 'EOF'
http:
  routers:
    router-psi:
      rule: "Host(`router.psivisionhub.com`)"
      entryPoints:
        - websecure
      service: router-psi-service
      tls:
        certResolver: letsencrypt

  services:
    router-psi-service:
      loadBalancer:
        servers:
          - url: "http://host.docker.internal:3001"
EOF

# 3. Verificar que el archivo se creó
echo "✅ Archivo creado:"
ls -la /etc/traefik/dynamic/router-psi.yml
cat /etc/traefik/dynamic/router-psi.yml

# 4. Verificar nombre del servicio de Traefik
echo ""
echo "📋 Servicios de Traefik:"
docker service ls | grep traefik

# 5. Recargar Traefik (ejecutar después de verificar el nombre)
echo ""
echo "⚠️  IMPORTANTE: Ejecuta el siguiente comando con el nombre correcto del servicio:"
echo "   docker service update --force NOMBRE_DEL_SERVICIO_TRAEFIK"
echo ""
echo "   O si Traefik está como contenedor normal:"
echo "   docker restart traefik"

