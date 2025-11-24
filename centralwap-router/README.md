# Centralwap Router

Enterprise WhatsApp Router - Reescritura Router PSI con arquitectura de 4 nodos optimizados.

## Arquitectura

4 nodos optimizados con separación clara de responsabilidades:

1. **ProcesadorEntrada**: Normalización + contexto + UTM tracking
2. **EvaluadorEstado**: Lógica de routing + timeouts + anti-loop
3. **EjecutorAccion**: Generación de respuestas + preparación datos
4. **PersistorRespuesta**: Transacciones + WhatsApp + rollback

## Criterios de Éxito

✅ Procesar mensaje WhatsApp completo (entrada → estado → acción → persistencia)
✅ Latencia < 200ms P95
✅ Error handling con rollback automático
✅ Zero data loss durante transición

## Stack Tecnológico

- Backend: Node.js + TypeScript + Express
- Database: Supabase PostgreSQL
- WhatsApp: Evolution API (primario) + Meta Cloud API (backup)
- Validación: express-validator + tipos estrictos
- Logging: Winston con structured logging
- Error handling: Rollback automático + recovery

## Instalación

```bash
npm install
```

## Configuración

1. Copiar `.env.example` a `.env`
2. Configurar variables de entorno según tu setup
3. Asegurar que el schema de Supabase está ejecutado

## Desarrollo

```bash
npm run dev
```

## Producción

```bash
npm run build
npm start
```

## Testing

```bash
npm test
npm run test:integration
npm run test:load
```




