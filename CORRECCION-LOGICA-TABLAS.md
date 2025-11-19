# 🔧 Corrección: Lógica de Vinculación de Tablas

## ❌ Problema Identificado

El sistema NO estaba siguiendo la lógica correcta de vinculación:

### Lógica Correcta (Requerida):
```
1. Entra un mensaje
2. Se crea el contacto (si no existe)
3. Se crea la conversación (si no existe) → usa contacto_id
4. Si existe conversación → se DEBE actualizar (ts_ultimo_mensaje, estado, etc.)
5. Se crea mensaje → usa conversacion_id
```

### Lógica Incorrecta (Anterior):
```
1. Entra un mensaje
2. Busca conversación por teléfono
3. Si encuentra conversación → la retorna SIN actualizar ❌
4. Si NO encuentra conversación:
   - Busca contacto
   - Crea contacto si no existe ✅
   - Crea conversación con contacto_id ✅
5. Guarda mensaje con conversacion_id ✅
```

## ✅ Corrección Implementada

### Cambio en `findOrCreateConversation()`:

**ANTES:**
```typescript
if (existing) {
  console.log(`Conversación existente encontrada: ${existing.id}`);
  return existing; // ❌ No actualiza
}
```

**DESPUÉS:**
```typescript
if (existing) {
  console.log(`Conversación existente encontrada: ${existing.id}`);
  // Actualizar conversación existente con nueva actividad
  const { data: updated, error: updateError } = await this.supabase
    .from('conversaciones')
    .update({
      ts_ultimo_mensaje: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      estado: existing.estado === 'nueva' ? 'activa' : existing.estado,
    })
    .eq('id', existing.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('⚠️ Error actualizando conversación existente (no crítico):', updateError);
    return existing; // Retornar aunque falle la actualización
  }
  
  return updated || existing;
}
```

## 📊 Flujo Correcto Ahora

### 1. Entra un mensaje
- Webhook recibe mensaje de WhatsApp
- RouterProcessor.processMessage() inicia

### 2. Se crea el contacto (si no existe)
```typescript
// Buscar contacto existente
const { data: contact } = await supabase
  .from('contactos')
  .select('*')
  .eq('telefono', phone)
  .maybeSingle();

// Crear contacto si no existe
if (!contact) {
  const { data: newContact } = await supabase
    .from('contactos')
    .insert({
      telefono: phone,
      nombre: phone,
    })
    .select()
    .single();
}
```

### 3. Se crea la conversación (si no existe) → usa contacto_id
```typescript
// Buscar conversación existente
const { data: existing } = await supabase
  .from('conversaciones')
  .select('*')
  .eq('telefono', phone)
  .maybeSingle();

// Si NO existe, crear con contacto_id
if (!existing) {
  const { data: conversation } = await supabase
    .from('conversaciones')
    .insert({
      contacto_id: finalContact.id, // ✅ Usa contacto_id
      telefono: phone,
      area: 'PSI Principal',
      estado: 'nueva',
      ts_ultimo_mensaje: new Date().toISOString(),
    })
    .select()
    .single();
}
```

### 4. Si existe conversación → se actualiza
```typescript
// Si existe, actualizar
if (existing) {
  const { data: updated } = await supabase
    .from('conversaciones')
    .update({
      ts_ultimo_mensaje: new Date().toISOString(), // ✅ Actualiza timestamp
      updated_at: new Date().toISOString(),
      estado: existing.estado === 'nueva' ? 'activa' : existing.estado,
    })
    .eq('id', existing.id)
    .select()
    .single();
}
```

### 5. Se crea mensaje → usa conversacion_id
```typescript
await this.saveMessage(conversation.id, phone, originalText, metadata);

// Dentro de saveMessage():
await supabase
  .from('mensajes')
  .insert({
    conversacion_id: conversationId, // ✅ Usa conversacion_id
    mensaje: mensaje,
    tipo: tipo,
    remitente_tipo: remitente_tipo,
    remitente_nombre: remitente_nombre,
    timestamp: new Date().toISOString(),
    metadata: metadata,
  });
```

## 🔗 Relaciones de Tablas

### contactos
- `id` (UUID, PK)
- `telefono` (TEXT, UNIQUE)
- `nombre` (TEXT)

### conversaciones
- `id` (UUID, PK)
- `contacto_id` (UUID, FK → contactos.id) ✅
- `telefono` (TEXT) - redundante pero útil para búsquedas
- `area` (TEXT)
- `estado` (TEXT)
- `ts_ultimo_mensaje` (TIMESTAMP)

### mensajes
- `id` (UUID, PK)
- `conversacion_id` (UUID, FK → conversaciones.id) ✅
- `mensaje` (TEXT)
- `tipo` (TEXT) - 'text', 'image', 'audio', etc.
- `remitente_tipo` (TEXT) - 'system', 'user', 'agent'
- `remitente_nombre` (TEXT)
- `timestamp` (TIMESTAMP)

## ✅ Verificación

Después de la corrección:

1. **Primer mensaje de un contacto:**
   - ✅ Crea contacto
   - ✅ Crea conversación con contacto_id
   - ✅ Guarda mensaje con conversacion_id

2. **Mensaje subsiguiente del mismo contacto:**
   - ✅ Encuentra conversación existente
   - ✅ Actualiza ts_ultimo_mensaje
   - ✅ Actualiza estado si estaba 'nueva'
   - ✅ Guarda mensaje con conversacion_id

3. **Relaciones correctas:**
   - ✅ conversaciones.contacto_id → contactos.id
   - ✅ mensajes.conversacion_id → conversaciones.id

