# Comandos para Ejecutar Directamente en el Servidor

## Paso 1: Identificar Interferencias

```bash
echo "=== IDENTIFICACIÓN DE INTERFERENCIAS ==="
echo ""
echo "1. SERVICIOS DOCKER RELACIONADOS CON ROUTER:"
docker service ls | grep -i router || echo "   ✓ No hay servicios Docker con 'router'"
echo ""
echo "2. STACKS DOCKER:"
docker stack ls
echo ""
echo "3. CONTENEDORES RELACIONADOS CON ROUTER:"
docker ps -a | grep -i router || echo "   ✓ No hay contenedores con 'router'"
echo ""
echo "4. PROCESOS PM2:"
pm2 list
echo ""
echo "5. PUERTOS EN USO:"
echo "   Puerto 3001:"
lsof -i :3001 2>/dev/null || echo "   ✓ Libre"
echo ""
echo "6. CONFIGURACIONES TRAEFIK RELACIONADAS:"
find /opt -name "*router*" -type f 2>/dev/null | head -10 || echo "   ✓ No se encontraron archivos relacionados"
```

## Paso 2: Limpiar Sistema Viejo

```bash
echo "=== LIMPIEZA COMPLETA DEL SISTEMA VIEJO ==="
echo ""

# Eliminar servicios Docker relacionados
echo "1. Eliminando servicios Docker relacionados..."
docker service ls | grep -i router | awk '{print $1}' | while read service_id; do
    if [ ! -z "$service_id" ]; then
        echo "   Eliminando servicio: $service_id"
        docker service rm $service_id 2>/dev/null || true
    fi
done

# Eliminar stacks
echo ""
echo "2. Eliminando stacks Docker..."
docker stack ls | grep -E "(router|psi-router|router-psi)" | awk '{print $1}' | while read stack_name; do
    if [ ! -z "$stack_name" ]; then
        echo "   Eliminando stack: $stack_name"
        docker stack rm $stack_name 2>/dev/null || true
    fi
done

# Eliminar contenedores
echo ""
echo "3. Eliminando contenedores relacionados..."
docker ps -a | grep -i router | awk '{print $1}' | while read container_id; do
    if [ ! -z "$container_id" ]; then
        echo "   Eliminando contenedor: $container_id"
        docker rm -f $container_id 2>/dev/null || true
    fi
done

# Eliminar procesos PM2 relacionados con router viejo
echo ""
echo "4. Verificando procesos PM2..."
pm2 list | grep -i router | awk '{print $2}' | while read pm2_id; do
    if [ ! -z "$pm2_id" ]; then
        echo "   Eliminando proceso PM2: $pm2_id"
        pm2 delete $pm2_id 2>/dev/null || true
    fi
done

# Esperar
echo ""
echo "5. Esperando a que se completen las eliminaciones..."
sleep 10

# Verificar estado final
echo ""
echo "=== ESTADO FINAL ==="
docker service ls
echo ""
docker stack ls
echo ""
pm2 list
```

## Paso 3: Verificar que el Puerto 3001 Está Libre

```bash
# Verificar qué está usando el puerto 3001
lsof -i :3001 || echo "Puerto 3001 está libre"

# Si hay algo, matarlo
# (Reemplaza PID con el número que aparezca)
# kill -9 PID
```

## Paso 4: Desplegar Router Nuevo

```bash
cd /opt/psi-vision-hub

# Asegurar que el código está actualizado
npm install
npm run build

# Iniciar con PM2
pm2 delete psi-vision-hub 2>/dev/null || true
pm2 start "npm run start" --name psi-vision-hub
pm2 save

# Verificar que está corriendo
pm2 logs psi-vision-hub --lines 20
```

## Paso 5: Verificar Funcionamiento

```bash
# Probar localmente
curl http://localhost:3001/api/router/whatsapp/webhook

# Probar vía Traefik
curl https://router.psivisionhub.com/api/router/whatsapp/webhook
```

