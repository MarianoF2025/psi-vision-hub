# Fix: Error de timestamp con valor 'principal'

## Problema

El Router PSI está intentando asignar el string `'principal'` a un campo timestamp en Supabase, causando el error:

```
invalid input syntax for type timestamp with time zone: "principal"
```

## Análisis

El problema ocurre cuando se actualiza una conversación con `submenu_actual: 'principal'` o `router_estado: 'menu_principal'`. Aunque estos campos NO son timestamps, el error sugiere que:

1. Hay un campo en la base de datos que es timestamp y tiene un nombre similar
2. O hay un mapeo incorrecto en Supabase
3. O el spread operator está pasando campos adicionales no filtrados

## Solución Implementada

Se mejoró el método `updateConversacion()` en `DatabaseService.ts` para:

1. **Validar campos timestamp explícitamente:**
   - `ventana_24h_inicio` y `ventana_72h_inicio` deben ser strings ISO válidos
   - Se valida que sean fechas válidas antes de asignar

2. **Logging detallado:**
   - Se registra qué campos se están actualizando
   - Se registran los valores antes del update
   - En caso de error, se registra información completa para debugging

3. **Filtrado estricto:**
   - Solo se permiten campos de la lista `validFields`
   - Se valida el tipo de cada campo antes de asignar

## Cambios Realizados

### DatabaseService.ts

```typescript
// Campos que son timestamps
const timestampFields = ['ventana_24h_inicio', 'ventana_72h_inicio'];

// Validación de timestamps
if (timestampFields.includes(key)) {
  if (typeof value === 'string' && value !== '') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      Logger.warn(`Campo timestamp inválido ignorado: ${key} = ${value}`);
      continue; // Saltar este campo
    }
    filteredUpdates[key] = value;
  }
}

// Logging antes del update
Logger.info('Actualizando conversación', { 
  id, 
  camposActualizados: Object.keys(filteredUpdates),
  valores: filteredUpdates
});
```

## Próximos Pasos

1. **Monitorear logs** para identificar exactamente qué campo está causando el problema
2. **Verificar schema de Supabase** para ver si hay campos timestamp con nombres similares
3. **Si el problema persiste**, revisar si hay campos adicionales en la base de datos que no están en el tipo TypeScript

## Comandos para Debugging

```bash
# Ver logs del router
pm2 logs router-psi --lines 100 | grep -i "actualizando\|error\|timestamp\|principal"

# Ver errores específicos
pm2 logs router-psi --err --lines 50
```

## Nota

El logging detallado ayudará a identificar exactamente qué campo y valor está causando el error cuando ocurra nuevamente.

