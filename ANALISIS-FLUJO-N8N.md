# 🔍 Análisis: Flujo de Ingesta n8n vs Router

## 📊 Flujo de n8n (Ingesta)

### Flujo cuando `skipUpload = false` (Nuevo):
```
1. Webhook → recibe mensaje
2. Verificar y Normalizar → estructura datos
3. Switch1 (skipUpload = false) → Crear Contacto
4. Crear Contacto → INSERT en contactos
5. Capturar contacto → SELECT contacto por teléfono
6. Crear conversacion → INSERT con contacto_id: $json.id (del contacto) ✅
7. Crear Mensaje → INSERT con conversacion_id: $json.id (de la conversación) ✅
```

### Flujo cuando `skipUpload = true` (Existente):
```
1. Webhook → recibe mensaje
2. Verificar y Normalizar → estructura datos
3. Switch1 (skipUpload = true) → Captar Conversacion
4. Captar Conversacion → SELECT conversación por teléfono
5. Switch (por tipo) → Crear mensaje audio/doc/doc2
6. Crear mensaje → INSERT con conversacion_id: $('Captar Conversacion').item.json.id ✅
```

## ❌ Problemas Identificados

### 1. **Conversación existente NO se actualiza**
Cuando `skipUpload = true`, n8n:
- ✅ Busca conversación existente
- ❌ NO actualiza `ts_ultimo_mensaje`
- ❌ NO actualiza `estado` (si estaba 'nueva')
- ❌ NO actualiza `updated_at`

**Impacto:** Las conversaciones existentes no reflejan nueva actividad.

### 2. **Inconsistencia en `remitente_tipo`**
- **n8n usa:** `'contact'` para mensajes del usuario
- **Router usa:** `'user'` para mensajes del usuario

**Ejemplo en n8n:**
```javascript
remitente_tipo: 'contact'  // En Verificar y Normalizar
```

**Ejemplo en Router:**
```typescript
remitente_tipo = 'user';  // En saveMessage()
```

**Impacto:** Inconsistencia en los datos, puede causar problemas en queries.

### 3. **Mapeo incorrecto de `remitente_nombre`**
En algunos nodos de n8n:
```json
{
  "fieldId": "remitente_nombre",
  "fieldValue": "={{ $('Check Skip').item.json.mensaje.remitente_tipo }}"
}
```

**Problema:** Está usando `remitente_tipo` como `remitente_nombre` (debería ser el teléfono o nombre del contacto).

### 4. **Falta actualización de conversación en flujo existente**
El router ahora actualiza la conversación cuando existe, pero n8n no lo hace.

## ✅ Comparación: Router vs n8n

| Aspecto | Router (Corregido) | n8n (Actual) |
|---------|-------------------|--------------|
| **Crear contacto** | ✅ Si no existe | ✅ Si no existe |
| **Crear conversación** | ✅ Con `contacto_id` | ✅ Con `contacto_id` |
| **Actualizar conversación existente** | ✅ Actualiza `ts_ultimo_mensaje`, `estado`, `updated_at` | ❌ NO actualiza |
| **Crear mensaje** | ✅ Con `conversacion_id` | ✅ Con `conversacion_id` |
| **remitente_tipo (usuario)** | `'user'` | `'contact'` |
| **remitente_nombre** | Teléfono del usuario | A veces incorrecto (usa remitente_tipo) |

## 🔧 Recomendaciones

### 1. **Unificar `remitente_tipo`**
Decidir un estándar:
- Opción A: Usar `'user'` en ambos (router y n8n)
- Opción B: Usar `'contact'` en ambos

**Recomendación:** Usar `'user'` porque:
- Es más genérico
- El router ya lo usa
- Es más claro (user = usuario, agent = agente, system = sistema)

### 2. **Corregir mapeo de `remitente_nombre` en n8n**
En todos los nodos "Crear mensaje", cambiar:
```json
{
  "fieldId": "remitente_nombre",
  "fieldValue": "={{ $('Verificar y Normalizar').item.json.mensaje.telefono }}"
}
```

### 3. **Agregar actualización de conversación en n8n**
Después de "Captar Conversacion", agregar un nodo "Actualizar Conversacion":
```json
{
  "operation": "update",
  "tableId": "conversaciones",
  "updateKey": "id",
  "updateKeyValue": "={{ $json.id }}",
  "fieldsUi": {
    "fieldValues": [
      {
        "fieldId": "ts_ultimo_mensaje",
        "fieldValue": "={{ $('Verificar y Normalizar').item.json.mensaje.timestamp }}"
      },
      {
        "fieldId": "updated_at",
        "fieldValue": "={{ $now }}"
      },
      {
        "fieldId": "estado",
        "fieldValue": "={{ $json.estado === 'nueva' ? 'activa' : $json.estado }}"
      }
    ]
  }
}
```

### 4. **Verificar orden de creación**
El router ahora sigue el orden correcto:
1. Contacto (si no existe)
2. Conversación (si no existe, con `contacto_id`)
3. Actualizar conversación (si existe)
4. Mensaje (con `conversacion_id`)

n8n también lo sigue cuando es nuevo, pero falta actualizar cuando es existente.

## 📋 Acciones Requeridas

1. ✅ **Router corregido** - Ya actualiza conversación existente
2. ⏳ **n8n** - Agregar actualización de conversación en flujo existente
3. ⏳ **Unificar `remitente_tipo`** - Decidir estándar y aplicar en ambos
4. ⏳ **Corregir `remitente_nombre`** - En todos los nodos de n8n

