# 🔧 Restaurar Archivo Corrupto en Servidor

## ⚠️ Situación Actual
- Archivo `lib/router/processor.ts` está corrupto
- Ya se hizo commit del archivo corrupto
- Problema de autenticación con GitHub (secundario)

## ✅ Solución: Restaurar desde GitHub

```bash
cd /opt/psi-vision-hub

# Opción 1: Restaurar desde origin/master (recomendado)
git fetch origin
git checkout origin/master -- lib/router/processor.ts

# Opción 2: Restaurar desde commit anterior
git checkout HEAD~1 -- lib/router/processor.ts

# Verificar que está correcto
head -10 lib/router/processor.ts
# Debe mostrar: "// Procesador de mensajes del Router WSP4"

# Rebuild
npm run build

# Restart
pm2 restart psi-vision-hub

# Ver logs
pm2 logs psi-vision-hub --lines 30
```

## 🔐 Fix de Autenticación Git (Opcional, después)

Si necesitas hacer push en el futuro:

```bash
# Configurar token de acceso personal
git remote set-url origin https://[TU_TOKEN]@github.com/MarianoF2025/psi-vision-hub.git

# O usar SSH (si tienes clave configurada)
git remote set-url origin git@github.com:MarianoF2025/psi-vision-hub.git
```

Pero por ahora, **NO es necesario hacer push**. Solo restaurar el archivo y rebuild.

