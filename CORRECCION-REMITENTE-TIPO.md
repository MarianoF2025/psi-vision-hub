# 🔧 Corrección: Unificación de `remitente_tipo`

## ❌ Problema Identificado

**Inconsistencia entre Router y n8n:**
- **Router usaba:** `remitente_tipo = 'user'` para mensajes del usuario
- **n8n usa:** `remitente_tipo = 'contact'` para mensajes del usuario

## ✅ Corrección Implementada

### Cambios en `lib/router/processor.ts`:

1. **En `saveMessage()`:**
   ```typescript
   // ANTES:
   remitente_tipo = 'user';
   
   // DESPUÉS:
   remitente_tipo = 'contact'; // Consistente con n8n
   ```

2. **En `extraerOpcionesSeleccionadas()`:**
   ```typescript
   // ANTES:
   if (msg.remitente_tipo === 'user' && msg.mensaje) {
   
   // DESPUÉS:
   if (msg.remitente_tipo === 'contact' && msg.mensaje) {
   ```

## 📊 Valores Unificados

### `remitente_tipo` - Estándar:
- `'system'` → Mensajes del sistema/router
- `'contact'` → Mensajes del usuario/contacto (WhatsApp)
- `'agent'` → Mensajes de agentes/operadores

### `remitente_nombre`:
- Sistema: `'Router PSI'`
- Contacto: Número de teléfono (ej: `'5491133901743'`)
- Agente: Email o identificador del agente

## ✅ Beneficios

1. **Consistencia:** Router y n8n usan los mismos valores
2. **Queries uniformes:** Fácil filtrar por tipo en Supabase
3. **Mantenibilidad:** Un solo estándar para todo el sistema

## 🧪 Testing

Después de la corrección, verificar:
1. Mensajes del usuario se guardan con `remitente_tipo = 'contact'`
2. Mensajes del sistema se guardan con `remitente_tipo = 'system'`
3. Queries que buscan `remitente_tipo = 'contact'` funcionan correctamente

