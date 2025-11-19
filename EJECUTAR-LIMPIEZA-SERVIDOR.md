# 🧹 Ejecutar Limpieza del Router en el Servidor

## 📋 Pasos en el Servidor

### 1. Actualizar Código desde GitHub

```bash
cd /opt/psi-vision-hub
git pull origin master
```

### 2. Verificar que el Script Existe

```bash
ls -la limpiar-router-del-crm.sh
```

### 3. Dar Permisos de Ejecución

```bash
chmod +x limpiar-router-del-crm.sh
```

### 4. Ejecutar el Script

```bash
./limpiar-router-del-crm.sh
```

---

## ⚠️ IMPORTANTE: Antes de Ejecutar

**Asegúrate de que:**
1. ✅ Router nuevo está deployado y funcionando
2. ✅ Webhook de WhatsApp apunta al Router nuevo
3. ✅ Mensajes se están procesando correctamente

**Si el Router nuevo NO está listo:**
- ❌ NO ejecutar la limpieza
- ⚠️ Esperar hasta que el Router nuevo esté funcionando

---

## 🔄 Si el Script No Existe Después del Pull

Si después de `git pull` el script no aparece:

```bash
# Verificar que estás en el directorio correcto
pwd
# Debe mostrar: /opt/psi-vision-hub

# Verificar que el archivo existe en el repo
git ls-files | grep limpiar-router

# Si no aparece, crear el script manualmente
cat > limpiar-router-del-crm.sh << 'EOF'
#!/bin/bash
# ... (contenido del script)
EOF

chmod +x limpiar-router-del-crm.sh
```

---

## 📝 Alternativa: Limpieza Manual

Si prefieres hacer la limpieza manualmente:

```bash
# 1. Crear backup
git add .
git commit -m "Backup antes de eliminar Router del CRM"
git tag backup-antes-limpiar-router

# 2. Eliminar directorios
rm -rf lib/router/
rm -rf app/api/router/

# 3. Verificar build
npm run build

# 4. Verificar que no quedan referencias
grep -r "lib/router" app/ components/ lib/ 2>/dev/null | grep -v node_modules
grep -r "RouterProcessor" app/ components/ lib/ 2>/dev/null | grep -v node_modules
```

