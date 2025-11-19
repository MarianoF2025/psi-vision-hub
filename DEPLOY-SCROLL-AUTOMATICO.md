# 🚀 Deploy Scroll Automático

## ✅ Cambios Aplicados

El código del scroll automático simplificado ya está en el servidor.

## 📋 Pasos para Completar el Deploy

```bash
# 1. Construir la aplicación
npm run build

# 2. Reiniciar PM2
pm2 restart psi-vision-hub

# 3. Verificar logs
pm2 logs psi-vision-hub --lines 20
```

## ✅ Verificación

Después del deploy, el scroll automático debería funcionar:

- ✅ **Panel de mensajes**: Scroll automático al final cuando llegan nuevos mensajes
- ✅ **Lista de conversaciones**: Scroll automático al inicio cuando cambia el inbox

## 🔍 Si No Funciona

Si después del deploy el scroll no funciona:

1. **Verificar que el build fue exitoso:**
   ```bash
   npm run build
   # Debe completar sin errores
   ```

2. **Verificar que PM2 está corriendo:**
   ```bash
   pm2 status
   # Debe mostrar psi-vision-hub como "online"
   ```

3. **Limpiar cache del navegador:**
   - Ctrl + Shift + R (o Cmd + Shift + R en Mac)
   - O abrir en ventana incógnito

4. **Verificar en consola del navegador:**
   - Abrir DevTools (F12)
   - Ver si hay errores en la consola
   - Verificar que los componentes se están renderizando

