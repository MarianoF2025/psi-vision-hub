# 🔍 Verificación: ¿El Router está recibiendo webhooks?

## ❓ Problema Reportado
- Se envió un mensaje desde WhatsApp
- Los logs del servidor NO se movieron
- Esto indica que el webhook NO está llegando al Router

## 🔍 Verificaciones Necesarias

### 1. **¿El servidor está corriendo?**
```powershell
# Verificar procesos Node.js
Get-Process -Name node

# Verificar puerto 3001
Get-NetTCPConnection -LocalPort 3001 -State Listen
```

### 2. **¿El endpoint está accesible?**
- URL: `https://app.psivisionhub.com/api/router/whatsapp/webhook`
- O local: `http://localhost:3001/api/router/whatsapp/webhook`

### 3. **¿n8n está enviando correctamente?**
- Verificar en n8n que el nodo HTTP Request esté configurado
- URL: `https://app.psivisionhub.com/api/router/whatsapp/webhook`
- Method: `POST`
- Body: `{{ $json }}`

### 4. **Verificar logs del servidor**
Si el servidor está corriendo con `npm run dev`, deberías ver en la terminal:
```
Webhook recibido - Content-Type: application/json, Content-Length: XXX
```

## 🐛 Posibles Causas

1. **Servidor no está corriendo**
   - Solución: Ejecutar `npm run dev`

2. **n8n no está enviando al endpoint correcto**
   - Verificar URL en n8n
   - Verificar que el workflow esté activo

3. **Problema de red/firewall**
   - El servidor local no es accesible desde n8n (si n8n está en servidor)
   - O n8n está enviando a URL incorrecta

4. **El webhook llega pero hay error silencioso**
   - Revisar logs completos del servidor
   - Verificar errores en consola

## ✅ Próximos Pasos

1. Verificar que el servidor esté corriendo
2. Verificar logs en tiempo real
3. Probar el endpoint manualmente con curl/Postman
4. Verificar configuración de n8n

