# 🔄 Flujo de Trabajo Híbrido: Local + Servidor

## 📋 Resumen

- **LOCAL**: Desarrollo, pruebas, debugging
- **SERVIDOR**: Deploy final, fixes rápidos, producción

---

## 🖥️ **TRABAJO EN LOCAL**

### Setup Inicial
```powershell
# En tu máquina Windows
cd C:\Users\Usuario\psi-vision-hub
npm install
# Crear .env.local con las variables de entorno
npm run dev
```

### Desarrollo Normal
1. Editar código en tu IDE
2. Cambios se reflejan automáticamente (hot-reload)
3. Probar localmente en `http://localhost:3001`
4. Ver logs en la terminal

### Cuando está listo para deploy:
```powershell
# 1. Commit cambios
git add .
git commit -m "Descripción del cambio"
git push origin master

# 2. Deploy en servidor (ver sección SERVIDOR)
```

---

## 🖥️ **TRABAJO EN SERVIDOR**

### Deploy desde Local (Recomendado)

**Opción A: Script automático**
```bash
# En servidor
cd /opt/psi-vision-hub
./deploy.sh
```

**Opción B: Manual**
```bash
cd /opt/psi-vision-hub
git pull origin master
npm install  # Solo si hay cambios en package.json
npm run build
pm2 restart psi-vision-hub
pm2 logs psi-vision-hub --lines 30
```

### Fixes Rápidos en Servidor

Para cambios pequeños (1-2 líneas):

```bash
# 1. Editar archivo
nano /opt/psi-vision-hub/lib/router/processor.ts
# O usar VS Code Remote SSH

# 2. Rebuild y restart
cd /opt/psi-vision-hub
npm run build
pm2 restart psi-vision-hub

# 3. Verificar
pm2 logs psi-vision-hub --lines 20

# 4. Si funciona, commit desde servidor
git add .
git commit -m "Fix rápido: descripción"
git push origin master
```

---

## 🔄 **Flujo Completo Recomendado**

### Desarrollo de Nueva Feature

1. **LOCAL:**
   ```powershell
   npm run dev
   # Desarrollar y probar
   ```

2. **LOCAL: Commit**
   ```powershell
   git add .
   git commit -m "Feature: descripción"
   git push origin master
   ```

3. **SERVIDOR: Deploy**
   ```bash
   cd /opt/psi-vision-hub
   ./deploy.sh
   ```

4. **SERVIDOR: Verificar**
   ```bash
   pm2 logs psi-vision-hub --lines 50
   # Enviar mensaje de prueba desde WhatsApp
   ```

5. **SERVIDOR: Probar con n8n**
   - Enviar mensaje real desde WhatsApp
   - Verificar que funciona correctamente

### Fix Rápido/Urgente

1. **SERVIDOR: Editar directamente**
   ```bash
   nano /opt/psi-vision-hub/lib/router/processor.ts
   ```

2. **SERVIDOR: Rebuild y restart**
   ```bash
   cd /opt/psi-vision-hub
   npm run build
   pm2 restart psi-vision-hub
   ```

3. **SERVIDOR: Probar**
   ```bash
   pm2 logs psi-vision-hub --lines 20
   ```

4. **SERVIDOR: Commit (si funciona)**
   ```bash
   git add .
   git commit -m "Hotfix: descripción"
   git push origin master
   ```

---

## 📝 **Comandos Útiles**

### En LOCAL

```powershell
# Iniciar servidor
npm run dev

# Ver procesos Node
Get-Process -Name node

# Ver puerto 3001
Get-NetTCPConnection -LocalPort 3001

# Probar endpoint local
Invoke-WebRequest -Uri "http://localhost:3001/api/router/whatsapp/webhook" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"test":"ping"}'
```

### En SERVIDOR

```bash
# Ver estado PM2
pm2 list

# Ver logs en tiempo real
pm2 logs psi-vision-hub

# Ver últimas 50 líneas
pm2 logs psi-vision-hub --lines 50

# Reiniciar
pm2 restart psi-vision-hub

# Verificar que está corriendo
curl http://localhost:3001/api/router/debug
```

---

## ⚠️ **Reglas de Oro**

1. **Nunca hacer cambios grandes directamente en servidor**
   - Siempre desarrollar en local primero
   - Solo fixes pequeños (1-5 líneas) en servidor

2. **Siempre hacer commit después de cambios en servidor**
   - Si haces un fix en servidor, commitéalo
   - Evita desincronización entre local y servidor

3. **Verificar antes de deploy**
   - Probar localmente primero
   - Revisar logs después del deploy

4. **Mantener sincronizado**
   - Antes de empezar a trabajar, hacer `git pull`
   - Después de cambios, hacer `git push`

---

## 🐛 **Debugging**

### En LOCAL
- Logs aparecen directamente en la terminal
- Puedes usar `console.log` y ver inmediatamente
- Hot-reload aplica cambios sin restart

### En SERVIDOR
- Usar `pm2 logs psi-vision-hub` para ver logs
- Cambios requieren `npm run build` y `pm2 restart`
- Logs se guardan en `/root/.pm2/logs/`

---

## 📋 **Checklist de Deploy**

Antes de hacer deploy:

- [ ] Código probado localmente
- [ ] Commit realizado
- [ ] Push a GitHub
- [ ] SSH al servidor
- [ ] `git pull` exitoso
- [ ] `npm run build` sin errores
- [ ] `pm2 restart` exitoso
- [ ] Logs muestran inicio correcto
- [ ] Prueba con mensaje real

---

## 🎯 **Ventajas de este Flujo**

✅ Desarrollo rápido en local
✅ No rompes producción mientras desarrollas
✅ Fixes rápidos posibles en servidor
✅ Pruebas reales con n8n después del deploy
✅ Mejor debugging en local
✅ Producción estable

