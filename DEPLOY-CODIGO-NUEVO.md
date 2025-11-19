# Deploy del Código Nuevo con Logging Exhaustivo

## ⚠️ PROBLEMA IDENTIFICADO

Los logs del servidor muestran que **el código nuevo NO está desplegado**. El servidor está usando código antiguo que se detiene después de encontrar la conversación.

## 🔧 SOLUCIÓN: Deploy Completo

Ejecutar estos comandos en el servidor:

```bash
cd /opt/psi-vision-hub

# 1. Asegurarse de estar en el directorio correcto
pwd

# 2. Verificar estado de Git
git status

# 3. Hacer pull del código nuevo
git pull origin master

# 4. Verificar que se actualizó
git log --oneline -5

# 5. Limpiar build anterior
rm -rf .next
rm -rf node_modules/.cache

# 6. Reinstalar dependencias (por si acaso)
npm install

# 7. Construir aplicación
npm run build

# 8. Verificar que el build fue exitoso
ls -la .next

# 9. Reiniciar PM2
pm2 restart psi-vision-hub

# 10. Verificar que está corriendo
pm2 status

# 11. Ver logs en tiempo real
pm2 logs psi-vision-hub --lines 50
```

## ✅ VERIFICACIÓN

Después del deploy, cuando envíes un mensaje "2", deberías ver estos logs nuevos:

```
🚀🚀🚀 RouterProcessor.processMessage INICIADO 🚀🚀🚀
   - Timestamp: ...
   - From: 5491133901743
   - Message: 2
   - Type: text
   - MessageId: ...
🔍 VALIDANDO ENTRADA...
✅ Validación de entrada exitosa
   - Comando normalizado: "2"
   - Longitud del mensaje: 1 caracteres
🔍 Buscando o creando conversación para 5491133901743
✅ Conversación encontrada/creada: ...
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
   - hasSystemMessages: true/false
   - !hasSystemMessages: true/false
➡️ NO es primera interacción, continuando con procesamiento de selección
🔍🔍🔍 Obteniendo estado del menú para conversación ...
   - Llamando a getMenuState()...
   - getMenuState() completado en Xms
📊 Estado del menú detectado: {...}
📊 Evaluando estado del menú para determinar flujo...
   - menuState.currentMenu: "main"
   - Es 'main'?: true
🔄🔄🔄 Procesando como selección de menú principal: "2"
   - Llamando a processMainMenuSelection()...
🔄🔄🔄 processMainMenuSelection INICIADO para selección: "2"
   - Conversación: ...
   - Teléfono: ...
🔍 Opción buscada: "2", resultado: ...
✅ Opción encontrada: Alumnos (Alumnos), mostrando submenú
...
```

## 🐛 Si NO aparecen estos logs

1. Verificar que `git pull` descargó los cambios:
   ```bash
   git log --oneline -1
   # Debería mostrar: "fix: Logging exhaustivo en todos los puntos críticos del Router"
   ```

2. Verificar que el build fue exitoso:
   ```bash
   npm run build
   # No debería haber errores
   ```

3. Verificar que PM2 está usando el código nuevo:
   ```bash
   pm2 restart psi-vision-hub
   pm2 logs psi-vision-hub --lines 10
   ```

4. Si sigue sin funcionar, verificar que el archivo fue actualizado:
   ```bash
   grep -n "🚀🚀🚀 RouterProcessor.processMessage INICIADO" lib/router/processor.ts
   # Debería mostrar una línea con el número
   ```

