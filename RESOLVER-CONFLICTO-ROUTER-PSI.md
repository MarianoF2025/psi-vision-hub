# Resolver conflicto router-psi en servidor

## Problema
Git no puede hacer pull porque hay archivos locales en `router-psi/` que no están rastreados y entrarían en conflicto.

## Solución

### Opción 1: Hacer backup y luego pull (Recomendado)

```bash
# 1. Hacer backup de los archivos locales
cd /opt/psi-vision-hub
cp -r router-psi router-psi-backup

# 2. Eliminar los archivos locales (son los mismos que vienen del repo)
rm -rf router-psi

# 3. Hacer pull
git pull origin master

# 4. Verificar que todo esté bien
ls -la router-psi/

# 5. Si necesitas algo del backup, comparar:
diff -r router-psi router-psi-backup
```

### Opción 2: Forzar el merge (si estás seguro de que los archivos locales son iguales)

```bash
cd /opt/psi-vision-hub
git fetch origin
git reset --hard origin/master
```

**⚠️ ADVERTENCIA:** Esto eliminará todos los cambios locales no commiteados.

### Opción 3: Stash de cambios locales (si hay modificaciones importantes)

```bash
cd /opt/psi-vision-hub
git add router-psi/
git stash
git pull origin master
git stash pop  # Si necesitas recuperar algo
```

## Después del pull

1. Verificar que el build funcione:
```bash
npm run build
```

2. Reiniciar PM2:
```bash
pm2 restart psi-vision-hub
```

3. Verificar logs:
```bash
pm2 logs psi-vision-hub --lines 50
```

