# 🚨 URGENTE: Deploy del Código Nuevo

## ⚠️ PROBLEMA CRÍTICO

El servidor está usando código **ANTIGUO** que se detiene después de encontrar la conversación. Por eso:
- Solo procesa el primer mensaje después de reiniciar
- Los mensajes posteriores no se registran
- El Router no responde a selecciones de menú

## ✅ SOLUCIÓN: Deploy Inmediato

**Ejecutar estos comandos EN EL SERVIDOR:**

```bash
cd /opt/psi-vision-hub

# 1. Descargar código nuevo
git pull origin master

# 2. Verificar que se actualizó (debe mostrar commits recientes)
git log --oneline -3

# 3. Limpiar build anterior
rm -rf .next
rm -rf node_modules/.cache

# 4. Reinstalar dependencias
npm install

# 5. Construir aplicación
npm run build

# 6. Verificar que el build fue exitoso
ls -la .next | head -5

# 7. Reiniciar PM2
pm2 restart psi-vision-hub

# 8. Esperar 5 segundos
sleep 5

# 9. Verificar estado
pm2 status

# 10. Ver logs (debe mostrar logs nuevos con 🚀🚀🚀)
pm2 logs psi-vision-hub --lines 50 --nostream
```

## 🔍 VERIFICACIÓN

Después del deploy, cuando envíes un mensaje "2", **DEBES VER** estos logs:

```
🚀🚀🚀 RouterProcessor.processMessage INICIADO 🚀🚀🚀
   - Timestamp: ...
🔍 VALIDANDO ENTRADA...
✅ Validación de entrada exitosa
🔄 Verificando anti-loop para conversación ...
📅 Última interacción: ...
✅ Anti-loop no activo, continuando con procesamiento
🔍 Verificando si hay mensajes del sistema ANTES de guardar mensaje del usuario...
🔍🔍🔍 hasSystemMessages INICIADO para conversación ...
   - Ejecutando query en Supabase...
   - Query completada en Xms
📊 Resultado de query:
   - Mensajes encontrados: X
✅ hasSystemMessages COMPLETADO: true/false
💾 Guardando mensaje del usuario en base de datos...
✅ Mensaje del usuario guardado
📤 Notificando webhook de ingesta...
🔑 Clave de ingesta: ...
✅ Webhook de ingesta notificado
🔄🔄🔄 INICIANDO PROCESAMIENTO DE COMANDO/SELECCIÓN
   - Comando normalizado: "2"
   - hasSystemMessages: true/false
🔍 Evaluando si es primera interacción...
➡️ NO es primera interacción, continuando con procesamiento de selección
🔍🔍🔍 Obteniendo estado del menú para conversación ...
   - Llamando a getMenuState()...
   - getMenuState() completado en Xms
📊 Estado del menú detectado: {...}
📊 Evaluando estado del menú para determinar flujo...
🔄🔄🔄 Procesando como selección de menú principal: "2"
   - Llamando a processMainMenuSelection()...
🔄🔄🔄 processMainMenuSelection INICIADO para selección: "2"
```

## ❌ Si NO aparecen estos logs

El código nuevo NO se desplegó. Verificar:

1. **¿Se descargó el código?**
   ```bash
   git log --oneline -1
   # Debe mostrar: "fix: Logging exhaustivo..." o similar
   ```

2. **¿El build fue exitoso?**
   ```bash
   npm run build
   # No debe haber errores
   ```

3. **¿PM2 está usando el código nuevo?**
   ```bash
   pm2 restart psi-vision-hub
   pm2 logs psi-vision-hub --lines 20
   ```

4. **¿El archivo tiene el código nuevo?**
   ```bash
   grep -n "🚀🚀🚀 RouterProcessor.processMessage INICIADO" lib/router/processor.ts
   # Debe mostrar una línea con número
   ```

## 🐛 Si el problema persiste

Si después del deploy los mensajes siguen sin procesarse, ejecutar:

```bash
# Ver logs en tiempo real
pm2 logs psi-vision-hub --lines 100

# Enviar un mensaje "2" desde WhatsApp
# Buscar en los logs si aparece el error específico
```

