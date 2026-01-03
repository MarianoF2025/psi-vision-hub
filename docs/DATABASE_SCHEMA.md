# 🗄️ DATABASE SCHEMA - PSI VISION HUB

**Versión:** 1.0  
**Fecha:** Enero 2026  
**Base de datos:** Supabase (PostgreSQL)  
**URL:** `https://rbtczzjlvnymylkvcwdv.supabase.co`

---

## ÍNDICE

1. [Tablas Core](#1-tablas-core)
2. [Tablas Router](#2-tablas-router)
3. [Tablas Automatizaciones (CTWA)](#3-tablas-automatizaciones-ctwa)
4. [Tablas Remarketing](#4-tablas-remarketing)
5. [Tablas Grupos](#5-tablas-grupos)
6. [Tablas Auxiliares](#6-tablas-auxiliares)
7. [Storage (Buckets)](#7-storage-buckets)
8. [Triggers y Funciones](#8-triggers-y-funciones)
9. [Índices Recomendados](#9-índices-recomendados)
10. [Convenciones](#10-convenciones)

---

## 1. TABLAS CORE

### 1.1 contactos
```sql
CREATE TABLE contactos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefono TEXT NOT NULL UNIQUE,
    nombre TEXT,
    email TEXT,
    origen TEXT DEFAULT 'whatsapp',
    tipo TEXT DEFAULT 'lead',
    estado TEXT DEFAULT 'activo',
    estado_lead TEXT,
    curso_interes TEXT,
    pais TEXT,
    pais_codigo TEXT,
    notas TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contactos_telefono ON contactos(telefono);
CREATE INDEX idx_contactos_estado_lead ON contactos(estado_lead);
```

**Valores estado_lead:** nuevo, contactado, interesado, negociando, ganado, perdido, no_responde

---

### 1.2 conversaciones
```sql
CREATE TABLE conversaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contacto_id UUID REFERENCES contactos(id),
    telefono TEXT NOT NULL,
    nombre TEXT,
    canal TEXT DEFAULT 'whatsapp',
    linea_origen TEXT NOT NULL DEFAULT 'wsp4',
    area TEXT DEFAULT 'wsp4',
    estado TEXT NOT NULL DEFAULT 'abierta',
    prioridad TEXT DEFAULT 'normal',
    router_estado TEXT,
    menu_actual TEXT,
    ultimo_mensaje TEXT,
    ts_ultimo_mensaje TIMESTAMPTZ,
    sin_leer INTEGER DEFAULT 0,
    ventana_24h_activa BOOLEAN DEFAULT false,
    ventana_24h_fin TIMESTAMPTZ,
    ventana_72h_activa BOOLEAN DEFAULT false,
    ventana_72h_fin TIMESTAMPTZ,
    desconectado_wsp4 BOOLEAN DEFAULT false,
    inbox_fijo TEXT,
    asignado_a TEXT,
    asignado_nombre TEXT,
    asignado_ts TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversaciones_telefono ON conversaciones(telefono);
CREATE INDEX idx_conversaciones_linea ON conversaciones(linea_origen);
CREATE INDEX idx_conversaciones_area ON conversaciones(area);
CREATE INDEX idx_conversaciones_estado ON conversaciones(estado);
```

**Valores linea_origen:** wsp4, ventas, administracion, alumnos, comunidad

---

### 1.3 mensajes
```sql
CREATE TABLE mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversacion_id UUID REFERENCES conversaciones(id) ON DELETE CASCADE,
    mensaje TEXT,
    tipo TEXT DEFAULT 'text',
    direccion TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    media_filename TEXT,
    duracion INTEGER,
    remitente_tipo TEXT,
    remitente_nombre TEXT,
    remitente_id TEXT,
    whatsapp_message_id TEXT,
    whatsapp_context_id TEXT,
    enviado BOOLEAN DEFAULT false,
    entregado BOOLEAN DEFAULT false,
    leido BOOLEAN DEFAULT false,
    fallido BOOLEAN DEFAULT false,
    error_mensaje TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mensajes_conversacion ON mensajes(conversacion_id);
CREATE INDEX idx_mensajes_timestamp ON mensajes(timestamp DESC);
CREATE INDEX idx_mensajes_wamid ON mensajes(whatsapp_message_id);
```

**Valores direccion:** entrante, saliente (NUNCA usar inbound/outbound)

---

## 2. TABLAS ROUTER

### 2.1 tickets
```sql
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT NOT NULL UNIQUE,
    conversacion_id UUID REFERENCES conversaciones(id),
    telefono TEXT NOT NULL,
    area TEXT NOT NULL,
    estado TEXT DEFAULT 'abierto',
    prioridad TEXT DEFAULT 'normal',
    subetiqueta TEXT,
    motivo TEXT,
    resuelto_por TEXT,
    resuelto_ts TIMESTAMPTZ,
    resolucion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Formato ticket_id:** TKT-YYYYMMDD-XXXXX

---

### 2.2 derivaciones
```sql
CREATE TABLE derivaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversacion_id UUID REFERENCES conversaciones(id),
    ticket_id TEXT REFERENCES tickets(ticket_id),
    area_origen TEXT NOT NULL,
    area_destino TEXT NOT NULL,
    motivo TEXT,
    mensaje_contexto TEXT,
    status TEXT DEFAULT 'completada',
    ts_derivacion TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.3 mensaje_reacciones
```sql
CREATE TABLE mensaje_reacciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mensaje_id UUID REFERENCES mensajes(id) ON DELETE CASCADE,
    whatsapp_message_id TEXT,
    emoji TEXT NOT NULL,
    reactor_telefono TEXT,
    reactor_nombre TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mensaje_id, reactor_telefono)
);
```

---

### 2.4 audit_log
```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidad TEXT NOT NULL,
    entidad_id UUID,
    accion TEXT NOT NULL,
    detalles JSONB,
    usuario_id TEXT,
    usuario_email TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. TABLAS AUTOMATIZACIONES (CTWA)

### 3.1 config_cursos_ctwa
```sql
CREATE TABLE config_cursos_ctwa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo_formacion TEXT DEFAULT 'curso',
    categoria TEXT,
    mensaje_saludo TEXT,
    mensaje_bienvenida TEXT,
    menu_body TEXT,
    info_precio TEXT,
    info_fechas TEXT,
    info_duracion TEXT,
    info_certificacion TEXT,
    info_salida_laboral TEXT,
    info_modalidad TEXT,
    info_contenido TEXT,
    info_requisitos TEXT,
    activo BOOLEAN DEFAULT true,
    inscripciones_abiertas BOOLEAN DEFAULT true,
    disponible_entrada_directa BOOLEAN DEFAULT true,
    total_leads INTEGER DEFAULT 0,
    ctr_promedio DECIMAL(5,2) DEFAULT 0,
    leads_este_mes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.2 menu_opciones
```sql
CREATE TABLE menu_opciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id UUID REFERENCES config_cursos_ctwa(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL DEFAULT 0,
    emoji TEXT,
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    campo_info TEXT,
    mostrar_menu_despues BOOLEAN DEFAULT true,
    mensaje_derivacion TEXT,
    activo BOOLEAN DEFAULT true,
    veces_elegida INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Valores tipo:** info, derivar, inscribir

---

### 3.3 config_ctwa_anuncios
```sql
CREATE TABLE config_ctwa_anuncios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id TEXT NOT NULL UNIQUE,
    curso_id UUID REFERENCES config_cursos_ctwa(id) ON DELETE CASCADE,
    nombre TEXT,
    activo BOOLEAN DEFAULT true,
    ejecuciones INTEGER DEFAULT 0,
    ultima_ejecucion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.4 menu_sesiones
```sql
CREATE TABLE menu_sesiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefono TEXT NOT NULL UNIQUE,
    curso_id UUID REFERENCES config_cursos_ctwa(id),
    estado TEXT DEFAULT 'activo',
    menu_actual TEXT,
    interacciones INTEGER DEFAULT 0,
    ultima_actividad TIMESTAMPTZ DEFAULT NOW(),
    ad_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.5 menu_interacciones
```sql
CREATE TABLE menu_interacciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefono TEXT NOT NULL,
    curso_id UUID REFERENCES config_cursos_ctwa(id),
    opcion_id UUID REFERENCES menu_opciones(id),
    tipo_opcion TEXT,
    campo_consultado TEXT,
    derivado BOOLEAN DEFAULT false,
    ad_id TEXT,
    sesion_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. TABLAS REMARKETING

### 4.1 remarketing_templates
```sql
CREATE TABLE remarketing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    categoria TEXT,
    contenido TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    template_name TEXT,
    idioma TEXT DEFAULT 'es',
    estado TEXT DEFAULT 'activo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.2 remarketing_campanas
```sql
CREATE TABLE remarketing_campanas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    curso_codigo TEXT,
    template_id UUID REFERENCES remarketing_templates(id),
    audiencia_filtros JSONB NOT NULL,
    audiencia_base INTEGER DEFAULT 0,
    audiencia_excluidos INTEGER DEFAULT 0,
    audiencia_elegibles INTEGER DEFAULT 0,
    tipo_envio TEXT DEFAULT 'manual',
    programada_para TIMESTAMPTZ,
    estado TEXT DEFAULT 'borrador',
    total_enviados INTEGER DEFAULT 0,
    total_entregados INTEGER DEFAULT 0,
    total_leidos INTEGER DEFAULT 0,
    total_respondidos INTEGER DEFAULT 0,
    total_fallidos INTEGER DEFAULT 0,
    iniciada_at TIMESTAMPTZ,
    finalizada_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Valores estado:** borrador, programada, enviando, pausada, finalizada

---

### 4.3 remarketing_envios
```sql
CREATE TABLE remarketing_envios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campana_id UUID REFERENCES remarketing_campanas(id) ON DELETE CASCADE,
    contacto_id UUID REFERENCES contactos(id),
    telefono TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente',
    whatsapp_message_id TEXT,
    error_mensaje TEXT,
    enviado_at TIMESTAMPTZ,
    entregado_at TIMESTAMPTZ,
    leido_at TIMESTAMPTZ,
    respondido_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. TABLAS GRUPOS

### 5.1 grupos_whatsapp
```sql
CREATE TABLE grupos_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jid TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    participantes INTEGER DEFAULT 0,
    descripcion TEXT,
    categoria TEXT DEFAULT 'otro',
    puede_enviar BOOLEAN DEFAULT false,
    foto_url TEXT,
    sincronizado_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Valores categoria:** curso, especializacion, comunidad, otro

---

### 5.2 envios_programados
```sql
CREATE TABLE envios_programados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    grupos_ids UUID[] NOT NULL,
    total_grupos INTEGER DEFAULT 0,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    hora_inicio TIME NOT NULL,
    distribucion_horas INTEGER DEFAULT 24,
    delay_minutos DECIMAL(5,2),
    estado TEXT DEFAULT 'programado',
    grupos_enviados INTEGER DEFAULT 0,
    grupos_fallidos INTEGER DEFAULT 0,
    grupo_actual_idx INTEGER DEFAULT 0,
    iniciado_at TIMESTAMPTZ,
    completado_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Valores estado:** programado, en_curso, completado, pausado, cancelado

---

## 6. TABLAS AUXILIARES

### 6.1 etiquetas
```sql
CREATE TABLE etiquetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3182ce',
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 conversacion_etiquetas
```sql
CREATE TABLE conversacion_etiquetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversacion_id UUID REFERENCES conversaciones(id) ON DELETE CASCADE,
    etiqueta_id UUID REFERENCES etiquetas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversacion_id, etiqueta_id)
);
```

### 6.3 respuestas_rapidas
```sql
CREATE TABLE respuestas_rapidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comando TEXT NOT NULL UNIQUE,
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    categoria TEXT,
    activa BOOLEAN DEFAULT true,
    uso_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. STORAGE (BUCKETS)

**Bucket:** media  
**URL Base:** https://rbtczzjlvnymylkvcwdv.supabase.co/storage/v1/object/public/media/

| Carpeta | Contenido |
|---------|-----------|
| audios/ | .ogg, .opus, .mp3 |
| images/ | .jpg, .png, .webp |
| videos/ | .mp4, .mov |
| documents/ | .pdf, .docx, .xlsx |
| stickers/ | .webp |

---

## 8. TRIGGERS Y FUNCIONES

### 8.1 Actualizar updated_at
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 8.2 Generar ticket_id
```sql
CREATE OR REPLACE FUNCTION generar_ticket_id()
RETURNS TEXT AS $$
DECLARE
    fecha TEXT;
    secuencia INTEGER;
BEGIN
    fecha := TO_CHAR(NOW(), 'YYYYMMDD');
    SELECT COALESCE(MAX(CAST(SPLIT_PART(ticket_id, '-', 3) AS INTEGER)), 0) + 1
    INTO secuencia FROM tickets WHERE ticket_id LIKE 'TKT-' || fecha || '-%';
    RETURN 'TKT-' || fecha || '-' || LPAD(secuencia::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
```

---

## 9. ÍNDICES RECOMENDADOS
```sql
CREATE INDEX idx_conv_inbox_estado ON conversaciones(linea_origen, estado);
CREATE INDEX idx_conv_area_sin_leer ON conversaciones(area, sin_leer) WHERE sin_leer > 0;
CREATE INDEX idx_msg_conv_timestamp ON mensajes(conversacion_id, timestamp DESC);
CREATE INDEX idx_interacciones_derivado ON menu_interacciones(curso_id, derivado);
```

---

## 10. CONVENCIONES

| Tipo | Convención |
|------|------------|
| Teléfono | E.164 con + (+5491130643668) |
| Timestamps | TIMESTAMPTZ (ISO 8601) |
| UUIDs | gen_random_uuid() |
| Tablas | snake_case plural |
| Campos | snake_case |
| Direccion | 'entrante' / 'saliente' |

---

**Documento generado:** Enero 2026
