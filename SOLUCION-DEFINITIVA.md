# Solución Definitiva: Limpiar Sistema Viejo y Desplegar Router Nuevo

## Problema
El sistema viejo del router está interfiriendo con el nuevo deployment, causando 504 Gateway Timeout.

## Solución en 3 Pasos

### Paso 1: Identificar Interferencias
```bash
chmod +x identificar-interferencias.sh
./identificar-interferencias.sh
```

Esto mostrará:
- Servicios Docker relacionados con router viejo
- Stacks Docker activos
- Contenedores huérfanos
- Procesos PM2
- Puertos en uso
- Configuraciones de Traefik

### Paso 2: Limpiar Sistema Viejo
```bash
chmod +x limpiar-sistema-viejo.sh
./limpiar-sistema-viejo.sh
```

Esto eliminará:
- ✅ Todos los servicios Docker relacionados con router viejo
- ✅ Todos los stacks Docker relacionados
- ✅ Contenedores huérfanos
- ✅ Imágenes relacionadas
- ✅ Configuraciones de Traefik obsoletas
- ✅ Procesos PM2 del router viejo

### Paso 3: Desplegar Router Nuevo

#### Opción A: Con PM2 (Recomendado - Más Simple)
```bash
cd /opt/psi-vision-hub

# 1. Asegurar que el código está actualizado
git pull  # o copiar archivos actualizados

# 2. Instalar dependencias si es necesario
npm install

# 3. Build
npm run build

# 4. Iniciar con PM2
pm2 delete psi-vision-hub 2>/dev/null || true
pm2 start "npm run start" --name psi-vision-hub
pm2 save
```

#### Opción B: Con Docker (Si prefieres contenedorización)
```bash
cd /opt/psi-vision-hub

# 1. Build de la imagen
docker build -t psi-vision-hub-router:latest .

# 2. Crear servicio Docker Swarm
docker service create \
  --name psi-router \
  --network PsiNet \
  --publish 3001:3001 \
  --env-file .env.local \
  --replicas 1 \
  --restart-condition on-failure \
  --label "traefik.enable=true" \
  --label "traefik.http.routers.router-psi.rule=Host(\`router.psivisionhub.com\`)" \
  --label "traefik.http.routers.router-psi.entrypoints=websecure" \
  --label "traefik.http.routers.router-psi.tls=true" \
  --label "traefik.http.routers.router-psi.tls.certresolver=letsencrypt" \
  --label "traefik.http.services.router-psi.loadbalancer.server.port=3001" \
  --label "traefik.docker.network=PsiNet" \
  psi-vision-hub-router:latest
```

## Verificación Final

```bash
# 1. Verificar que el router está corriendo
curl http://localhost:3001/api/router/whatsapp/webhook

# 2. Verificar que Traefik puede alcanzarlo
curl https://router.psivisionhub.com/api/router/whatsapp/webhook

# 3. Ver logs
pm2 logs psi-vision-hub  # Si usas PM2
# o
docker service logs psi-router  # Si usas Docker
```

## Si Aún Hay Problemas

1. **Verificar que Traefik está en la red PsiNet:**
   ```bash
   docker service inspect psi-traefik_traefik --format '{{json .Spec.TaskTemplate.Networks}}' | python3 -m json.tool
   ```

2. **Verificar que el router está en la red PsiNet:**
   ```bash
   docker service inspect psi-router --format '{{json .Spec.TaskTemplate.Networks}}' | python3 -m json.tool
   ```

3. **Reiniciar Traefik para que detecte el nuevo servicio:**
   ```bash
   docker service update --force psi-traefik_traefik
   ```

## Notas Importantes

- ⚠️ **NO elimines el servicio de Traefik** (`psi-traefik_traefik`)
- ⚠️ **NO elimines la red PsiNet**
- ⚠️ Solo elimina servicios/stacks relacionados con **router viejo**
- ✅ El nuevo router debe estar en la misma red que Traefik (`PsiNet`)
- ✅ El puerto 3001 debe estar libre antes de desplegar

