# Verificar Logs Después del Deploy

## Comandos para verificar

```bash
# 1. Verificar que PM2 está corriendo
pm2 status

# 2. Ver logs en tiempo real (esperar a que envíes "2")
pm2 logs psi-vision-hub --lines 100

# 3. O ver logs sin stream (últimas 100 líneas)
pm2 logs psi-vision-hub --lines 100 --nostream
```

## Qué buscar en los logs

Cuando envíes "2", **DEBES VER** estos logs en orden:

1. `🚀🚀🚀 RouterProcessor.processMessage INICIADO 🚀🚀🚀`
2. `🔍 VALIDANDO ENTRADA...`
3. `✅ Validación de entrada exitosa`
4. `🔄 Verificando anti-loop...`
5. `🔍🔍🔍 hasSystemMessages INICIADO...`
6. `🔄🔄🔄 INICIANDO PROCESAMIENTO DE COMANDO/SELECCIÓN`
7. `🔄🔄🔄 Procesando como selección de menú principal: "2"`
8. `🔄🔄🔄 processMainMenuSelection INICIADO para selección: "2"`

## Si NO aparecen estos logs

El código nuevo NO está corriendo. Verificar:

```bash
# Verificar qué commit está usando
cd /opt/psi-vision-hub
git log --oneline -1

# Debe mostrar: "docs: Instrucciones para resolver conflicto de Git en servidor" o más reciente

# Verificar que el archivo tiene el código nuevo
grep -n "🚀🚀🚀 RouterProcessor.processMessage INICIADO" lib/router/processor.ts

# Debe mostrar una línea con número (ej: 105)
```

## Si aparecen los logs pero se detiene

Compartir los logs completos desde que envías "2" hasta donde se detiene.

