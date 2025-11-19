# 🧹 Plan de Limpieza: Eliminar Router del CRM

## 🎯 Objetivo

**Eliminar COMPLETAMENTE todo el código del Router del proyecto CRM** para evitar:
- ❌ Conflictos entre Router viejo y nuevo
- ❌ Duplicación de código
- ❌ Confusión sobre qué Router está activo
- ❌ Procesamiento duplicado de mensajes
- ❌ Errores por dependencias rotas

---

## 📋 Archivos a ELIMINAR del CRM

### 1. Directorio Completo del Router

```
lib/router/                    # ❌ ELIMINAR TODO
├── processor.ts              # ❌ ELIMINAR
├── menus.ts                  # ❌ ELIMINAR
├── types.ts                  # ❌ ELIMINAR
├── media.ts                  # ❌ ELIMINAR
└── meta.ts                   # ❌ ELIMINAR
```

### 2. Endpoints API del Router

```
app/api/router/                # ❌ ELIMINAR TODO
├── whatsapp/
│   └── webhook/
│       └── route.ts          # ❌ ELIMINAR
├── messages/
│   └── send/
│       └── route.ts          # ❌ ELIMINAR
├── conversations/
│   └── [id]/
│       └── route.ts          # ❌ ELIMINAR
├── debug/
│   └── route.ts              # ❌ ELIMINAR
└── test/
    └── route.ts              # ❌ ELIMINAR (o mantener solo para testing)
```

### 3. Referencias en Código

**Buscar y eliminar referencias a:**
- `@/lib/router/*`
- `RouterProcessor`
- `processMessage`
- Imports del Router

**Archivos a revisar:**
- `app/crm-com/page.tsx` - Verificar si hay referencias
- `components/crm/*` - Verificar si hay referencias
- Cualquier otro archivo que importe del Router

---

## ✅ Checklist de Limpieza

### Paso 1: Verificar Dependencias

```bash
# Buscar todas las referencias al Router
grep -r "lib/router" app/ components/ lib/ --exclude-dir=node_modules
grep -r "RouterProcessor" app/ components/ lib/ --exclude-dir=node_modules
grep -r "from.*router" app/ components/ lib/ --exclude-dir=node_modules
```

**Si encuentra referencias:**
- Eliminar imports
- Eliminar código que use el Router
- Verificar que no rompa funcionalidades del CRM

### Paso 2: Eliminar Archivos

```bash
# Eliminar directorio completo del Router
rm -rf lib/router/

# Eliminar endpoints API del Router
rm -rf app/api/router/
```

### Paso 3: Limpiar package.json

**Verificar dependencias:**
- Si hay dependencias específicas del Router que no se usan en el CRM, eliminarlas
- Mantener solo dependencias necesarias para el CRM

### Paso 4: Actualizar README.md

**Eliminar secciones sobre el Router:**
- Sección "Router WSP4"
- Endpoints del Router
- Configuración del Router
- Referencias al Router integrado

### Paso 5: Limpiar Variables de Entorno

**En `.env.local` del CRM, eliminar:**
```env
# ❌ ELIMINAR estas variables (solo para Router)
CLOUD_API_TOKEN=
CLOUD_API_PHONE_NUMBER_ID=
CLOUD_API_BASE_URL=
WHATSAPP_VERIFY_TOKEN=
N8N_WEBHOOK_ENVIOS_ROUTER_*
N8N_WEBHOOK_INGESTA_ROUTER_*
```

**Mantener solo:**
```env
# ✅ MANTENER (necesarias para CRM)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Paso 6: Verificar Build

```bash
# Verificar que el build funciona sin el Router
npm run build

# Si hay errores:
# - Eliminar imports rotos
# - Eliminar código que dependa del Router
# - Verificar que el CRM funciona correctamente
```

### Paso 7: Actualizar Nginx

**Eliminar configuración del Router del CRM:**
- El Router tendrá su propia configuración Nginx
- El CRM solo necesita su propia configuración

---

## 🔍 Verificación Post-Limpieza

### 1. Verificar que no hay referencias

```bash
# Debe retornar 0 resultados
grep -r "lib/router" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "RouterProcessor" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "processMessage" . --exclude-dir=node_modules --exclude-dir=.git
```

### 2. Verificar que el CRM funciona

```bash
# El CRM debe funcionar normalmente
npm run dev

# Verificar que:
# - ✅ El CRM carga correctamente
# - ✅ Las conversaciones se muestran
# - ✅ Los mensajes se pueden enviar
# - ✅ No hay errores en consola
```

### 3. Verificar que el build funciona

```bash
npm run build

# Debe compilar sin errores relacionados al Router
```

---

## 📝 Script de Limpieza Automática

**Crear `limpiar-router-del-crm.sh`:**

```bash
#!/bin/bash

echo "🧹 Limpiando Router del CRM..."

# 1. Buscar referencias
echo "🔍 Buscando referencias al Router..."
grep -r "lib/router" app/ components/ lib/ 2>/dev/null | grep -v node_modules
grep -r "RouterProcessor" app/ components/ lib/ 2>/dev/null | grep -v node_modules

read -p "¿Continuar con la eliminación? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Limpieza cancelada"
    exit 1
fi

# 2. Eliminar directorios
echo "🗑️ Eliminando directorios..."
rm -rf lib/router/
rm -rf app/api/router/

# 3. Verificar build
echo "🔨 Verificando build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Limpieza completada exitosamente"
else
    echo "❌ Error en build - revisar errores"
    exit 1
fi
```

---

## ⚠️ Advertencias Importantes

### 1. Backup Antes de Eliminar

```bash
# Crear backup antes de eliminar
git add .
git commit -m "Backup antes de eliminar Router del CRM"
git tag backup-antes-limpiar-router
```

### 2. Verificar que el Router Nuevo Está Funcionando

**ANTES de eliminar el Router del CRM:**
- ✅ Router nuevo deployado y funcionando
- ✅ Webhook de WhatsApp apuntando al Router nuevo
- ✅ Procesamiento de mensajes funcionando
- ✅ Sin errores en logs del Router nuevo

### 3. Orden de Ejecución

**Orden correcto:**
1. ✅ Deployar Router nuevo
2. ✅ Verificar que funciona
3. ✅ Actualizar webhook de WhatsApp
4. ✅ Verificar que procesa mensajes
5. ✅ **ENTONCES** eliminar Router del CRM

**NO hacer:**
- ❌ Eliminar Router del CRM antes de deployar el nuevo
- ❌ Eliminar Router del CRM sin verificar que el nuevo funciona
- ❌ Eliminar Router del CRM sin actualizar webhook

---

## 📋 Checklist Final

### Pre-Limpieza
- [ ] Router nuevo deployado y funcionando
- [ ] Webhook de WhatsApp actualizado
- [ ] Mensajes procesándose correctamente
- [ ] Backup del código actual

### Limpieza
- [ ] Eliminar `lib/router/`
- [ ] Eliminar `app/api/router/`
- [ ] Eliminar referencias en código
- [ ] Limpiar variables de entorno
- [ ] Actualizar README.md
- [ ] Verificar build

### Post-Limpieza
- [ ] Verificar que no hay referencias
- [ ] Verificar que el CRM funciona
- [ ] Verificar que el build funciona
- [ ] Commit de limpieza
- [ ] Documentar cambios

---

## 🎯 Resultado Esperado

**Después de la limpieza:**

- ✅ CRM sin código del Router
- ✅ Router completamente separado
- ✅ Sin conflictos ni duplicación
- ✅ CRM más simple y mantenible
- ✅ Router independiente y optimizado

---

## 🚀 Próximos Pasos

1. **Deployar Router nuevo** (proyecto separado)
2. **Verificar que funciona** correctamente
3. **Actualizar webhook** de WhatsApp
4. **Ejecutar limpieza** del CRM
5. **Verificar** que todo funciona

**¿Quieres que preparemos el script de limpieza ahora?**

