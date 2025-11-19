# 📋 Archivos a Revisar Antes de Limpiar Router

## 🔍 Archivos con Referencias al Router

### 1. `app/api/messages/send/route.ts`

**Estado:** ✅ Probablemente NO usa Router directamente
- Este endpoint es para enviar mensajes desde el CRM
- Puede que use Supabase directamente
- **Acción:** Verificar y eliminar cualquier referencia al Router

### 2. `components/crm/InboxSidebar.tsx`

**Estado:** ⚠️ Posible referencia
- Puede tener referencias a tipos del Router
- Puede tener imports del Router
- **Acción:** Revisar y eliminar referencias

### 3. `app/login/page.tsx` y `app/logout/page.tsx`

**Estado:** ⚠️ Posible referencia
- Puede tener imports o referencias al Router
- **Acción:** Revisar y eliminar referencias

### 4. `components/Header.tsx`

**Estado:** ⚠️ Posible referencia
- Puede tener referencias al Router
- **Acción:** Revisar y eliminar referencias

---

## ✅ Archivos que NO Deben Tener Referencias

Estos archivos NO deberían tener referencias al Router:
- `app/crm-com/page.tsx` - Solo usa CRM
- `components/crm/CRMInterface.tsx` - Solo usa CRM
- `components/crm/ChatPanel.tsx` - Solo usa CRM
- `lib/types/crm.ts` - Tipos del CRM (no del Router)

---

## 🔧 Acciones por Archivo

### `app/api/messages/send/route.ts`

**Verificar:**
```typescript
// Buscar imports como:
import { RouterProcessor } from '@/lib/router/processor';
import { sendWhatsAppMessage } from '@/lib/router/...';

// Si encuentra, eliminar y usar Supabase directamente
```

**Si envía mensajes por WhatsApp:**
- Opción 1: Llamar al Router nuevo vía API
- Opción 2: Usar WhatsApp API directamente (no recomendado)
- Opción 3: Solo guardar en Supabase y que el Router nuevo lo procese

### `components/crm/InboxSidebar.tsx`

**Verificar:**
```typescript
// Buscar imports como:
import { InboxType } from '@/lib/router/types';

// Si encuentra, mover tipos a lib/types/crm.ts
```

### `app/login/page.tsx` y `app/logout/page.tsx`

**Verificar:**
- Probablemente solo tienen referencias en comentarios o no usan Router
- Eliminar cualquier import o referencia

### `components/Header.tsx`

**Verificar:**
- Probablemente solo tiene referencias en comentarios
- Eliminar cualquier import o referencia

---

## 📝 Checklist de Revisión

Antes de ejecutar `limpiar-router-del-crm.sh`:

- [ ] Revisar `app/api/messages/send/route.ts`
- [ ] Revisar `components/crm/InboxSidebar.tsx`
- [ ] Revisar `app/login/page.tsx`
- [ ] Revisar `app/logout/page.tsx`
- [ ] Revisar `components/Header.tsx`
- [ ] Buscar todas las referencias: `grep -r "lib/router" app/ components/`
- [ ] Buscar RouterProcessor: `grep -r "RouterProcessor" app/ components/`
- [ ] Eliminar referencias encontradas
- [ ] Verificar que el build funciona: `npm run build`

---

## 🎯 Resultado Esperado

Después de la limpieza:
- ✅ Cero referencias al Router en el CRM
- ✅ CRM funciona independientemente
- ✅ Router completamente separado
- ✅ Sin conflictos ni duplicación

