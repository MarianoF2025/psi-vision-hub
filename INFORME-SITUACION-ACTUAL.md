# Informe de Situación Actual - Router PSI y CRM

**Fecha:** 18 de Noviembre, 2025  
**Estado:** 🔴 CRÍTICO - Sistema no funcional

---

## 📋 Resumen Ejecutivo

El sistema de ingesta de mensajes de WhatsApp al CRM **NO está funcionando correctamente**. Los mensajes se reciben y procesan parcialmente, pero:

1. ❌ Los mensajes del sistema (menús) no se guardan correctamente en Supabase
2. ❌ El estado del menú no se detecta correctamente
3. ❌ La derivación de conversaciones no funciona
4. ❌ Los mensajes no aparecen completos en el CRM
5. ❌ El proceso de actualización (git push/pull) es inestable

---

## 🔍 Problemas Identificados

### 1. **Problema: Mensajes del Sistema No Se Guardan**

**Síntoma:**
- Cuando se muestra el menú principal o submenú, el mensaje debería guardarse en Supabase
- Los logs muestran: `No hay mensajes, asumiendo menú principal`
- Esto indica que `getMenuState()` no encuentra los mensajes guardados

**Causa Probable:**
- La columna `remitente` puede no existir en la tabla `mensajes` de Supabase
- Error visto en logs: `column mensajes.remitente does not exist`
- El código intenta guardar con `remitente: 'system'` pero la columna no existe

**Evidencia:**
```
Error obteniendo estado del menú: {
  code: '42703',
  message: 'column mensajes.remitente does not exist'
  hint: 'Perhaps you meant to reference the column "mensajes.remitente_id".'
}
```

### 2. **Problema: Estado del Menú No Se Detecta**

**Síntoma:**
- Cuando el usuario envía "22" (opción del submenú), el sistema no detecta que está en el submenú
- Siempre asume que está en el menú principal
- Por lo tanto, trata "22" como opción del menú principal (que no existe) y muestra el menú principal de nuevo

**Causa:**
- `getMenuState()` no encuentra los mensajes del sistema porque:
  - La columna `remitente` no existe
  - O los mensajes no se están guardando correctamente
  - O hay un problema de timing (los mensajes aún no están disponibles cuando se busca)

**Flujo Esperado vs Real:**

| Paso | Esperado | Real |
|------|----------|------|
| Usuario envía "2" | Se guarda mensaje "Alumnos:..." | ❓ No se confirma si se guarda |
| Sistema busca estado | Encuentra "Alumnos:..." | ❌ No encuentra mensajes |
| Usuario envía "22" | Detecta submenú "Alumnos" | ❌ Asume menú principal |
| Resultado | Deriva a "Alumnos" | ❌ Muestra menú principal |

### 3. **Problema: Derivación No Funciona**

**Síntoma:**
- Cuando se selecciona una opción del submenú (ej: "22"), debería:
  1. Detectar que está en el submenú
  2. Encontrar la opción "22" en el submenú de Alumnos
  3. Derivar la conversación de "PSI Principal" a "Alumnos"
  4. Enviar mensaje: "Te estamos derivando con el área de Alumnos..."
  5. Guardar el mensaje de derivación

**Estado Actual:**
- ❌ No detecta el submenú (problema #2)
- ❌ Nunca llega a `processSubmenuSelection()`
- ❌ La conversación nunca se deriva
- ❌ El mensaje de derivación nunca se envía

### 4. **Problema: Mensajes No Aparecen en CRM**

**Síntoma:**
- El usuario menciona: "En la caja de Mensajes tampoco se ve la interacción ni nada"
- Debería verse toda la conversación desde el inicio

**Causa Probable:**
- Los mensajes no se están guardando correctamente en Supabase
- O hay un problema con los permisos RLS (Row Level Security)
- O el CRM no está leyendo correctamente desde Supabase

### 5. **Problema: Proceso de Actualización Inestable**

**Síntoma:**
- `git push` falla con errores 500 de GitHub
- El flujo de actualización (local → GitHub → servidor) es frágil

**Impacto:**
- Los cambios no se propagan al servidor
- Se pierde tiempo en intentos fallidos
- No hay forma confiable de desplegar cambios

---

## 🔬 Análisis Técnico

### Esquema de Base de Datos (Supabase)

**Tabla `mensajes` - Problema Identificado:**

El código intenta usar:
```typescript
{
  conversacion_id: string,
  mensaje: string,
  remitente: string,  // ❌ Esta columna puede no existir
  timestamp: string,
  metadata: jsonb
}
```

Pero el error sugiere que la columna se llama `remitente_id` o tiene otro nombre.

**Acción Requerida:**
- Verificar el esquema real de la tabla `mensajes` en Supabase
- Confirmar qué columnas existen
- Ajustar el código para usar las columnas correctas

### Flujo de Guardado de Mensajes

**Código Actual:**
```typescript
await this.saveMessage(conversationId, 'system', submenuText);
```

**Problema:**
- Si la columna `remitente` no existe, el INSERT falla silenciosamente o se ignora
- No hay verificación de que el mensaje se guardó correctamente
- El delay de 100ms agregado no resuelve el problema de raíz

### Flujo de Detección de Estado

**Código Actual:**
```typescript
const { data: lastMessages } = await this.supabase
  .from('mensajes')
  .select('*')
  .eq('conversacion_id', conversationId)
  .order('timestamp', { ascending: false })
  .limit(10);
```

**Problema:**
- Si los mensajes no se guardaron, no se encontrarán
- La búsqueda por contenido es frágil (depende de strings exactos)

---

## 📊 Estado de Componentes

| Componente | Estado | Funcionalidad |
|------------|--------|---------------|
| **Webhook Reception** | ✅ Funciona | Recibe mensajes de WhatsApp correctamente |
| **Message Parsing** | ✅ Funciona | Parsea JSON correctamente |
| **Contact Creation** | ✅ Funciona | Crea contactos en Supabase |
| **Conversation Creation** | ✅ Funciona | Crea conversaciones en Supabase |
| **User Message Saving** | ⚠️ Parcial | Guarda mensajes del usuario, pero puede fallar |
| **System Message Saving** | ❌ No funciona | No se guardan mensajes del sistema |
| **Menu State Detection** | ❌ No funciona | No detecta estado del menú |
| **Menu Navigation** | ⚠️ Parcial | Muestra menús pero no detecta estado |
| **Submenu Selection** | ❌ No funciona | Nunca se ejecuta porque no detecta submenú |
| **Conversation Derivation** | ❌ No funciona | Nunca se ejecuta |
| **CRM Display** | ❌ No funciona | No muestra mensajes completos |

---

## 🎯 Decisiones a Tomar

### Opción 1: **Corregir Esquema de Base de Datos** (Recomendado)

**Acción:**
1. Verificar esquema real de tabla `mensajes` en Supabase
2. Ajustar código para usar columnas correctas
3. Si `remitente` no existe, crear la columna o usar alternativa

**Pros:**
- Resuelve el problema de raíz
- Permite que el sistema funcione correctamente

**Contras:**
- Requiere acceso a Supabase
- Puede requerir migración de datos

**Tiempo Estimado:** 1-2 horas

---

### Opción 2: **Refactorizar Sistema de Estado del Menú**

**Acción:**
1. Crear tabla `menu_states` en Supabase para guardar estado explícitamente
2. Guardar estado cuando se muestra cada menú
3. Leer estado directamente de la tabla en lugar de inferirlo de mensajes

**Pros:**
- Más robusto y confiable
- No depende de formato de mensajes
- Más fácil de debuggear

**Contras:**
- Requiere cambios en el esquema
- Requiere refactorizar código

**Tiempo Estimado:** 3-4 horas

---

### Opción 3: **Usar Metadata para Estado del Menú**

**Acción:**
1. Guardar estado del menú en `metadata` de la conversación
2. Leer estado desde `conversaciones.metadata` en lugar de mensajes

**Pros:**
- No requiere cambios en esquema
- Más simple de implementar

**Contras:**
- Menos robusto que Opción 2
- Estado puede desincronizarse

**Tiempo Estimado:** 2-3 horas

---

### Opción 4: **Revisar y Corregir Todo el Flujo**

**Acción:**
1. Verificar esquema completo de Supabase
2. Corregir todos los problemas identificados
3. Agregar tests para verificar que funciona
4. Mejorar proceso de deployment

**Pros:**
- Resuelve todos los problemas
- Sistema más robusto a futuro

**Contras:**
- Requiere más tiempo
- Puede requerir cambios mayores

**Tiempo Estimado:** 1-2 días

---

## 🚨 Acciones Inmediatas Requeridas

### 1. **Verificar Esquema de Supabase** (URGENTE)

```sql
-- Ejecutar en Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'mensajes';
```

**Necesario para:**
- Confirmar qué columnas existen
- Identificar el problema exacto
- Decidir cómo corregirlo

### 2. **Verificar Mensajes Guardados**

```sql
-- Verificar si hay mensajes guardados
SELECT id, conversacion_id, mensaje, remitente, timestamp 
FROM mensajes 
ORDER BY timestamp DESC 
LIMIT 10;
```

**Necesario para:**
- Confirmar si los mensajes se están guardando
- Ver qué datos se están guardando realmente

### 3. **Verificar Conversaciones**

```sql
-- Verificar conversaciones
SELECT id, telefono, area, estado, ts_ultimo_mensaje 
FROM conversaciones 
ORDER BY ts_ultimo_mensaje DESC 
LIMIT 5;
```

**Necesario para:**
- Confirmar que las conversaciones se crean
- Ver si el área se actualiza al derivar

---

## 📝 Recomendación Final

**Recomiendo Opción 1 + Opción 2 combinadas:**

1. **Inmediato:** Verificar y corregir esquema de `mensajes` (Opción 1)
2. **Corto plazo:** Implementar tabla `menu_states` para estado explícito (Opción 2)

Esto resuelve el problema inmediato y hace el sistema más robusto a futuro.

---

## 🔧 Próximos Pasos Sugeridos

1. ✅ **Hoy:** Verificar esquema de Supabase y corregir problema de `remitente`
2. ✅ **Esta semana:** Implementar sistema de estado del menú más robusto
3. ✅ **Próxima semana:** Mejorar proceso de deployment y agregar tests

---

## 📞 Información de Contacto

Para resolver estos problemas se necesita:
- Acceso a Supabase (SQL Editor)
- Acceso al servidor (SSH)
- Tiempo para debugging y corrección

---

**Última actualización:** 18 de Noviembre, 2025  
**Estado:** 🔴 Requiere acción inmediata

