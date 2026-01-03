# 🔧 TROUBLESHOOTING - PSI VISION HUB

**Versión:** 1.0  
**Fecha:** Enero 2026  
**Servidor:** Contabo VDS (161.97.136.77)

---

## ÍNDICE

1. [Diagnóstico Rápido](#1-diagnóstico-rápido)
2. [Problemas de Mensajes](#2-problemas-de-mensajes)
3. [Problemas del CRM](#3-problemas-del-crm)
4. [Problemas del Router](#4-problemas-del-router)
5. [Problemas de Automatizaciones](#5-problemas-de-automatizaciones)
6. [Problemas de Supabase](#6-problemas-de-supabase)
7. [Problemas de n8n](#7-problemas-de-n8n)
8. [Problemas de WhatsApp](#8-problemas-de-whatsapp)
9. [Problemas de Evolution API](#9-problemas-de-evolution-api)
10. [Mantenimiento Preventivo](#10-mantenimiento-preventivo)
11. [Restauración de Backup](#11-restauración-de-backup)
12. [Contactos de Emergencia](#12-contactos-de-emergencia)

---

## 1. DIAGNÓSTICO RÁPIDO

### Verificar estado de servicios
```bash
pm2 status
```

**Esperado:**
| ID | Nombre | Estado |
|----|--------|--------|
| 22 | psi-router | online |
| 23 | psi-vision-hub | online |
| 24 | psi-automations | online |

### Health checks
```bash
# Router
curl http://localhost:3002/health

# Automations
curl http://localhost:3003/health

# CRM (verificar que responde)
curl -I http://localhost:3001
```

### Ver logs de errores
```bash
# Últimos errores de todos los servicios
pm2 logs --err --lines 50

# Logs específicos
pm2 logs psi-router --lines 100
pm2 logs psi-vision-hub --lines 100
pm2 logs psi-automations --lines 100
```

### Recursos del sistema
```bash
# Espacio en disco
df -h

# Memoria RAM
free -h

# CPU y procesos
htop
```

---

## 2. PROBLEMAS DE MENSAJES

### 2.1 Mensajes no llegan al CRM

**Síntomas:** Usuario envía mensaje pero no aparece en el CRM.

**Diagnóstico:**
```bash
# Verificar Router
pm2 logs psi-router --lines 50 | grep -i error

# Verificar último mensaje en DB
# Ejecutar en Supabase SQL Editor:
```
```sql
SELECT * FROM mensajes 
ORDER BY created_at DESC 
LIMIT 5;
```

**Causas y soluciones:**

| Causa | Solución |
|-------|----------|
| Router caído | `pm2 restart psi-router` |
| Webhook n8n inactivo | Activar workflow en n8n |
| Error de Supabase | Verificar SUPABASE_SERVICE_KEY |
| Teléfono mal formateado | Debe ser E.164 (+5491130643668) |

---

### 2.2 Mensajes no se envían

**Síntomas:** Agente envía desde CRM pero usuario no recibe.

**Diagnóstico:**
```bash
pm2 logs psi-vision-hub --lines 50 | grep -i webhook
```

**Causas y soluciones:**

| Causa | Solución |
|-------|----------|
| Workflow n8n inactivo | Activar en n8n |
| Token WhatsApp expirado | Renovar en Meta Business |
| Ventana 24h cerrada | Usar template o esperar mensaje |
| Número bloqueado | Verificar en WhatsApp Manager |

---

### 2.3 Mensajes duplicados

**Diagnóstico:**
```sql
SELECT whatsapp_message_id, COUNT(*) 
FROM mensajes 
GROUP BY whatsapp_message_id 
HAVING COUNT(*) > 1;
```

**Solución:**
```sql
-- Eliminar duplicados manteniendo el más antiguo
DELETE FROM mensajes a
USING mensajes b
WHERE a.id > b.id
AND a.whatsapp_message_id = b.whatsapp_message_id;
```

---

### 2.4 Multimedia no se muestra

**Causas y soluciones:**

| Causa | Solución |
|-------|----------|
| URL expirada | El archivo debe estar en Supabase Storage |
| Bucket no público | Verificar políticas del bucket |
| Formato no soportado | Convertir a formato compatible |

---

## 3. PROBLEMAS DEL CRM

### 3.1 CRM no carga
```bash
# Verificar proceso
pm2 status psi-vision-hub

# Reiniciar
pm2 restart psi-vision-hub

# Si persiste, recompilar
cd /opt/psi-vision-hub
npm run build
pm2 restart psi-vision-hub
```

---

### 3.2 Realtime no funciona

**Síntomas:** Mensajes nuevos no aparecen automáticamente.

**Verificar en browser:**
1. Abrir DevTools (F12)
2. Tab Network → filtrar por "WS"
3. Verificar conexión WebSocket activa

**Solución si no conecta:**
```bash
# Reiniciar CRM
pm2 restart psi-vision-hub
```

---

### 3.3 Error de login

**Causas:**

| Causa | Solución |
|-------|----------|
| Credenciales incorrectas | Verificar email/password |
| Usuario no existe | Crear en Supabase Auth |
| CORS | Verificar NEXT_PUBLIC_SUPABASE_URL |

---

## 4. PROBLEMAS DEL ROUTER

### 4.1 Menú no aparece

**Síntomas:** Usuario escribe pero no recibe menú interactivo.

**Diagnóstico:**
```sql
SELECT router_estado, menu_actual 
FROM conversaciones 
WHERE telefono = '+5491130643668';
```

**Soluciones:**
```sql
-- Resetear estado del router
UPDATE conversaciones 
SET router_estado = NULL, menu_actual = NULL 
WHERE telefono = '+5491130643668';
```

---

### 4.2 Derivación fallida

**Diagnóstico:**
```sql
-- Ver tickets recientes
SELECT * FROM tickets 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver derivaciones
SELECT * FROM derivaciones 
ORDER BY created_at DESC 
LIMIT 10;
```

**Forzar derivación manual:**
```sql
UPDATE conversaciones 
SET area = 'ventas', 
    estado = 'derivada', 
    router_estado = 'derivado' 
WHERE telefono = '+5491130643668';
```

---

### 4.3 Error teléfono inválido (Evolution)

**Causa:** Usando @lid en lugar de teléfono real.

**Solución:** Verificar jerarquía de extracción:
1. remoteJidAlt @s.whatsapp.net ✅
2. sender @s.whatsapp.net ✅
3. remoteJid @s.whatsapp.net ✅
4. @lid ❌ NUNCA

---

## 5. PROBLEMAS DE AUTOMATIZACIONES

### 5.1 Menú CTWA no se envía

**Diagnóstico:**
```bash
pm2 logs psi-automations --lines 50
```
```sql
-- Verificar curso activo
SELECT id, codigo, nombre, activo 
FROM config_cursos_ctwa 
WHERE codigo = 'AT';

-- Verificar anuncio vinculado
SELECT * FROM config_ctwa_anuncios 
WHERE ad_id = '123456789';
```

**Solución:**
- Verificar curso está activo
- Verificar anuncio está vinculado al curso
- Verificar ad_id coincide exactamente

---

### 5.2 Estadísticas incorrectas
```sql
-- Recalcular manualmente
UPDATE config_cursos_ctwa c
SET total_leads = (
  SELECT COUNT(DISTINCT telefono) 
  FROM menu_interacciones 
  WHERE curso_id = c.id
);
```

---

## 6. PROBLEMAS DE SUPABASE

### 6.1 Error de conexión

**Diagnóstico:**
```bash
curl -H "apikey: TU_ANON_KEY" \
  https://rbtczzjlvnymylkvcwdv.supabase.co/rest/v1/
```

**Causas:**

| Causa | Solución |
|-------|----------|
| Key expirada | Regenerar en dashboard |
| Proyecto pausado | Reactivar en Supabase |
| Rate limit | Esperar o upgrade plan |

---

### 6.2 Storage lleno
```sql
-- Ver tamaño por bucket
SELECT bucket_id, SUM(metadata->>'size')::bigint / 1024 / 1024 as mb
FROM storage.objects
GROUP BY bucket_id;
```

**Limpiar archivos antiguos:**
```sql
DELETE FROM storage.objects
WHERE created_at < NOW() - INTERVAL '6 months'
AND bucket_id = 'media';
```

---

## 7. PROBLEMAS DE N8N

### 7.1 Workflow no se ejecuta

**Verificar:**
1. Workflow está activo (toggle verde)
2. Webhook URL es correcta
3. Credenciales no expiraron

**Ver ejecuciones fallidas:**
- n8n → Executions → Filter: Error

---

### 7.2 Webhook timeout

**Causa:** Workflow tarda más de 30 segundos.

**Solución:**
- Dividir en workflows más pequeños
- Usar "Respond to Webhook" al inicio

---

## 8. PROBLEMAS DE WHATSAPP

### 8.1 Token expirado

**Síntomas:** Error 401 al enviar mensajes.

**Solución:**
1. Ir a Meta Business → System Users
2. Generar nuevo token permanente
3. Actualizar en:
   - `/opt/psi-vision-hub/centralwap-router/.env`
   - Credenciales de n8n
```bash
pm2 restart psi-router
```

---

### 8.2 Ventana 24h expirada

**Síntomas:** Error "outside 24h window".

**Solución:**
- Usar template message (tiene costo)
- Esperar que usuario escriba primero

---

### 8.3 Número bloqueado

**Verificar:**
1. WhatsApp Manager → Phone Numbers
2. Ver Quality Rating

**Si está bloqueado:**
- Reducir volumen de mensajes
- Esperar 24-72 horas
- Apelar si es error

---

## 9. PROBLEMAS DE EVOLUTION API

### 9.1 Instancia desconectada

**Síntomas:** Mensajes de Admin/Alumnos/Comunidad no llegan.

**Solución:**
1. Ir a evolution.psivisionhub.com
2. Verificar estado de instancia
3. Si desconectada → Escanear QR code

---

### 9.2 QR code no aparece
```bash
# Reiniciar Evolution
docker restart evolution-api

# Si persiste, recrear instancia
```

---

### 9.3 Mensajes a grupos fallan

**Verificar:**
- Bot es admin del grupo
- Grupo permite mensajes de bots
- JID correcto (123456789@g.us)

---

## 10. MANTENIMIENTO PREVENTIVO

### Diario
```bash
# Verificar servicios
pm2 status

# Ver errores recientes
pm2 logs --err --lines 20

# Verificar espacio
df -h
```

### Semanal
```bash
# Limpiar logs antiguos
pm2 flush

# Verificar backups
ls -la /opt/backups/

# Actualizar dependencias (con cuidado)
npm audit
```

### Mensual
```sql
-- Limpiar conversaciones cerradas antiguas
DELETE FROM conversaciones 
WHERE estado = 'cerrada' 
AND updated_at < NOW() - INTERVAL '6 months';

-- Limpiar sesiones de menú antiguas
DELETE FROM menu_sesiones 
WHERE updated_at < NOW() - INTERVAL '7 days';
```

---

## 11. RESTAURACIÓN DE BACKUP

### Git (código)
```bash
cd /opt/psi-vision-hub

# Ver commits disponibles
git log --oneline -10

# Restaurar archivo específico
git checkout <commit> -- <archivo>

# Revertir último commit
git revert HEAD
```

**Commits importantes:**
- 55411a3: Backup 11-dic-2025
- 0a1c586: Backup 23-dic-2025

### Supabase (datos)

1. Dashboard Supabase
2. Settings → Database
3. Backups → Restore

---

## 12. CONTACTOS DE EMERGENCIA

### Servicios

| Servicio | Contacto |
|----------|----------|
| Contabo | soporte@contabo.com |
| Supabase | support@supabase.io |
| Meta Business | developers.facebook.com/support |

### Escalamiento

| Nivel | Contacto | Casos |
|-------|----------|-------|
| L1 | Sofía | Operativo básico |
| L2 | Mariano | Técnico |
| L3 | Nina | Directivo |

---

## COMANDOS CRÍTICOS
```bash
# Reiniciar todo
pm2 restart all

# Ver estado completo
pm2 status && df -h && free -h

# Logs de errores
pm2 logs --err --lines 100

# Health checks
curl http://localhost:3002/health
curl http://localhost:3003/health

# Backup rápido
cd /opt/psi-vision-hub && git add -A && git commit -m "backup $(date +%Y%m%d)"
```

---

**Documento generado:** Enero 2026
