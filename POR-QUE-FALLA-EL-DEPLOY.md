# ¿Por qué falla el deploy repetidamente?

## 🔍 Análisis del Problema

### Problemas Identificados

1. **Git no sincroniza correctamente**
   - Cambios locales que interfieren
   - Pull falla silenciosamente
   - Código antiguo queda en el servidor

2. **Build cacheado**
   - Next.js cachea el build anterior
   - `.next` no se limpia completamente
   - PM2 puede estar usando código compilado antiguo

3. **PM2 no reinicia correctamente**
   - PM2 puede cachear el proceso
   - No siempre recarga el código nuevo
   - Logs pueden mostrar código antiguo

4. **Falta de verificación**
   - No se verifica que el código nuevo se descargó
   - No se verifica que el build usó código nuevo
   - No se verifica que PM2 está usando código nuevo

## ✅ Solución: Script de Deploy Robusto

He creado `deploy-robusto.sh` que:

1. **Verifica cada paso** antes de continuar
2. **Limpia TODO** (Git, build, cache, logs)
3. **Verifica que el código nuevo está presente** antes de build
4. **Verifica que el build fue exitoso** después
5. **Verifica que PM2 está corriendo** el código nuevo
6. **Muestra logs** para confirmación

## 🚀 Uso

```bash
cd /opt/psi-vision-hub
chmod +x deploy-robusto.sh
bash deploy-robusto.sh
```

## 🔧 Mejoras Implementadas

### 1. Verificación de Código Nuevo
```bash
# Verifica que el código nuevo está presente ANTES de build
if grep -q "ANTI_LOOP_SECONDS" lib/router/processor.ts; then
    echo "✅ Código nuevo detectado"
else
    echo "❌ Error: Código nuevo NO encontrado"
    exit 1
fi
```

### 2. Limpieza Completa
```bash
# Limpia TODO
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache
npm cache clean --force
pm2 flush
```

### 3. Verificación de Build
```bash
# Verifica que el build fue exitoso
if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ Error: Build falló"
    exit 1
fi
```

### 4. Verificación de PM2
```bash
# Verifica que PM2 está online
PM2_STATUS=$(pm2 status | grep psi-vision-hub | awk '{print $10}')
if [ "$PM2_STATUS" != "online" ]; then
    echo "❌ Error: PM2 no está online"
    exit 1
fi
```

## 📊 Flujo del Script

```
1. Verificar directorio ✅
2. Estado de Git ANTES ✅
3. Descartar cambios locales ✅
4. Pull/Reset forzado ✅
5. Verificar commit nuevo ✅
6. Verificar código nuevo presente ✅
7. Limpiar build anterior ✅
8. Verificar limpieza ✅
9. Reinstalar dependencias ✅
10. Build ✅
11. Verificar build exitoso ✅
12. Detener PM2 ✅
13. Limpiar logs ✅
14. Reiniciar PM2 ✅
15. Esperar inicio ✅
16. Verificar PM2 online ✅
17. Verificar código nuevo corriendo ✅
18. Mostrar resumen ✅
19. Mostrar logs ✅
```

## 🎯 Por Qué Funciona

1. **Reset forzado**: `git reset --hard origin/master` descarta TODO y fuerza el código nuevo
2. **Limpieza completa**: Elimina TODOS los caches posibles
3. **Verificación en cada paso**: Si algo falla, se detiene inmediatamente
4. **Build desde cero**: Garantiza que el build usa código nuevo
5. **PM2 limpio**: Detiene, limpia logs, y reinicia desde cero

## 🐛 Si Aún Falla

Si después de usar `deploy-robusto.sh` sigue fallando:

1. **Verificar que el código está en GitHub:**
   ```bash
   # En tu máquina local
   git log --oneline -5
   git push origin master
   ```

2. **Verificar en el servidor:**
   ```bash
   cd /opt/psi-vision-hub
   git fetch origin
   git log origin/master --oneline -5
   ```

3. **Forzar reset completo:**
   ```bash
   cd /opt/psi-vision-hub
   git fetch origin
   git reset --hard origin/master
   git clean -fdx
   rm -rf .next node_modules/.cache
   npm install
   npm run build
   pm2 delete psi-vision-hub
   pm2 start npm --name "psi-vision-hub" -- start
   ```

