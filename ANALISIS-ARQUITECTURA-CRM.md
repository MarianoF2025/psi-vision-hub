# 🔍 ANÁLISIS ARQUITECTURA CRM - PSI VISION HUB

## 📋 Resumen Ejecutivo

**Problema Identificado**: El CRM no puede conectarse correctamente con Supabase para mostrar conversaciones y mensajes que el Router PSI ya está guardando exitosamente.

**Estado Actual**:
- ✅ **Router PSI**: Funciona al 100%, guarda datos en Supabase (puerto 3002)
- ✅ **Supabase**: Funcionando, datos confirmados (2 conversaciones, 12 mensajes)
- ❌ **CRM**: No muestra mensajes, falla conexión Supabase

---

## 🔍 DIAGNÓSTICO ENCONTRADO

### 0. **PROBLEMA CRÍTICO IDENTIFICADO: Desajuste de valores de área** ⚠️

**Problema**: El Router PSI guarda áreas en **minúsculas y sin tildes** (`'administracion'`, `'ventas1'`, `'alumnos'`, `'comunidad'`), pero el CRM estaba buscando valores diferentes (`'PSI Principal'`, `'Administración'`, `'Ventas'`).

**Ubicación**: `components/crm/CRMInterface.tsx` líneas 107-121

**Solución aplicada**: Se creó un mapeo `inboxToAreaMap` que convierte los nombres de inbox de la UI a los valores reales que el Router guarda en Supabase.

**Valores correctos**:
- `'PSI Principal'` → `'administracion'`
- `'Ventas'` → `'ventas1'` (con "1" al final)
- `'Alumnos'` → `'alumnos'`
- `'Administración'` → `'administracion'` (sin tilde, minúscula)
- `'Comunidad'` → `'comunidad'`

### 1. **PROBLEMA PRINCIPAL: Configuración de Cliente Supabase**

#### Ubicación del problema:
```4:8:lib/supabase/client.ts
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

#### Problema identificado:
1. **Sin validación de variables**: El código usa el operador `!` que asume que las variables siempre existen, pero si están `undefined`, el cliente de Supabase se crea con valores inválidos
2. **No hay manejo de errores**: Si las variables no están configuradas, el cliente falla silenciosamente
3. **Variables de entorno pueden no estar cargadas**: Next.js requiere que las variables `NEXT_PUBLIC_*` estén disponibles en el momento del build/ejecución

### 2. **COMPARACIÓN: Router PSI vs CRM**

| Aspecto | Router PSI (✅ Funciona) | CRM (❌ No funciona) |
|---------|-------------------------|----------------------|
| **Ubicación** | `router-psi/src/config/supabase.ts` | `lib/supabase/client.ts` |
| **Variables** | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Archivo .env** | `.env` en `router-psi/` | `.env.local` en raíz |
| **Validación** | ✅ Joi schema valida variables | ❌ No valida antes de usar |
| **Cliente** | `@supabase/supabase-js` | `@supabase/ssr` (browser client) |
| **Service Role** | ✅ Usa `serviceKey` para escritura | ❌ Solo usa `anonKey` (lectura limitada) |
| **Carga de .env** | ✅ `dotenv.config()` explícito | ❌ Next.js carga automáticamente |

### 3. **PROBLEMAS ESPECÍFICOS IDENTIFICADOS**

#### Problema 1: Variables de entorno no validadas
**Archivo**: `lib/supabase/client.ts`
**Líneas**: 4-8
**Impacto**: Si `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY` son `undefined`, el cliente se crea con valores inválidos y las queries fallan silenciosamente.

#### Problema 2: Sin manejo de errores en queries
**Archivos afectados**:
- `components/crm/CRMInterface.tsx` (líneas 81-143)
- `components/crm/ChatPanel.tsx` (líneas 61-89)
- `components/crm/ConversationList.tsx` (líneas 36-63)

**Impacto**: Los errores se capturan pero solo se muestran en consola. No hay feedback visual claro al usuario cuando falla la conexión.

#### Problema 3: Posibles problemas de RLS (Row Level Security)
**Tablas afectadas**: `conversaciones`, `mensajes`, `contactos`

**Impacto**: Si RLS está habilitado en Supabase y no hay políticas que permitan acceso con la `anon_key`, las queries del CRM fallarán con errores de permisos, aunque el Router PSI (que usa `serviceKey`) pueda escribir.

#### Problema 4: Diferencia en autenticación
- **Router PSI**: Usa `SUPABASE_SERVICE_ROLE_KEY` → Bypass completo de RLS
- **CRM**: Usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Sujeto a políticas RLS

**Impacto**: Incluso si las variables están configuradas correctamente, RLS puede estar bloqueando las queries del CRM.

---

## 🔧 SOLUCIÓN PROPUESTA

### Paso 1: Validar y mejorar el cliente de Supabase

**Archivo**: `lib/supabase/client.ts`

**Código actual**:
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Código corregido**:
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Validar que las variables estén configuradas
  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    throw new Error(
      `❌ Variables de entorno de Supabase no configuradas: ${missingVars.join(', ')}\n` +
      `Por favor, crea un archivo .env.local en la raíz del proyecto con:\n` +
      `NEXT_PUBLIC_SUPABASE_URL=https://rbtczzjlvnymylkvcwdv.supabase.co\n` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui`
    );
  }

  // Validar formato de URL
  try {
    new URL(supabaseUrl);
  } catch {
    throw new Error(`❌ NEXT_PUBLIC_SUPABASE_URL tiene formato inválido: ${supabaseUrl}`);
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
```

### Paso 2: Verificar y crear archivo .env.local

**Ubicación**: Raíz del proyecto (`psi-vision-hub/.env.local`)

**Contenido requerido**:
```bash
# Supabase - Credenciales confirmadas del Router
NEXT_PUBLIC_SUPABASE_URL=https://rbtczzjlvnymylkvcwdv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Opcional: Service Role Key (para operaciones administrativas desde API routes)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Nota**: Obtén el `ANON_KEY` completo desde tu proyecto de Supabase:
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Settings > API
4. Copia la "anon/public" key

### Paso 3: Verificar políticas RLS en Supabase

**Acciones requeridas**:

1. **Conectarse a Supabase Dashboard**:
   - URL: https://supabase.com/dashboard/project/rbtczzjlvnymylkvcwdv

2. **Revisar RLS en tablas**:
   - Tabla `conversaciones`: SQL Editor > Ejecutar:
   ```sql
   -- Verificar si RLS está habilitado
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename = 'conversaciones';
   ```

3. **Crear políticas si no existen**:
   ```sql
   -- Permitir lectura pública de conversaciones (para CRM)
   CREATE POLICY "Permitir lectura pública de conversaciones"
   ON conversaciones FOR SELECT
   USING (true);

   -- Permitir lectura pública de mensajes (para CRM)
   CREATE POLICY "Permitir lectura pública de mensajes"
   ON mensajes FOR SELECT
   USING (true);

   -- Permitir lectura pública de contactos (para CRM)
   CREATE POLICY "Permitir lectura pública de contactos"
   ON contactos FOR SELECT
   USING (true);

   -- Permitir actualización de conversaciones (para cambios de estado, asignación)
   CREATE POLICY "Permitir actualización de conversaciones"
   ON conversaciones FOR UPDATE
   USING (true)
   WITH CHECK (true);
   ```

   **⚠️ NOTA DE SEGURIDAD**: Estas políticas permiten acceso público completo. Para producción, considera restringir basándose en roles de usuario o autenticación.

### Paso 4: Mejorar manejo de errores en componentes CRM

**Archivo**: `components/crm/CRMInterface.tsx`

**Agregar validación inicial**:
```typescript
useEffect(() => {
  // Validar que Supabase esté configurado
  try {
    const client = createClient();
    if (!client) {
      setError('Error: Cliente de Supabase no inicializado. Verifica las variables de entorno.');
      return;
    }
  } catch (error: any) {
    setError(error.message || 'Error al inicializar Supabase');
    return;
  }

  // Resto del código...
}, [selectedInbox]);
```

### Paso 5: Agregar logging para debugging

**Agregar al inicio de `loadConversations`**:
```typescript
const loadConversations = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Debug: Verificar configuración
    console.log('🔍 Configuración Supabase:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurado' : '❌ Faltante',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Faltante',
    });
    
    const supabase = createClient();
    console.log('🔍 Cliente Supabase creado:', supabase ? '✅' : '❌');
    
    // Resto del código...
```

---

## ✅ VERIFICACIÓN

### Test 1: Verificar variables de entorno

**Comando**:
```bash
# Desde la raíz del proyecto
node -e "console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'); console.log('KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌');"
```

**En Next.js (desde componente)**:
```typescript
// Agregar temporalmente en CRMInterface.tsx
useEffect(() => {
  console.log('🔍 Variables de entorno:', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado' : 'Faltante',
  });
}, []);
```

### Test 2: Verificar conexión a Supabase

**Desde navegador (Consola del desarrollador)**:
```javascript
// Ejecutar en consola del navegador en la página del CRM
fetch('https://rbtczzjlvnymylkvcwdv.supabase.co/rest/v1/conversaciones?select=id&limit=1', {
  headers: {
    'apikey': 'TU_ANON_KEY_AQUI',
    'Authorization': 'Bearer TU_ANON_KEY_AQUI'
  }
})
.then(r => r.json())
.then(data => console.log('✅ Conexión exitosa:', data))
.catch(err => console.error('❌ Error de conexión:', err));
```

### Test 3: Verificar queries desde el código

**Agregar logging temporal en `CRMInterface.tsx`**:
```typescript
const { data, error: queryError } = await query;

if (queryError) {
  console.error('❌ Error de query Supabase:', {
    message: queryError.message,
    details: queryError.details,
    hint: queryError.hint,
    code: queryError.code,
  });
  // ...
}
```

### Test 4: Verificar RLS

**Query SQL en Supabase Dashboard**:
```sql
-- Verificar políticas existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('conversaciones', 'mensajes', 'contactos');
```

### Test 5: Probar conexión completa

**Pasos**:
1. Reiniciar servidor de desarrollo: `npm run dev`
2. Abrir CRM: http://localhost:3001/crm-com
3. Abrir consola del navegador (F12)
4. Verificar:
   - ✅ No hay errores de conexión
   - ✅ Variables de entorno están configuradas
   - ✅ Queries retornan datos (no arrays vacíos)
   - ✅ Mensajes se cargan correctamente

---

## 📊 COMPARACIÓN DE CONFIGURACIÓN: Router vs CRM

### Router PSI (✅ Funciona)

```typescript
// router-psi/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Env } from './environment';

export const supabaseAdmin = createClient(
  Env.supabase.url, 
  Env.supabase.serviceKey,  // ✅ Service Role Key - Bypass RLS
  {
    auth: { persistSession: false }
  }
);

export const supabaseAnon = createClient(
  Env.supabase.url, 
  Env.supabase.anonKey,
  {
    auth: { persistSession: false }
  }
);
```

**Variables de entorno** (`.env` en `router-psi/`):
```bash
SUPABASE_URL=https://rbtczzjlvnymylkvcwdv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### CRM (❌ No funciona actualmente)

```typescript
// lib/supabase/client.ts
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,  // ⚠️ Puede ser undefined
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // ⚠️ Puede ser undefined
  );
}
```

**Variables de entorno** (`.env.local` en raíz):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://rbtczzjlvnymylkvcwdv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🎯 CHECKLIST DE SOLUCIÓN

### ✅ Pasos a seguir (en orden):

- [ ] **1. Verificar archivo .env.local existe en raíz del proyecto**
  ```bash
  ls -la .env.local  # Debe existir
  ```

- [ ] **2. Verificar variables están configuradas**
  ```bash
  grep NEXT_PUBLIC_SUPABASE .env.local
  ```

- [ ] **3. Actualizar `lib/supabase/client.ts` con validación**
  - Agregar validación de variables
  - Agregar manejo de errores
  - Agregar logging para debugging

- [ ] **4. Verificar RLS en Supabase Dashboard**
  - Tablas: `conversaciones`, `mensajes`, `contactos`
  - Si RLS está habilitado, crear políticas de lectura pública

- [ ] **5. Reiniciar servidor de desarrollo**
  ```bash
  npm run dev
  ```

- [ ] **6. Probar conexión**
  - Abrir http://localhost:3001/crm-com
  - Verificar que no hay errores en consola
  - Verificar que las conversaciones se cargan

- [ ] **7. Verificar datos**
  - Debe mostrar las 2 conversaciones confirmadas
  - Debe mostrar los 12 mensajes confirmados
  - Los mensajes deben aparecer en el panel de chat

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: Variables undefined en el navegador

**Síntoma**: `process.env.NEXT_PUBLIC_SUPABASE_URL` es `undefined` en el navegador

**Solución**:
1. Verificar que el archivo se llama `.env.local` (no `.env`)
2. Reiniciar el servidor de desarrollo (`npm run dev`)
3. En producción, verificar que las variables estén en el servidor

### Problema 2: Error 401 Unauthorized

**Síntoma**: Queries fallan con error 401

**Causa**: ANON_KEY incorrecto o RLS bloqueando acceso

**Solución**:
1. Verificar ANON_KEY en Supabase Dashboard
2. Revisar políticas RLS
3. Crear políticas de lectura pública si es necesario

### Problema 3: Error de CORS

**Síntoma**: Error de CORS al hacer queries

**Causa**: Supabase bloqueando el origen

**Solución**:
1. En Supabase Dashboard > Settings > API
2. Agregar `http://localhost:3001` a "Additional Allowed Origins"
3. En producción, agregar el dominio real

### Problema 4: Datos no se actualizan en tiempo real

**Síntoma**: Los mensajes nuevos no aparecen automáticamente

**Causa**: Suscripción a tiempo real no funciona

**Solución**:
1. Verificar que Realtime esté habilitado en Supabase
2. Verificar políticas de publicación en la tabla `mensajes`
3. Revisar logs de suscripción en consola

---

## 📝 ARCHIVOS A MODIFICAR

1. ✅ `lib/supabase/client.ts` - **PRIORITARIO**
2. ✅ `components/crm/CRMInterface.tsx` - Agregar validación inicial
3. ⚠️ `.env.local` - Verificar/Crear (no commitear)
4. 📊 Supabase Dashboard - Verificar/Configurar RLS

---

## 🎓 REFERENCIAS

- **Documentación Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Next.js Environment Variables**: https://nextjs.org/docs/basic-features/environment-variables
- **Supabase JS Client**: https://supabase.com/docs/reference/javascript/introduction
- **Supabase SSR**: https://supabase.com/docs/guides/auth/server-side/nextjs

---

## ✨ SIGUIENTE PASO

**Ejecutar el Paso 1 inmediatamente** para validar la configuración y obtener mensajes de error específicos que ayuden a diagnosticar el problema exacto.

**Prioridad**: 🚨 CRÍTICA - El CRM es inutilizable sin acceso a Supabase.

