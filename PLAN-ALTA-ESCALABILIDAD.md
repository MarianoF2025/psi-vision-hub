# 🚀 Plan de Alta Escalabilidad: Miles de Mensajes Diarios

## 📊 Requisitos

**Volumen esperado:**
- Miles de mensajes diarios
- Picos de cientos de mensajes por minuto
- Necesidad de procesamiento en tiempo real
- Alta disponibilidad (99.9%+)

## 🎯 Arquitectura Recomendada: Router Separado

### Estructura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│              WhatsApp Cloud API                              │
│         (Webhooks con rate limiting)                        │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP POST
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Load Balancer (Nginx)                          │
│         - Rate limiting por IP                              │
│         - SSL termination                                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         Router PSI (Node.js/Express)                        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Webhook Handler (Fast)                              │  │
│  │  - Validación rápida                                  │  │
│  │  - Encolado inmediato                                 │  │
│  │  - Respuesta 200 OK inmediata                        │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │  Message Queue (Bull/BullMQ + Redis)                   │  │
│  │  - Cola de procesamiento                               │  │
│  │  - Workers concurrentes                                │  │
│  │  - Retry automático                                    │  │
│  │  - Priorización                                        │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │  Message Processor Workers                              │  │
│  │  - Procesamiento paralelo                               │  │
│  │  - Rate limiting por conversación                      │  │
│  │  - Manejo de errores                                    │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                          │ INSERT/UPDATE
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL)                          │
│  - Connection pooling (PgBouncer)                           │
│  - Índices optimizados                                      │
│  - Realtime subscriptions                                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ SELECT (tiempo real)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         CRM PSI Vision Hub (Next.js)                        │
│  - Lectura de conversaciones                                 │
│  - Interfaz de usuario                                       │
│  - Gestión de tickets                                         │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Optimizaciones Críticas Inmediatas

### 1. Separar Router del CRM

**Prioridad: CRÍTICA**

**Razones:**
- El Router necesita optimización específica para alta concurrencia
- El CRM no debe verse afectado por picos de mensajes
- Deployment independiente permite escalar según necesidad

**Acción:**
- Crear proyecto `psi-router` independiente
- Migrar código del Router
- Configurar deployment separado

---

### 2. Implementar Cola de Mensajes (BullMQ + Redis)

**Prioridad: CRÍTICA**

**Problema actual:**
- Procesamiento síncrono bloquea el webhook
- Si un mensaje tarda, bloquea los siguientes
- Sin retry automático
- Sin priorización

**Solución:**
```typescript
// Webhook recibe y encola inmediatamente
export async function POST(request: NextRequest) {
  const message = await parseWebhook(request);
  
  // Encolar inmediatamente (no procesar)
  await messageQueue.add('process-message', message, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // 1 hora
      count: 1000,
    },
  });
  
  // Responder 200 OK inmediatamente
  return NextResponse.json({ success: true }, { status: 200 });
}

// Worker procesa en background
messageQueue.process('process-message', async (job) => {
  const processor = new RouterProcessor();
  return await processor.processMessage(job.data);
});
```

**Beneficios:**
- Webhook responde en < 100ms
- Procesamiento paralelo (múltiples workers)
- Retry automático en caso de error
- No bloquea otros mensajes

---

### 3. Connection Pooling para Supabase

**Prioridad: ALTA**

**Problema actual:**
- Cada request crea nueva conexión
- Con miles de mensajes, se agotan las conexiones
- Lento y puede causar timeouts

**Solución:**
```typescript
// Usar PgBouncer o connection pooling
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

**O mejor aún:**
- Configurar PgBouncer en Supabase
- Usar connection string con pooling
- Limitar conexiones por worker

---

### 4. Rate Limiting por Conversación

**Prioridad: ALTA**

**Problema actual:**
- Anti-loop global puede bloquear conversaciones legítimas
- Sin diferenciación entre spam y uso normal

**Solución:**
```typescript
// Rate limiting por conversación usando Redis
async function checkRateLimit(conversationId: string): Promise<boolean> {
  const key = `rate-limit:${conversationId}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 30); // 30 segundos
  }
  
  return count <= 5; // Máximo 5 mensajes en 30 segundos
}
```

**Beneficios:**
- Previene spam por conversación
- No bloquea otras conversaciones
- Más granular y justo

---

### 5. Optimización de Queries a Supabase

**Prioridad: ALTA**

**Problemas actuales:**
- Múltiples queries secuenciales
- Sin índices optimizados
- Queries innecesarias

**Optimizaciones:**
```typescript
// ANTES: Múltiples queries
const contact = await supabase.from('contactos').select().eq('telefono', phone).single();
const conversation = await supabase.from('conversaciones').select().eq('contacto_id', contact.id).single();

// DESPUÉS: Una query con join
const { data } = await supabase
  .from('conversaciones')
  .select(`
    *,
    contactos (*)
  `)
  .eq('contactos.telefono', phone)
  .single();
```

**Índices necesarios:**
```sql
-- Índices críticos para performance
CREATE INDEX idx_conversaciones_telefono ON conversaciones(telefono);
CREATE INDEX idx_conversaciones_contacto_id ON conversaciones(contacto_id);
CREATE INDEX idx_conversaciones_ts_ultimo_mensaje ON conversaciones(ts_ultimo_mensaje DESC);
CREATE INDEX idx_mensajes_conversacion_id ON mensajes(conversacion_id);
CREATE INDEX idx_mensajes_timestamp ON mensajes(timestamp DESC);
CREATE INDEX idx_mensajes_remitente_tipo ON mensajes(remitente_tipo);
CREATE INDEX idx_contactos_telefono ON contactos(telefono);
```

---

### 6. Caching con Redis

**Prioridad: MEDIA**

**Cachear:**
- Estado del menú por conversación
- Configuración de menús
- Webhooks de áreas (no cambian frecuentemente)

```typescript
// Cachear estado del menú
async function getMenuStateCached(conversationId: string): Promise<MenuState | null> {
  const cacheKey = `menu-state:${conversationId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const state = await getMenuState(conversationId);
  await redis.setex(cacheKey, 300, JSON.stringify(state)); // 5 minutos
  return state;
}
```

---

### 7. Batch Processing para Mensajes

**Prioridad: MEDIA**

**Problema:**
- Cada mensaje hace múltiples writes a Supabase
- Ineficiente para alta concurrencia

**Solución:**
```typescript
// Agrupar mensajes por conversación y procesar en batch
const messageBatches = groupByConversation(messages);

for (const [conversationId, messages] of messageBatches) {
  await supabase.from('mensajes').insert(messages); // Un solo INSERT
}
```

---

### 8. Monitoreo y Alertas

**Prioridad: ALTA**

**Métricas críticas:**
- Latencia del webhook (p95, p99)
- Tiempo de procesamiento de mensajes
- Tasa de errores
- Longitud de la cola
- Uso de CPU/Memoria
- Conexiones a Supabase

**Herramientas:**
- PM2 monitoring
- Prometheus + Grafana
- Sentry para errores
- Logs estructurados (JSON)

---

## 📋 Plan de Implementación

### Fase 1: Preparación (Semana 1)

1. **Separar Router del CRM**
   - [ ] Crear repositorio `psi-router`
   - [ ] Migrar código del Router
   - [ ] Configurar deployment independiente
   - [ ] Probar en staging

2. **Configurar Redis**
   - [ ] Instalar Redis en servidor
   - [ ] Configurar persistencia
   - [ ] Configurar backups

### Fase 2: Cola de Mensajes (Semana 2)

3. **Implementar BullMQ**
   - [ ] Instalar BullMQ
   - [ ] Configurar cola de mensajes
   - [ ] Implementar workers
   - [ ] Configurar retry y backoff

4. **Optimizar Webhook**
   - [ ] Webhook solo encola (no procesa)
   - [ ] Respuesta 200 OK inmediata
   - [ ] Validación mínima

### Fase 3: Optimizaciones (Semana 3)

5. **Connection Pooling**
   - [ ] Configurar PgBouncer
   - [ ] Optimizar queries
   - [ ] Agregar índices

6. **Rate Limiting**
   - [ ] Implementar rate limiting por conversación
   - [ ] Configurar límites apropiados
   - [ ] Monitorear bloqueos

### Fase 4: Monitoreo (Semana 4)

7. **Monitoreo y Alertas**
   - [ ] Configurar métricas
   - [ ] Dashboard de Grafana
   - [ ] Alertas críticas
   - [ ] Logs estructurados

---

## 🔢 Capacidad Esperada

### Con Optimizaciones

**Router Separado + Cola:**
- **Webhook:** 1000+ requests/segundo
- **Procesamiento:** 100+ mensajes/segundo (con 10 workers)
- **Latencia p95:** < 2 segundos
- **Disponibilidad:** 99.9%+

### Sin Optimizaciones (Actual)

- **Webhook:** ~10 requests/segundo
- **Procesamiento:** ~1 mensaje/segundo (secuencial)
- **Latencia p95:** 5-10 segundos
- **Disponibilidad:** ~95% (con picos)

---

## 💰 Costos Estimados

### Infraestructura Adicional

- **Redis:** $10-20/mes (VPS pequeño) o $0 (mismo servidor)
- **Servidor adicional:** $20-40/mes (si separamos Router)
- **Monitoreo:** $0-50/mes (Grafana Cloud free tier o self-hosted)

**Total:** $30-110/mes adicionales

### Beneficios

- **Escalabilidad:** 10-100x más capacidad
- **Resiliencia:** Aislamiento de fallos
- **Mantenibilidad:** Código más simple
- **Disponibilidad:** 99.9%+ vs 95%

---

## ⚠️ Riesgos de NO Implementar

1. **Saturación del sistema**
   - Webhook no responde a tiempo
   - WhatsApp marca webhook como "no disponible"
   - Pérdida de mensajes

2. **Degradación del CRM**
   - Picos de mensajes afectan interfaz
   - Agentes no pueden trabajar
   - Pérdida de productividad

3. **Pérdida de datos**
   - Sin retry, mensajes se pierden
   - Sin cola, no hay buffer
   - Sin monitoreo, no se detectan problemas

---

## 🎯 Próximos Pasos Inmediatos

1. **Crear proyecto Router separado**
2. **Configurar Redis**
3. **Implementar cola básica (BullMQ)**
4. **Optimizar webhook (solo encolar)**
5. **Agregar workers de procesamiento**

**¿Quieres que empecemos con la implementación?**

