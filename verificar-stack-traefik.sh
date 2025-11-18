#!/bin/bash
# Verificar configuración del stack de Traefik

echo "=== Configuración Stack Traefik ==="
echo ""

# 1. Ver en qué directorio está el stack de Traefik
echo "1. Buscando archivos docker-compose de Traefik:"
find /opt /root /home -name "*traefik*.yml" -o -name "*traefik*.yaml" 2>/dev/null | head -5
echo ""

# 2. Ver configuración completa del servicio Traefik
echo "2. Configuración completa del servicio:"
docker service inspect psi-traefik_traefik --format '{{json .Spec}}' | python3 -m json.tool | head -100
echo ""

# 3. Ver específicamente la configuración de puertos
echo "3. Configuración de puertos (EndpointSpec):"
docker service inspect psi-traefik_traefik --format '{{json .Spec.EndpointSpec}}' | python3 -m json.tool
echo ""

# 4. Ver argumentos completos de Traefik
echo "4. Argumentos completos de Traefik:"
docker service inspect psi-traefik_traefik --format '{{json .Spec.TaskTemplate.ContainerSpec.Args}}' | python3 -m json.tool
echo ""

echo "=== Fin ==="

