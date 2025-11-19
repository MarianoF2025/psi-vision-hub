# 🚀 Plan Simplificado: Miles de Mensajes por DÍA

## 📊 Análisis de Carga

**Volumen esperado:**
- Miles de mensajes por DÍA (no por hora)
- Ejemplo: 5,000-10,000 mensajes/día
- Promedio: ~3-7 mensajes/minuto
- Picos: ~20-30 mensajes/minuto

**Conclusión:** El sistema actual puede manejar esto con optimizaciones, sin necesidad de cola inmediata.

---

## 🎯 Plan Simplificado (Sin Cola Inmediata)

### Fase 1: Separar Router del CRM ⚡ CRÍTICO

**Razones:**
- Aislar problemas de estabilidad
- Optimización independiente
- Deployment independiente
- El CRM no se ve afectado por picos

**Acción:**
1. Crear proyecto `psi-router` independiente
2. Migrar código del Router
3. Configurar deployment separado (puerto 3002)
4. Configurar Nginx para `router.psivisionhub.com`

**Tiempo estimado:** 2-3 días

---

### Fase 2: Optimizaciones de Código ⚡ ALTA PRIORIDAD

#### 2.1 Optimizar Queries a Supabase

**Problema actual:**
- Múltiples queries secuenciales
- Sin índices optimizados
- Queries innecesarias

**Solución:**
```typescript
// ANTES: 3 queries secuenciales
const contact = await supabase.from('contactos').select().eq('telefono', phone).single();
const conversation = await supabase.from('conversaciones').select().eq('contacto_id', contact.id).single();
const messages = await supabase.from('mensajes').select().eq('conversacion_id', conversation.id).order('timestamp', { ascending: false }).limit(10);

// DESPUÉS: 1 query con join
const { data } = await supabase
  .from('conversaciones')
  .select(`
    *,
    contactos (*),
    mensajes (
      id,
      mensaje,
      remitente_tipo,
      timestamp
    )
  `)
  .eq('contactos.telefono', phone)
  .order('mensajes.timestamp', { ascending: false })
  .limit(1)
  .single();
```

#### 2.2 Agregar Índices Críticos

```sql
-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversaciones_telefono 
  ON conversaciones(telefono);

CREATE INDEX IF NOT EXISTS idx_conversaciones_contacto_id 
  ON conversaciones(contacto_id);

CREATE INDEX IF NOT EXISTS idx_conversaciones_ts_ultimo_mensaje 
  ON conversaciones(ts_ultimo_mensaje DESC);

CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion_id 
  ON mensajes(conversacion_id);

CREATE INDEX IF NOT EXISTS idx_mensajes_timestamp 
  ON mensajes(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_mensajes_remitente_tipo 
  ON mensajes(remitente_tipo);

CREATE INDEX IF NOT EXISTS idx_contactos_telefono 
  ON contactos(telefono);
```

#### 2.3 Connection Pooling

**Configurar Supabase con pooling:**
```typescript
// Usar connection string con pooling
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-connection-pool': 'true',
    },
  },
});
```

#### 2.4 Optimizar Webhook Handler

**Problema actual:**
- Procesa mensajes secuencialmente en el webhook
- Bloquea respuesta hasta procesar todo

**Solución:**
```typescript
// Procesar en paralelo (no secuencial)
const promises = messagesToProcess.map(async (message) => {
  try {
    const normalized = normalizeWhatsAppMessage(message, metadata);
    return await processor.processMessage(normalized);
  } catch (error) {
    console.error('Error procesando mensaje:', error);
    return { success: false };
  }
});

await Promise.allSettled(promises);
```

---

### Fase 3: Preparar Estructura de Cola (Opcional/Futuro)

**Dejar código preparado pero comentado:**

```typescript
// src/webhook.ts
import express from 'express';

const app = express();
app.use(express.json());

// TODO: Descomentar cuando se necesite cola
// import { Queue } from 'bullmq';
// import Redis from 'ioredis';
// const redis = new Redis({ host: 'localhost', port: 6379 });
// const messageQueue = new Queue('messages', { connection: redis });

app.post('/webhook', async (req, res) => {
  try {
    const { messages, metadata } = req.body;
    
    // MODO ACTUAL: Procesamiento directo (suficiente para miles/día)
    const processor = new RouterProcessor();
    const results = await Promise.allSettled(
      messages.map(msg => processor.processMessage(normalizeMessage(msg, metadata)))
    );
    
    // MODO FUTURO: Con cola (descomentar cuando se necesite)
    // for (const message of messages) {
    //   await messageQueue.add('process-message', { message, metadata });
    // }
    // return res.json({ success: true, queued: messages.length });
    
    res.json({ success: true, processed: results.length });
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Ventajas:**
- Código listo para activar cuando se necesite
- No requiere infraestructura adicional ahora
- Fácil migración cuando crezca el volumen

---

### Fase 4: Monitoreo Básico

**Agregar métricas simples:**
```typescript
// Logging estructurado
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'message_processed',
  conversationId: result.conversationId,
  duration: Date.now() - startTime,
  success: result.success,
}));
```

**PM2 Monitoring:**
```bash
pm2 monit
```

---

## 📋 Checklist de Implementación

### Semana 1: Separación y Optimización

- [ ] **Día 1-2: Separar Router**
  - [ ] Crear proyecto `psi-router`
  - [ ] Migrar código del Router
  - [ ] Configurar package.json
  - [ ] Probar localmente

- [ ] **Día 3: Deployment**
  - [ ] Configurar Nginx para Router
  - [ ] Configurar SSL
  - [ ] Deploy con PM2
  - [ ] Actualizar webhook de WhatsApp

- [ ] **Día 4: Optimizaciones**
  - [ ] Agregar índices a Supabase
  - [ ] Optimizar queries (joins)
  - [ ] Procesamiento paralelo en webhook
  - [ ] Connection pooling

- [ ] **Día 5: Testing y Monitoreo**
  - [ ] Probar con carga real
  - [ ] Monitorear performance
  - [ ] Ajustar según necesidad
  - [ ] Documentar

---

## 🎯 Resultado Esperado

**Con estas optimizaciones:**

- ✅ **Capacidad:** 5,000-10,000 mensajes/día sin problemas
- ✅ **Latencia:** < 2 segundos por mensaje
- ✅ **Disponibilidad:** 99%+ (Router separado del CRM)
- ✅ **Escalabilidad:** Preparado para crecer (código de cola listo)

**Cuando necesites más:**
- Descomentar código de cola
- Instalar Redis
- Activar workers
- Escalar a 100,000+ mensajes/día

---

## 💰 Costos

**Sin cola (actual):**
- Servidor existente
- Sin infraestructura adicional
- **Costo: $0 adicional**

**Con cola (futuro, si se necesita):**
- Redis: $10-20/mes (o mismo servidor)
- **Costo: $10-20/mes adicional**

---

## ⚠️ Cuándo Activar la Cola

**Activar cola cuando:**
- Volumen > 10,000 mensajes/día
- Picos > 50 mensajes/minuto
- Latencia > 5 segundos
- Errores por timeout

**Hasta entonces:**
- Sistema optimizado es suficiente
- Código de cola listo para activar
- Sin infraestructura adicional

---

## 🚀 Próximos Pasos

1. **Separar Router del CRM** (prioridad #1)
2. **Optimizar queries y agregar índices**
3. **Dejar código de cola preparado**
4. **Monitorear y ajustar**

**¿Empezamos con la separación del Router?**

