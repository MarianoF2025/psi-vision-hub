#!/bin/bash
# Comandos para crear y desplegar socat proxy en el servidor

# Crear archivo docker-compose.socat-proxy.yml
cat > docker-compose.socat-proxy.yml << 'EOF'
version: '3.8'

services:
  router-socat-proxy:
    image: alpine/socat:latest
    command: TCP-LISTEN:80,fork,reuseaddr TCP-CONNECT:172.17.0.1:3001
    networks:
      - public
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      labels:
        # Habilitar Traefik
        - "traefik.enable=true"
        # Router principal
        - "traefik.http.routers.router-psi.rule=Host(`router.psivisionhub.com`)"
        - "traefik.http.routers.router-psi.entrypoints=websecure"
        - "traefik.http.routers.router-psi.tls=true"
        - "traefik.http.routers.router-psi.tls.certresolver=letsencrypt"
        # Servicio
        - "traefik.http.services.router-psi.loadbalancer.server.port=80"
        # Red
        - "traefik.docker.network=public"

networks:
  public:
    external: true
EOF

echo "✅ Archivo creado"
cat docker-compose.socat-proxy.yml

echo ""
echo "🚀 Desplegando servicio..."
docker stack deploy -c docker-compose.socat-proxy.yml router-socat

echo ""
echo "📋 Verificando servicio..."
sleep 3
docker service ls | grep router-socat

