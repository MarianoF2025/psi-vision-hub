#!/bin/bash
# Verificar configuración completa de Traefik

echo "=== Configuración Traefik ==="
echo ""

# 1. Ver todos los argumentos de Traefik
echo "1. Argumentos de Traefik:"
docker service inspect psi-traefik_traefik --format '{{json .Spec.TaskTemplate.ContainerSpec.Args}}' | python3 -m json.tool
echo ""

# 2. Ver puertos del servicio
echo "2. Puertos del servicio:"
docker service inspect psi-traefik_traefik --format '{{json .Endpoint.Ports}}' | python3 -m json.tool
echo ""

# 3. Ver configuración completa del servicio
echo "3. Configuración completa (puertos):"
docker service inspect psi-traefik_traefik --format '{{json .Spec.EndpointSpec}}' | python3 -m json.tool
echo ""

# 4. Ver logs de Traefik al iniciar
echo "4. Logs de inicio de Traefik:"
docker service logs psi-traefik_traefik | head -50
echo ""

echo "=== Fin ==="

