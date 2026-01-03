# Guía de Instalación - Centralwap

**Versión:** 1.0  
**Última actualización:** 3 de Enero 2025

---

## 1. Requisitos Previos

### 1.1 Servidor

| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4 GB | 8+ GB |
| **Storage** | 40 GB SSD | 100+ GB SSD |
| **OS** | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |

### 1.2 Software

| Software | Versión |
|----------|---------|
| Node.js | 18.x o superior |
| npm | 9.x o superior |
| PM2 | Última versión |
| Git | 2.x |
| Docker | 20.x (para Evolution API) |

### 1.3 Cuentas y Accesos

| Servicio | Necesario para |
|----------|----------------|
| **Supabase** | Base de datos y storage |
| **Meta Business** | WhatsApp Cloud API |
| **Dominio** | SSL y acceso web |

---

## 2. Instalación del Servidor

### 2.1 Actualizar Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Instalar Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

### 2.3 Instalar PM2
```bash
sudo npm install -g pm2
pm2 --version
```

### 2.4 Instalar Git
```bash
sudo apt install -y git
git --version
```

### 2.5 Instalar Docker (para Evolution API)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
docker --version
```

---

## 3. Configurar Supabase

### 3.1 Crear Proyecto

1. Ir a [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Guardar:
   - Project URL
   - Anon Key
   - Service Role Key

### 3.2 Crear Tablas

Ejecutar en SQL Editor de Supabase:
```sql
-- Contactos
CREATE TABLE contactos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefono TEXT NOT NULL UNIQUE,
    nombre TEXT,
    email TEXT,
    origen TEXT DEFAULT 'whatsapp',
    tipo TEXT DEFAULT 'lead',
    estado TEXT DEFAULT 'activo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversaciones
CREATE TABLE conversaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contacto_id UUID REFERENCES contactos(id),
    telefono TEXT NOT NULL,
    nombre TEXT,
    linea_origen TEXT DEFAULT 'wsp4',
    area TEXT DEFAULT 'wsp4',
    estado TEXT DEFAULT 'abierta',
    ultimo_mensaje TEXT,
    ts_ultimo_mensaje TIMESTAMPTZ,
    asignado_a TEXT,
    asignado_nombre TEXT,
    desconectado_wsp4 BOOLEAN DEFAULT false,
    inbox_fijo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensajes
CREATE TABLE mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversacion_id UUID REFERENCES conversaciones(id),
    whatsapp_message_id TEXT,
    mensaje TEXT,
    tipo TEXT DEFAULT 'text',
    direccion TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    remitente_tipo TEXT,
    remitente_nombre TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_conversaciones_telefono ON conversaciones(telefono);
CREATE INDEX idx_mensajes_conversacion ON mensajes(conversacion_id);
CREATE INDEX idx_mensajes_timestamp ON mensajes(timestamp);
```

### 3.3 Configurar Storage

1. Ir a Storage en Supabase
2. Crear bucket `media`
3. Configurar como público
4. Crear carpetas: `audios`, `images`, `videos`, `documents`

### 3.4 Habilitar Realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE conversaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE mensajes;
```

---

## 4. Instalar Centralwap

### 4.1 Clonar Repositorio
```bash
cd /opt
git clone https://github.com/tu-usuario/centralwap.git psi-vision-hub
cd psi-vision-hub
```

### 4.2 Instalar CRM
```bash
cd /opt/psi-vision-hub
npm install
cp .env.example .env.local
# Editar .env.local con tus valores
npm run build
```

### 4.3 Instalar Router
```bash
cd /opt/psi-vision-hub/centralwap-router
npm install
cp .env.example .env
# Editar .env con tus valores
npm run build
```

### 4.4 Instalar Automations
```bash
cd /opt/psi-vision-hub/centralwap-automations
npm install
cp .env.example .env
# Editar .env con tus valores
npm run build
```

---

## 5. Configurar PM2

### 5.1 Iniciar Servicios
```bash
# CRM
cd /opt/psi-vision-hub
pm2 start npm --name "psi-vision-hub" -- start

# Router
cd /opt/psi-vision-hub/centralwap-router
pm2 start dist/index.js --name "psi-router"

# Automations
cd /opt/psi-vision-hub/centralwap-automations
pm2 start dist/index.js --name "psi-automations"
```

### 5.2 Guardar Configuración
```bash
pm2 save
pm2 startup
```

### 5.3 Verificar Estado
```bash
pm2 status
```

---

## 6. Configurar n8n

### 6.1 Instalar con Docker
```bash
docker run -d \
  --name n8n \
  --restart always \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

### 6.2 Configurar Webhooks

Crear workflows para:
- Ingesta de mensajes (por cada línea)
- Envío de mensajes (por cada línea)
- Derivaciones

### 6.3 Variables de n8n

Configurar en n8n:
- SUPABASE_URL
- SUPABASE_KEY
- WHATSAPP_TOKEN

---

## 7. Configurar WhatsApp

### 7.1 Cloud API (Meta)

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Crear App tipo Business
3. Agregar producto WhatsApp
4. Configurar número de teléfono
5. Obtener Access Token permanente
6. Configurar Webhook apuntando a n8n

### 7.2 Evolution API
```bash
docker run -d \
  --name evolution \
  --restart always \
  -p 8080:8080 \
  -v evolution_data:/evolution/instances \
  atendai/evolution-api
```

Configurar instancias para líneas secundarias.

---

## 8. Configurar Reverse Proxy

### 8.1 Instalar Traefik (Docker)
```yaml
# docker-compose.yml
version: '3'
services:
  traefik:
    image: traefik:v2.9
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.le.acme.httpchallenge=true"
      - "--certificatesresolvers.le.acme.email=tu@email.com"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./letsencrypt:/letsencrypt
```

### 8.2 Configurar Dominios

| Subdominio | Servicio | Puerto |
|------------|----------|--------|
| app.dominio.com | CRM | 3001 |
| webhookn8n.dominio.com | n8n | 5678 |
| evolution.dominio.com | Evolution | 8080 |

---

## 9. Verificación

### 9.1 Checklist

- [ ] PM2 muestra 3 servicios online
- [ ] CRM accesible en https://app.dominio.com
- [ ] n8n accesible en https://webhookn8n.dominio.com
- [ ] Supabase conecta correctamente
- [ ] Webhook de WhatsApp verificado
- [ ] Mensaje de prueba se recibe en CRM
- [ ] Mensaje de prueba se envía desde CRM

### 9.2 Health Checks
```bash
# CRM
curl http://localhost:3001

# Router
curl http://localhost:3002/health

# Automations
curl http://localhost:3003/health
```

---

## 10. Troubleshooting

### Puerto ocupado
```bash
lsof -i :3001
kill -9 <PID>
```

### PM2 no inicia al reiniciar
```bash
pm2 startup
pm2 save
```

### Error de conexión Supabase

Verificar que las keys en .env sean correctas y el proyecto esté activo.

### Webhook no recibe mensajes

1. Verificar URL del webhook en Meta
2. Verificar que n8n esté corriendo
3. Verificar logs de n8n
