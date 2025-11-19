# Resolver Conflicto de Git

## Problema
Git detectó cambios locales en `lib/router/processor.ts` que entrarían en conflicto.

## Solución

**Ejecutar en el servidor:**

```bash
cd /opt/psi-vision-hub

# 1. Ver qué cambios locales hay
git status

# 2. Descartar cambios locales (queremos el código nuevo del repo)
git checkout -- lib/router/processor.ts

# 3. Ahora hacer pull de nuevo
git pull origin master

# 4. Verificar que se actualizó
git log --oneline -1

# 5. Limpiar y rebuild
rm -rf .next
npm run build

# 6. Reiniciar PM2
pm2 restart psi-vision-hub

# 7. Ver logs
pm2 logs psi-vision-hub --lines 50
```

## Alternativa: Forzar el pull

Si querés forzar el pull descartando todos los cambios locales:

```bash
cd /opt/psi-vision-hub
git fetch origin
git reset --hard origin/master
rm -rf .next
npm run build
pm2 restart psi-vision-hub
```

