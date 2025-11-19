# 📁 Estructura del Router Separado

## 🎯 Objetivo

Crear proyecto `psi-router` independiente del CRM, optimizado para procesar mensajes de WhatsApp.

---

## 📂 Estructura de Directorios

```
psi-router/
├── src/
│   ├── index.ts              # Punto de entrada (Express server)
│   ├── webhook.ts            # Handler de webhook
│   ├── processor.ts           # RouterProcessor (migrado)
│   ├── menus.ts              # Definición de menús
│   ├── types.ts              # Tipos TypeScript
│   ├── media.ts              # Procesamiento de media
│   └── meta.ts               # Metadata y tracking
├── package.json
├── tsconfig.json
├── .env.example
├── ecosystem.config.js       # PM2 config
└── README.md
```

---

## 📦 package.json

```json
{
  "name": "psi-router",
  "version": "1.0.0",
  "description": "Router PSI - Procesador de mensajes WhatsApp",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@supabase/supabase-js": "^2.39.3",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.24",
    "tsx": "^4.7.0",
    "typescript": "^5.4.5"
  }
}
```

---

## 🔧 src/index.ts

```typescript
import express from 'express';
import dotenv from 'dotenv';
import { webhookHandler } from './webhook';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook de WhatsApp
app.post('/webhook', webhookHandler);

// Manejo de errores
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Router PSI escuchando en puerto ${PORT}`);
});
```

---

## 📥 src/webhook.ts

```typescript
import { Request, Response } from 'express';
import { RouterProcessor } from './processor';
import { normalizeWhatsAppMessage } from './utils';

export async function webhookHandler(req: Request, res: Response) {
  try {
    const body = req.body;
    
    // Detectar formato del webhook
    let messagesToProcess: any[] = [];
    let metadata: any = {};

    // Formato 1: WhatsApp Cloud API estándar
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};
          metadata = value.metadata || {};
          messagesToProcess.push(...(value.messages || []));
        }
      }
    }
    // Formato 2: Directo desde n8n
    else if (body.messages && Array.isArray(body.messages)) {
      metadata = body.metadata || {};
      messagesToProcess = body.messages;
    }
    // Formato 3: Mensaje simplificado
    else if (body.from && (body.message || body.text)) {
      messagesToProcess = [body];
      metadata = body.metadata || {};
    }

    if (messagesToProcess.length === 0) {
      return res.status(200).json({ success: true, message: 'No messages to process' });
    }

    // Procesar mensajes en paralelo
    const processor = new RouterProcessor();
    const results = await Promise.allSettled(
      messagesToProcess
        .filter(msg => !msg.status && msg.type !== 'status')
        .map(async (message) => {
          const normalized = normalizeWhatsAppMessage(message, metadata);
          if (!normalized.from) {
            throw new Error('Mensaje sin campo "from"');
          }
          return await processor.processMessage(normalized);
        })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Webhook procesado: ${successful} exitosos, ${failed} fallidos`);

    res.status(200).json({
      success: true,
      processed: successful,
      failed,
    });
  } catch (error: any) {
    console.error('Error en webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## 🔄 Migración del Código

### Archivos a Migrar

1. **lib/router/processor.ts** → **src/processor.ts**
   - Copiar tal cual
   - Ajustar imports si es necesario

2. **lib/router/menus.ts** → **src/menus.ts**
   - Copiar tal cual

3. **lib/router/types.ts** → **src/types.ts**
   - Copiar tal cual

4. **lib/router/media.ts** → **src/media.ts**
   - Copiar tal cual

5. **lib/router/meta.ts** → **src/meta.ts**
   - Copiar tal cual

### Ajustes Necesarios

- Cambiar imports de `@/lib/...` a rutas relativas
- Ajustar configuración de Supabase (usar variables de entorno)
- Remover dependencias de Next.js (si las hay)

---

## 🔐 Variables de Entorno

**.env.example:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# WhatsApp Cloud API
CLOUD_API_TOKEN=xxx
CLOUD_API_PHONE_NUMBER_ID=xxx
CLOUD_API_BASE_URL=https://graph.facebook.com/v18.0
WHATSAPP_VERIFY_TOKEN=xxx

# n8n Webhooks (opcional)
N8N_WEBHOOK_ENVIOS_ROUTER_CRM=xxx
N8N_WEBHOOK_INGESTA_ROUTER_WSP4=xxx
# ... otros webhooks

# Server
PORT=3002
NODE_ENV=production
```

---

## 🚀 PM2 Config

**ecosystem.config.js:**

```javascript
module.exports = {
  apps: [
    {
      name: 'psi-router',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: '/var/log/psi-router-error.log',
      out_file: '/var/log/psi-router-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};
```

---

## 🌐 Nginx Config

**/etc/nginx/sites-available/router.psivisionhub.com:**

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
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    access_log /var/log/nginx/router-psivisionhub-access.log;
    error_log /var/log/nginx/router-psivisionhub-error.log;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```

---

## 📋 Checklist de Migración

- [ ] Crear proyecto `psi-router`
- [ ] Copiar archivos del Router
- [ ] Ajustar imports y dependencias
- [ ] Configurar package.json
- [ ] Crear .env.example
- [ ] Configurar PM2
- [ ] Configurar Nginx
- [ ] Obtener SSL certificate
- [ ] Probar localmente
- [ ] Deploy a producción
- [ ] Actualizar webhook de WhatsApp
- [ ] Monitorear logs

---

## 🎯 Próximo Paso

**¿Empezamos creando la estructura del proyecto Router separado?**

