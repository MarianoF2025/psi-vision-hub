# Deploy Urgente: Fix Anti-Loop

## Problema
El anti-loop está bloqueando TODOS los mensajes porque está configurado a 15 minutos. El código nuevo lo reduce a 30 segundos, pero NO está desplegado.

## Solución: Deploy Inmediato

**Ejecutar en el servidor:**

```bash
cd /opt/psi-vision-hub

# 1. Descargar código nuevo
git pull origin master

# 2. Verificar que se actualizó (debe mostrar commit sobre anti-loop)
git log --oneline -1

# 3. Limpiar y rebuild
rm -rf .next
npm run build

# 4. Reiniciar PM2
pm2 restart psi-vision-hub

# 5. Ver logs
pm2 logs psi-vision-hub --lines 30
```

## Verificación

Después del deploy, cuando envíes "2", deberías ver:

```
🔄 Verificando anti-loop...
📅 Última interacción: ...
   - Diferencia: X.X segundos
   - Ventana anti-loop: 30 segundos
   - Está dentro de la ventana?: false
✅ Anti-loop no activo, continuando con procesamiento
```

Si NO aparecen estos logs, el código nuevo NO se desplegó.

