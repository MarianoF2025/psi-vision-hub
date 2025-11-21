# 🚀 Guía Rápida: Configurar Nodo Set en n8n

## Problema
El payload incluye `field: "messages"` que el router rechaza con el error: **"field" is not allowed**

## Solución: Nodo Set

### Configuración Paso a Paso

1. **Agregar nodo "Set"** después del nodo IF (o después del trigger si no usas IF)

2. **Configuración del nodo Set:**

   - **Mode**: Selecciona `Manual`
   
   - **Keep Only Set Fields**: ✅ Marca esta opción (esto elimina todas las propiedades que no definas)

3. **Fields to Set** - Agrega estos 4 campos:

   | Name | Value |
   |------|-------|
   | `messaging_product` | `{{ $json.messaging_product }}` |
   | `metadata` | `{{ $json.metadata }}` |
   | `messages` | `{{ $json.messages }}` |
   | `contacts` | `{{ $json.contacts }}` |

4. **IMPORTANTE:** NO agregues un campo llamado `field`

### Resultado

**Antes (con error):**
```json
{
  "messaging_product": "whatsapp",
  "metadata": {...},
  "contacts": [...],
  "messages": [...],
  "field": "messages"  // ❌ Esto causa el error
}
```

**Después (correcto):**
```json
{
  "messaging_product": "whatsapp",
  "metadata": {...},
  "contacts": [...],
  "messages": [...]  // ✅ Sin "field"
}
```

### Flujo Completo

```
WhatsApp Trigger
    ↓
IF (field == 'messages')  [Opcional, pero recomendado]
    ↓
Set (limpiar JSON)  [OBLIGATORIO]
    ↓
HTTP Request → Router PSI
```

### Verificación

Después de configurar el nodo Set, ejecuta el workflow y verifica:

1. **En n8n:** El output del nodo Set NO debe tener la propiedad `field`
2. **En el router:** Deberías recibir `{"success": true, ...}` en lugar del error

### Si sigues teniendo el error

- Verifica que el nodo Set esté **después** del trigger/IF
- Verifica que **NO** hayas agregado un campo `field` en el nodo Set
- Verifica que el nodo HTTP Request use `{{ $json }}` (del nodo Set, no del trigger)


