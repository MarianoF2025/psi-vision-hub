# 🔧 Fix: Archivo Corrupto en Servidor

## ❌ Problema
El archivo `lib/router/processor.ts` se corrompió al pegar comandos dentro del código.

## ✅ Solución

### Opción 1: Restaurar desde Git (Recomendado)

```bash
cd /opt/psi-vision-hub

# Descartar cambios locales corruptos
git checkout -- lib/router/processor.ts

# O restaurar desde el último commit
git restore lib/router/processor.ts

# Verificar que está correcto
head -20 lib/router/processor.ts

# Rebuild
npm run build

# Restart
pm2 restart psi-vision-hub
```

### Opción 2: Pull desde GitHub

```bash
cd /opt/psi-vision-hub

# Descartar cambios locales
git reset --hard HEAD

# Pull último código
git pull origin master

# Rebuild
npm run build

# Restart
pm2 restart psi-vision-hub
```

### Opción 3: Si ya hiciste commit del archivo corrupto

```bash
cd /opt/psi-vision-hub

# Revertir último commit (si solo tiene el archivo corrupto)
git revert HEAD

# O restaurar desde commit anterior
git checkout HEAD~1 -- lib/router/processor.ts
git commit -m "Fix: Restaurar processor.ts corrupto"

# Rebuild
npm run build
pm2 restart psi-vision-hub
```

## ⚠️ Prevención

Para editar archivos en servidor:
1. Usar `git pull` primero para tener la última versión
2. Editar solo las líneas necesarias
3. Verificar con `head` o `cat` antes de build
4. Si algo sale mal, usar `git checkout -- archivo` para restaurar

