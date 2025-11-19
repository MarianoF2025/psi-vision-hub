# ⚡ Implementación Urgente: Preparar para Miles de Mensajes

## 🚨 Acciones Inmediatas (Hoy)

### 1. Separar Router del CRM

**Crear estructura básica:**

```bash
# En el servidor
cd /opt
git clone <repo-router> psi-router
cd psi-router
npm init -y
npm install express @supabase/supabase-js bullmq ioredis
```

### 2. Configurar Redis

```bash
# Instalar Redis
sudo apt update
sudo apt install redis-server -y

# Configurar Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verificar
redis-cli ping
# Debe responder: PONG
```

### 3. Webhook Mínimo con Cola

**Crear `src/webhook.ts`:**

```typescript
import express from 'express';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const app = express();
app.use(express.json());

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const messageQueue = new Queue('messages', {
  connection: redis,
});

app.post('/webhook', async (req, res) => {
  try {
    // Validación mínima
    const body = req.body;
    if (!body || !body.messages) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Encolar inmediatamente
    for (const message of body.messages) {
      await messageQueue.add('process-message', {
        message,
        metadata: body.metadata,
        timestamp: new Date().toISOString(),
      });
    }

    // Responder 200 OK inmediatamente
    res.status(200).json({ success: true, queued: body.messages.length });
  } catch (error: any) {
    console.error('Error en webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3002, () => {
  console.log('Router PSI escuchando en puerto 3002');
});
```

### 4. Worker de Procesamiento

**Crear `src/worker.ts`:**

```typescript
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { RouterProcessor } from './processor';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const worker = new Worker(
  'messages',
  async (job) => {
    const { message, metadata } = job.data;
    const processor = new RouterProcessor();
    return await processor.processMessage(message);
  },
  {
    connection: redis,
    concurrency: 10, // 10 workers paralelos
    limiter: {
      max: 100, // 100 mensajes
      duration: 1000, // por segundo
    },
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Mensaje procesado: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Error procesando mensaje ${job?.id}:`, err);
});
```

### 5. PM2 Config

**Crear `ecosystem.config.js`:**

```javascript
module.exports = {
  apps: [
    {
      name: 'psi-router',
      script: 'dist/webhook.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
    },
    {
      name: 'psi-router-worker',
      script: 'dist/worker.js',
      instances: 5, // 5 workers
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

### 6. Nginx Config

**Crear `/etc/nginx/sites-available/router.psivisionhub.com`:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name router.psivisionhub.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name router.psivisionhub.com;

    ssl_certificate     /etc/letsencrypt/live/router.psivisionhub.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/router.psivisionhub.com/privkey.pem;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=100r/s;
    limit_req zone=webhook_limit burst=50 nodelay;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts para alta concurrencia
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }
}
```

---

## 📋 Checklist de Implementación

### Día 1: Infraestructura
- [ ] Instalar Redis
- [ ] Crear proyecto Router separado
- [ ] Configurar Nginx
- [ ] Configurar SSL

### Día 2: Código Básico
- [ ] Implementar webhook con cola
- [ ] Implementar worker básico
- [ ] Migrar RouterProcessor
- [ ] Probar en staging

### Día 3: Optimizaciones
- [ ] Agregar índices a Supabase
- [ ] Optimizar queries
- [ ] Configurar connection pooling
- [ ] Probar carga

### Día 4: Monitoreo
- [ ] Configurar PM2 monitoring
- [ ] Agregar logs estructurados
- [ ] Configurar alertas básicas
- [ ] Documentar

### Día 5: Deploy Producción
- [ ] Deploy Router separado
- [ ] Actualizar webhook de WhatsApp
- [ ] Monitorear métricas
- [ ] Ajustar según necesidad

---

## 🎯 Resultado Esperado

**Después de implementar:**

- ✅ Webhook responde en < 100ms
- ✅ Procesamiento paralelo (10+ mensajes/segundo)
- ✅ Sin bloqueos entre mensajes
- ✅ Retry automático en errores
- ✅ CRM no afectado por picos
- ✅ Escalable a miles de mensajes/día

**¿Empezamos con la implementación?**

