# 🔍 DIAGNÓSTICO COMPLETO: Router No Funciona

## 🚨 Problema Reportado

**"Definitivamente el Router no funciona. No hay dudas. No hay forma"**

## 📋 Checklist de Diagnóstico

### 1. ¿El Webhook Está Recibiendo Mensajes?

**Verificar en logs:**
```bash
pm2 logs psi-vision-hub --lines 200 | grep -E "Webhook recibido|Mensaje raw recibido|Mensaje normalizado"
```

**Qué buscar:**
- ✅ `Webhook recibido - Content-Type: ...`
- ✅ `Mensaje raw recibido: ...`
- ✅ `Mensaje normalizado: ...`

**Si NO aparece:**
- El webhook no está recibiendo mensajes
- Verificar configuración de n8n → webhook URL
- Verificar que el endpoint `/api/router/whatsapp/webhook` está accesible

---

### 2. ¿El RouterProcessor Se Inicializa Correctamente?

**Verificar en logs:**
```bash
pm2 logs psi-vision-hub --lines 200 | grep -E "RouterProcessor|Supabase|configurado"
```

**Qué buscar:**
- ✅ `🔧 RouterProcessor.constructor INICIADO`
- ✅ `✅ Configuración validada, creando cliente Supabase...`
- ✅ `✅ RouterProcessor inicializado correctamente`

**Si aparece ERROR:**
- Variables de entorno faltantes (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Verificar `.env.local` en el servidor

---

### 3. ¿El Mensaje Llega a processMessage?

**Verificar en logs:**
```bash
pm2 logs psi-vision-hub --lines 200 | grep -E "processMessage INICIADO|VALIDANDO ENTRADA|Validación de entrada exitosa"
```

**Qué buscar:**
- ✅ `🚀🚀🚀 RouterProcessor.processMessage INICIADO 🚀🚀🚀`
- ✅ `✅ Validación de entrada exitosa`

**Si NO aparece:**
- El mensaje no está llegando al procesador
- Verificar normalización del mensaje en el webhook

---

### 4. ¿Se Crea/Encuentra la Conversación?

**Verificar en logs:**
```bash
pm2 logs psi-vision-hub --lines 200 | grep -E "Buscando o creando conversación|Conversación encontrada/creada|No se pudo obtener"
```

**Qué buscar:**
- ✅ `✅ Conversación encontrada/creada: ... (área: ...)`
- ❌ `❌ No se pudo obtener o crear conversación`

**Si aparece ERROR:**
- Problema con Supabase (conexión, permisos, schema)
- Verificar que las tablas `contactos` y `conversaciones` existen

---

### 5. ¿El Anti-Loop Está Bloqueando?

**Verificar en logs:**
```bash
pm2 logs psi-vision-hub --lines 200 | grep -E "Anti-loop|Última interacción|Diferencia.*segundos"
```

**Qué buscar:**
- ✅ `✅ Anti-loop no activo, continuando con procesamiento`
- ❌ `⏸️ Anti-loop activo, ignorando mensaje`

**Si está bloqueando:**
- Verificar que el fix de anti-loop está activo (solo verifica mensajes del usuario)
- Esperar 30+ segundos entre mensajes

---

### 6. ¿Se Guarda el Mensaje en Supabase?

**Verificar en logs:**
```bash
pm2 logs psi-vision-hub --lines 200 | grep -E "Guardando mensaje|Mensaje guardado|Error guardando mensaje"
```

**Qué buscar:**
- ✅ `✅ Mensaje guardado exitosamente en Supabase. ID: ...`
- ❌ `❌ Error guardando mensaje en Supabase:`

**Si aparece ERROR:**
- Problema con constraint `mensajes_tipo_check` (tipo debe ser 'text', 'image', etc.)
- Problema con columnas `remitente_tipo`, `remitente_nombre`
- Verificar schema de Supabase

---

### 7. ¿Se Detecta Primera Interacción Correctamente?

**Verificar en logs:**
```bash
pm2 logs psi-vision-hub --lines 200 | grep -E "hasSystemMessages|PRIMERA INTERACCIÓN|hay mensajes del sistema"
```

**Qué buscar:**
- ✅ `✅ hasSystemMessages COMPLETADO: false` → Debe mostrar menú
- ✅ `✅ hasSystemMessages COMPLETADO: true` → Debe procesar comando

**Si está mal:**
- La lógica de detección de primera interacción está fallando
- Verificar query de `hasSystemMessages`

---

### 8. ¿Se Procesa el Comando del Menú?

**Verificar en logs:**
```bash
pm2 logs psi-vision-hub --lines 200 | grep -E "PROCESAMIENTO DE COMANDO|processMainMenuSelection|processSubmenuSelection"
```

**Qué buscar:**
- ✅ `🔄🔄🔄 INICIANDO PROCESAMIENTO DE COMANDO/SELECCIÓN`
- ✅ `🔄🔄🔄 processMainMenuSelection INICIADO para selección: ...`
- ✅ `✅ Opción encontrada: ...`

**Si NO aparece:**
- El flujo no está entrando a la lógica de procesamiento de menú
- Verificar `getMenuState` y la lógica de decisión

---

### 9. ¿Se Envía el Mensaje por WhatsApp?

**Verificar en logs:**
```bash
pm2 logs psi-vision-hub --lines 200 | grep -E "Enviando mensaje WhatsApp|WhatsApp API error|Mensaje enviado por WhatsApp"
```

**Qué buscar:**
- ✅ `📤 Enviando mensaje WhatsApp a ...`
- ✅ `✅ Mensaje enviado por WhatsApp API`
- ❌ `❌ WhatsApp Cloud API no configurada`
- ❌ `❌ WhatsApp API error: ...`

**Si aparece ERROR:**
- Variables `CLOUD_API_TOKEN` o `CLOUD_API_PHONE_NUMBER_ID` faltantes
- Token inválido o expirado
- Phone Number ID incorrecto
- Verificar configuración de WhatsApp Cloud API

---

### 10. ¿Hay Errores Silenciosos?

**Verificar TODOS los errores:**
```bash
pm2 logs psi-vision-hub --lines 500 | grep -E "❌|ERROR|Error|error"
```

**Qué buscar:**
- Cualquier error que no esté siendo manejado correctamente
- Errores de Supabase
- Errores de WhatsApp API
- Errores de red/timeout

---

## 🔧 Script de Diagnóstico Automático

Crear archivo `diagnostico-router.sh` en el servidor:

```bash
#!/bin/bash

echo "🔍 DIAGNÓSTICO COMPLETO DEL ROUTER"
echo "=================================="
echo ""

echo "1️⃣ Verificando que PM2 está corriendo..."
pm2 status | grep psi-vision-hub
echo ""

echo "2️⃣ Últimos 100 logs (buscando webhooks)..."
pm2 logs psi-vision-hub --lines 100 --nostream | grep -E "Webhook|Mensaje|processMessage" | tail -20
echo ""

echo "3️⃣ Errores recientes..."
pm2 logs psi-vision-hub --lines 200 --nostream | grep -E "❌|ERROR|Error" | tail -20
echo ""

echo "4️⃣ Verificando variables de entorno críticas..."
echo "   - CLOUD_API_TOKEN: $(if [ -n "$CLOUD_API_TOKEN" ]; then echo "✅ Presente"; else echo "❌ Faltante"; fi)"
echo "   - CLOUD_API_PHONE_NUMBER_ID: $(if [ -n "$CLOUD_API_PHONE_NUMBER_ID" ]; then echo "✅ Presente"; else echo "❌ Faltante"; fi)"
echo "   - NEXT_PUBLIC_SUPABASE_URL: $(if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then echo "✅ Presente"; else echo "❌ Faltante"; fi)"
echo ""

echo "5️⃣ Verificando que el endpoint está accesible..."
curl -I http://localhost:3001/api/router/whatsapp/webhook 2>&1 | head -5
echo ""

echo "✅ Diagnóstico completado"
```

---

## 🎯 Próximos Pasos

1. **Ejecutar el script de diagnóstico** en el servidor
2. **Enviar un mensaje de prueba** desde WhatsApp
3. **Capturar TODOS los logs** inmediatamente después
4. **Compartir los logs completos** para análisis

---

## 💡 Posibles Causas Raíz

1. **Webhook no recibe mensajes** → Configuración de n8n incorrecta
2. **Variables de entorno faltantes** → `.env.local` no configurado en servidor
3. **WhatsApp API no configurada** → `CLOUD_API_TOKEN` o `CLOUD_API_PHONE_NUMBER_ID` faltantes
4. **Supabase no accesible** → Problema de red o credenciales
5. **Errores silenciosos** → Try-catch que oculta errores críticos
6. **Anti-loop bloqueando todo** → Aunque debería estar corregido
7. **Flujo de menú roto** → Lógica de `getMenuState` o `hasSystemMessages` incorrecta

