# 🔧 Fix Crítico: Anti-Loop Bloqueando Respuestas al Menú

## 🚨 Problema Identificado

El anti-loop estaba bloqueando **todos los mensajes** porque verificaba el último mensaje de **cualquier tipo** (incluyendo mensajes del sistema).

**Escenario problemático:**
1. Usuario envía "Hola" → Sistema muestra menú principal
2. Usuario envía "2" (inmediatamente) → **Anti-loop bloquea** porque el último mensaje (del sistema) fue hace < 30 segundos

## ✅ Solución

El anti-loop ahora verifica **solo mensajes del USUARIO** (tipo `'contact'`), excluyendo mensajes del sistema (`'system'`).

**Lógica corregida:**
- Anti-loop previene **spam del usuario** (múltiples mensajes seguidos)
- Anti-loop **NO bloquea** respuestas rápidas al menú del sistema
- El usuario puede responder inmediatamente después de que el sistema muestre el menú

## 🔄 Cambio Realizado

```typescript
// ANTES: Verificaba todos los mensajes
.eq('conversacion_id', conversationId)
.order('timestamp', { ascending: false })

// DESPUÉS: Solo mensajes del usuario
.eq('conversacion_id', conversationId)
.neq('remitente_tipo', 'system') // Excluir mensajes del sistema
.order('timestamp', { ascending: false })
```

## 📋 Deploy

**Ejecutar en el servidor:**

```bash
cd /opt/psi-vision-hub
git pull origin master
npm run build
pm2 restart psi-vision-hub
```

O usar el script robusto:

```bash
bash deploy-robusto.sh
```

## ✅ Resultado Esperado

- Usuario puede responder "2" inmediatamente después de que el sistema muestre el menú
- Anti-loop solo bloquea si el usuario envía múltiples mensajes seguidos (spam)
- Los logs mostrarán: "Última interacción del USUARIO" en lugar de cualquier mensaje

