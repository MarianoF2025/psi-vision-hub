# ✅ Verificar Estado de PM2

## 🔍 Verificar que está funcionando

```bash
# Ver estado actual
pm2 list

# Ver logs en tiempo real (últimas líneas)
pm2 logs psi-vision-hub --lines 10 --nostream

# Verificar que el puerto está escuchando
netstat -tlnp | grep 3001
# O
ss -tlnp | grep 3001

# Probar endpoint
curl http://localhost:3001/api/router/debug
```

## ✅ Si el último log muestra "✓ Ready in 273ms"

Significa que **SÍ está funcionando**. Los errores anteriores eran de intentos previos.

## 🧪 Prueba Final

1. **Enviar mensaje desde WhatsApp**
2. **Ver logs en tiempo real:**
   ```bash
   pm2 logs psi-vision-hub --lines 50
   ```
3. **Verificar que:**
   - ✅ No aparece error `mensajes_tipo_check`
   - ✅ Se procesa el mensaje
   - ✅ Se muestra el menú

