# Sistema de Proxy para Derivaciones - Implementación Completa

## ✅ Implementación del Proxy

Ahora **SÍ** se usa el proxy para implementar las derivaciones. El sistema funciona de la siguiente manera:

## 🔄 Cómo Funciona el Proxy

### 1. Activación del Proxy (al derivar)

Cuando un usuario selecciona un área del menú (ej: "1" para Admin):

1. Se crea registro en `derivaciones`
2. Se crea registro en `tickets`
3. Se actualiza `conversaciones` con:
   - `proxy_activo: true` ✅
   - `area_proxy: 'administracion'` ✅
   - `estado: 'derivado'`

### 2. Redirección Automática con Proxy

Una vez activado el proxy, **todos los mensajes entrantes** son redirigidos automáticamente:

1. **EvaluadorEstado** verifica si `proxy_activo === true`
2. Si está activo, **redirige automáticamente** al `area_proxy`
3. **NO muestra menús** ni procesa comandos (excepto MENU)
4. **NO envía respuestas automáticas** - permite que la conversación continúe en el área destino

### 3. Desactivación del Proxy

El proxy se desactiva cuando:
- Usuario escribe **"MENU"** → vuelve al menú principal y desactiva proxy
- Cambio manual desde el CRM

## 📋 Flujo Completo con Proxy

### Escenario: Usuario deriva a Administración

**Paso 1: Usuario elige "1" (Admin)**
```
Usuario: "1"
→ EvaluadorEstado detecta opción → accion: 'derivar', area_destino: 'admin'
→ EjecutorAccion prepara derivación
→ PersistorRespuesta.procesarDerivacion():
   ✅ Crea registro en derivaciones
   ✅ Crea registro en tickets
   ✅ Actualiza conversaciones:
      - proxy_activo: true
      - area_proxy: 'administracion'
      - estado: 'derivado'
→ Usuario recibe: "✅ Te hemos derivado a Administración..."
```

**Paso 2: Usuario envía mensaje normal (proxy activo)**
```
Usuario: "Hola, necesito ayuda"
→ EvaluadorEstado.evaluarEstado():
   1. Verifica proxy_activo === true ✅
   2. Verifica area_proxy === 'administracion' ✅
   3. Retorna: accion: 'continuar_conversacion'
      - NO muestra menú
      - NO envía respuesta automática
      - Mensaje se redirige al área proxy
→ EjecutorAccion.continuarConversacion():
   - tipo: 'silencioso'
   - NO se envía respuesta
→ Mensaje queda en bandeja de Administración para agente humano
```

**Paso 3: Usuario escribe "MENU" (desactiva proxy)**
```
Usuario: "MENU"
→ EvaluadorEstado detecta comando MENU
→ Permite comando (incluso con proxy activo)
→ EjecutorAccion.generarMenu():
   - datos_persistencia.desactivar_proxy: true
→ PersistorRespuesta.actualizarEstadoConversacion():
   - proxy_activo: false
   - area_proxy: null
→ Usuario recibe menú principal
```

## 🎯 Ventajas del Proxy

1. **Redirección Automática**: Todos los mensajes van directamente al área destino
2. **Sin Interrupciones**: No se muestran menús automáticamente
3. **Conversación Continua**: El agente humano puede responder directamente
4. **Fácil Desactivación**: Comando MENU desactiva el proxy
5. **Control Granular**: Se puede activar/desactivar desde CRM

## 🔧 Implementación Técnica

### Campos en ContextoConversacion

```typescript
interface ContextoConversacion {
  proxy_activo?: boolean;  // Si el proxy está activo
  area_proxy?: string;     // Área a la que se redirigen mensajes
}
```

### Lógica en EvaluadorEstado

```typescript
// 3. VERIFICAR PROXY ACTIVO (PRIORIDAD ALTA)
if (contexto.proxy_activo && contexto.area_proxy) {
  // Permitir comando MENU para desactivar proxy
  if (mensaje === 'MENU') {
    return { accion: 'mostrar_menu', desactivar_proxy: true };
  }
  
  // Proxy activo: redirigir automáticamente
  return {
    accion: 'continuar_conversacion',
    razon: 'proxy_activo_redireccion_automatica'
  };
}
```

### Actualización en PersistorRespuesta

```typescript
// Al crear derivación
{
  proxy_activo: true,
  area_proxy: areaDestinoBD,  // 'administracion', 'alumnos', etc.
}

// Al desactivar proxy (comando MENU)
{
  proxy_activo: false,
  area_proxy: null,
}
```

## ✅ Verificación

### Test: Proxy Activo

1. Usuario envía "Hola" → recibe menú
2. Usuario envía "1" → se deriva a Admin, proxy se activa
3. Usuario envía "Necesito ayuda" → **NO recibe respuesta automática**
4. Mensaje queda en bandeja de Administración para agente humano
5. Usuario envía "MENU" → recibe menú, proxy se desactiva

### Test: Desactivación

1. Proxy activo con `area_proxy: 'administracion'`
2. Usuario envía "MENU"
3. `conversaciones` actualizada con `proxy_activo: false`, `area_proxy: null`
4. Usuario puede elegir nueva opción del menú

## 📝 Resumen

**✅ SÍ, ahora el proxy está implementado y funcionando:**

- ✅ Se activa automáticamente al derivar
- ✅ Redirige todos los mensajes al área destino
- ✅ No muestra menús cuando está activo
- ✅ Permite conversación continua con agente humano
- ✅ Se desactiva con comando MENU

El proxy es la **forma correcta** de manejar derivaciones, asegurando que los mensajes vayan directamente al área correcta sin interrupciones del sistema automatizado.


