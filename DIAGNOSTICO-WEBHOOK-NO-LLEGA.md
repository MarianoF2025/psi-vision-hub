# 🚨 Diagnóstico: Webhook NO está llegando al Router

## ✅ Estado Actual
- ✅ Servidor corriendo en puerto 3001
- ✅ Proceso Node.js activo (PID: 17056)
- ❌ **NO se reciben logs cuando se envía mensaje**

## 🔍 Posibles Causas

### 1. **n8n NO está enviando al endpoint correcto**
**Verificar en n8n:**
- URL del nodo HTTP Request debe ser: `https://app.psivisionhub.com/api/router/whatsapp/webhook`
- **PROBLEMA COMÚN**: Si estás en local, n8n (que está en el servidor) NO puede acceder a `localhost:3001`
- **SOLUCIÓN**: n8n debe enviar a `https://app.psivisionhub.com/api/router/whatsapp/webhook` (producción)

### 2. **El workflow de n8n NO está activo**
- Verificar que el workflow esté en modo "Production" (no "Test")
- Verificar que el webhook trigger esté activo

### 3. **n8n está enviando pero hay error de red**
- n8n puede estar intentando enviar pero fallando silenciosamente
- Revisar logs de n8n para ver errores

### 4. **El endpoint está recibiendo pero hay error antes del log**
- Aunque es poco probable, podría haber un error antes de la línea 12 del código

## 🔧 Verificaciones Inmediatas

### 1. **Verificar URL en n8n**
En el nodo "Forward to Router PSI":
- ✅ URL: `https://app.psivisionhub.com/api/router/whatsapp/webhook`
- ✅ Method: `POST`
- ✅ Headers: `Content-Type: application/json`
- ✅ Body: `{{ $json }}`

### 2. **Verificar que el workflow esté activo**
- En n8n, el workflow debe estar en modo "Production"
- El webhook debe estar "Active"

### 3. **Probar endpoint manualmente**
```powershell
# Desde tu máquina local (si el servidor está en local)
curl -X POST http://localhost:3001/api/router/whatsapp/webhook `
  -H "Content-Type: application/json" `
  -d '{\"messages\":[{\"from\":\"5491133901743\",\"text\":{\"body\":\"Test\"},\"type\":\"text\"}],\"metadata\":{\"display_phone_number\":\"5491156090819\",\"phone_number_id\":\"809951985523815\"}}'
```

### 4. **Revisar logs de n8n**
En el servidor donde corre n8n:
```bash
# Ver logs de n8n
docker logs <n8n-container> | grep -i "router\|webhook\|error"
```

## 🎯 Próximos Pasos

1. **Verificar configuración de n8n** (URL del endpoint)
2. **Verificar que el workflow esté activo**
3. **Revisar logs de n8n** para ver si está intentando enviar
4. **Probar endpoint manualmente** para confirmar que funciona

## ⚠️ IMPORTANTE

Si estás desarrollando en **local** (`localhost:3001`):
- n8n que está en el **servidor** NO puede acceder a `localhost:3001` de tu máquina
- n8n DEBE enviar a `https://app.psivisionhub.com/api/router/whatsapp/webhook` (producción)
- O usar un túnel (ngrok, etc.) para exponer tu localhost

Si estás en **producción**:
- n8n debe enviar a `https://app.psivisionhub.com/api/router/whatsapp/webhook`
- Verificar que el dominio esté accesible desde el servidor de n8n

