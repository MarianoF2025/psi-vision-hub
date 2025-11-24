# Sistema de Derivaciones - Implementación Completa

## ✅ Implementación Completada

Se ha implementado la lógica completa para crear automáticamente registros en las tablas `derivaciones` y `tickets` cuando ocurre una derivación por menú.

## 📋 Cambios Realizados

### 1. **Generador de Ticket ID**
Archivo: `src/utils/ticketIdGenerator.ts`

Función que genera `ticket_id` en formato **YYYYMMDD-HHMMSS-XXXX**:
```typescript
generarTicketId() // Ejemplo: "20251122-143052-A3F2"
```

### 2. **Mapeador de Áreas**
Archivo: `src/utils/areaMapper.ts`

Funciones para mapear áreas entre formato interno y base de datos:
- `mapearAreaABD()` - Convierte 'admin' → 'administracion'
- `obtenerNombreArea()` - Obtiene nombre amigable ('Admin' → 'Administración')
- `esAreaHabilitada()` - Verifica si área está habilitada

**Mapeo de áreas:**
- `admin` → `administracion` (BD)
- `alumnos` → `alumnos` (BD)
- `ventas` → `ventas` (BD)
- `comunidad` → `comunidad` (BD)
- `revisar` → `administracion` (BD, por defecto)

### 3. **Mejora de `procesarDerivacion()`**
Archivo: `src/core/PersistorRespuesta.ts`

La función ahora:

1. **Crea registro en `derivaciones`:**
   ```typescript
   {
     conversacion_id: UUID,
     area_origen: 'wsp4' | 'administracion',
     area_destino: 'administracion' | 'alumnos' | 'ventas' | 'comunidad',
     motivo: 'menu_selection',
     ts_derivacion: TIMESTAMPTZ,
     created_at: TIMESTAMPTZ
   }
   ```

2. **Crea registro en `tickets`:**
   ```typescript
   {
     ticket_id: 'YYYYMMDD-HHMMSS-XXXX', // Formato requerido
     conversacion_id: UUID,
     area_destino: 'administracion' | 'alumnos' | ...,
     estado: 'pendiente',
     prioridad: 'normal',
     ts_creacion: TIMESTAMPTZ,
     created_at: TIMESTAMPTZ
   }
   ```

3. **Actualiza `conversaciones`:**
   ```typescript
   {
     area_actual: 'admin' | 'alumnos' | ... (formato interno),
     estado: 'derivado',
     subetiqueta: string,
     ts_ultima_derivacion: TIMESTAMPTZ,
     numero_derivaciones: número incrementado,
     ticket_id: UUID del ticket creado,
     proxy_activo: true, // ✅ NUEVO
     area_proxy: 'administracion' | ... (formato BD) // ✅ NUEVO
   }
   ```

4. **Registra interacción:**
   - Crea registro en `interacciones` con tipo 'derivacion'
   - Incluye metadata con IDs de derivación y ticket

5. **Manejo de errores con rollback:**
   - Si falla creación de ticket → elimina derivación
   - Si falla actualización de conversación → elimina ticket y derivación

## 🔄 Flujo Completo de Derivación

### Escenario: Usuario elige "1" (Admin) en menú principal

1. **EvaluadorEstado** detecta opción "1" → determina `accion: 'derivar'`, `area_destino: 'admin'`

2. **EjecutorAccion** genera mensaje de derivación y prepara datos:
   ```typescript
   {
     tipo: 'derivacion',
     requiere_persistencia: true,
     datos_persistencia: {
       area_destino: 'admin',
       crear_ticket: true,
       motivo: 'menu_selection'
     }
   }
   ```

3. **PersistorRespuesta.procesarDerivacion()** ejecuta:
   - ✅ Crea registro en `derivaciones` con `area_destino: 'administracion'`
   - ✅ Crea registro en `tickets` con `ticket_id: '20251122-143052-A3F2'`
   - ✅ Actualiza `conversaciones` con `proxy_activo: true`, `area_proxy: 'administracion'`
   - ✅ Registra interacción de tipo 'derivacion'

4. **WhatsApp Service** envía mensaje al usuario:
   ```
   ✅ Te hemos derivado a Administración.
   
   Un agente humano te responderá a la brevedad. Si necesitás otra cosa, escribí MENU para volver al menú principal.
   ```

## 📊 Estructura de Datos Creados

### Tabla `derivaciones`
```sql
id: UUID (generado)
conversacion_id: UUID (FK a conversaciones)
area_origen: TEXT ('wsp4' por defecto)
area_destino: TEXT ('administracion', 'alumnos', etc.)
motivo: TEXT ('menu_selection')
ts_derivacion: TIMESTAMPTZ
created_at: TIMESTAMPTZ
```

### Tabla `tickets`
```sql
id: UUID (generado)
ticket_id: TEXT ('YYYYMMDD-HHMMSS-XXXX') UNIQUE
conversacion_id: UUID (FK a conversaciones)
area_destino: TEXT ('administracion', 'alumnos', etc.)
estado: TEXT ('pendiente')
prioridad: TEXT ('normal')
ts_creacion: TIMESTAMPTZ
created_at: TIMESTAMPTZ
```

### Tabla `conversaciones` (actualizada)
```sql
area_actual: 'admin' | 'alumnos' | ... (formato interno)
estado: 'derivado'
subetiqueta: string | null
ts_ultima_derivacion: TIMESTAMPTZ
numero_derivaciones: integer (incrementado)
ticket_id: UUID (FK a tickets)
proxy_activo: boolean (true)
area_proxy: TEXT ('administracion', 'alumnos', etc.) (formato BD)
```

## ✅ Verificación de Funcionalidad

### Test Manual

1. **Usuario envía "Hola"**:
   - ✅ Recibe menú principal

2. **Usuario envía "1"** (Admin):
   - ✅ Recibe mensaje de derivación
   - ✅ Tabla `derivaciones` tiene registro con `area_destino='administracion'`
   - ✅ Tabla `tickets` tiene registro con `estado='pendiente'` y `ticket_id` en formato correcto
   - ✅ Tabla `conversaciones` actualizada con `proxy_activo=true`, `area_proxy='administracion'`

3. **Usuario envía "2"** (Alumnos):
   - ✅ Mismo proceso con `area_destino='alumnos'`

### Validaciones Implementadas

- ✅ Formato de `ticket_id`: YYYYMMDD-HHMMSS-XXXX
- ✅ Mapeo correcto de áreas: 'admin' → 'administracion'
- ✅ Rollback automático si falla alguna operación
- ✅ Logging completo de todas las operaciones
- ✅ Actualización de `proxy_activo` y `area_proxy` en conversación

## 🎯 Resultado Final

Después de la implementación, cuando un usuario selecciona un área por menú:

1. ✅ Se crea registro en `derivaciones`
2. ✅ Se crea registro en `tickets` con formato correcto
3. ✅ Se actualiza `conversaciones` con todos los campos necesarios
4. ✅ El CRM puede mostrar las derivaciones en las bandejas correspondientes
5. ✅ El sistema está listo para manejar múltiples derivaciones por conversación

## 📝 Notas Importantes

- **Áreas habilitadas actualmente**: 'administracion', 'alumnos'
- **Áreas futuras**: 'ventas', 'comunidad' (ya implementadas en código)
- **Formato de ticket_id**: Siempre único, formato YYYYMMDD-HHMMSS-XXXX
- **Rollback**: Automático si falla cualquier operación
- **Mapeo de áreas**: Automático entre formato interno y BD

## 🔧 Archivos Modificados

1. `src/core/PersistorRespuesta.ts` - Lógica completa de derivación
2. `src/core/EjecutorAccion.ts` - Uso de mapeador de áreas
3. `src/utils/ticketIdGenerator.ts` - Generador de ticket_id (NUEVO)
4. `src/utils/areaMapper.ts` - Mapeador de áreas (NUEVO)

---

**✅ Sistema de Derivaciones Implementado y Listo para Uso**


