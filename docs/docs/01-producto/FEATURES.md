# Centralwap - Features

Lista completa de funcionalidades de la plataforma.

---

## 1. CRM WhatsApp

### 1.1 Bandeja de Entrada

| Feature | Descripción |
|---------|-------------|
| Multi-inbox | Múltiples líneas WhatsApp en una interfaz |
| Filtros por inbox | Ver conversaciones de una línea específica |
| Búsqueda | Por teléfono, nombre o contenido |
| Estados visuales | Badges de mensajes sin leer |
| Ordenamiento | Por último mensaje (más reciente primero) |

### 1.2 Chat

| Feature | Descripción |
|---------|-------------|
| Tiempo real | Mensajes aparecen instantáneamente |
| Multimedia | Envío/recepción de imágenes, audio, video, documentos |
| Reacciones | Emojis en mensajes |
| Citas | Responder a mensaje específico |
| Notas de voz | Grabación y envío desde el navegador |

### 1.3 Respuestas Rápidas

| Feature | Descripción |
|---------|-------------|
| Comandos | Escribir `/` para ver opciones |
| Variables | `{nombre}`, `{telefono}` se reemplazan automáticamente |
| Categorías | Organización por tipo de respuesta |
| Búsqueda | Filtrar respuestas mientras escribís |

### 1.4 Panel de Contacto

| Feature | Descripción |
|---------|-------------|
| Datos básicos | Nombre, teléfono, email |
| Estado del lead | Nuevo, Contactado, Interesado, Ganado, Perdido |
| Etiquetas | Tags personalizables |
| Notas | Comentarios internos |
| Historial | Timeline de interacciones |

### 1.5 Asignación

| Feature | Descripción |
|---------|-------------|
| Tomar conversación | Agente se asigna a sí mismo |
| Soltar conversación | Liberar para que tome otro |
| Transferir | Pasar a otro agente específico |
| Indicador visual | Badge con nombre del agente asignado |

---

## 2. Router (Menús IVR)

### 2.1 Menú Principal

| Feature | Descripción |
|---------|-------------|
| Menú interactivo | Lista de opciones tipo WhatsApp |
| Áreas configurables | Ventas, Soporte, Admin, etc. |
| Submenús | Navegación jerárquica |
| Opción "Volver" | Regresar al menú anterior |

### 2.2 Derivación Automática

| Feature | Descripción |
|---------|-------------|
| Por selección | Usuario elige área |
| Por horario | Fuera de horario → autorespuesta |
| Por keyword | Palabras clave detectan intención |
| Tickets | Cada derivación genera ticket único |

### 2.3 Ventanas de Tiempo

| Feature | Descripción |
|---------|-------------|
| Ventana 24h | WhatsApp Cloud API estándar |
| Ventana 72h | Meta Ads CTWA (gratis) |
| Indicador visual | Tiempo restante en el chat |
| Alerta expiración | Notificación cuando queda poco tiempo |

---

## 3. Automatizaciones (CTWA)

### 3.1 Click-to-WhatsApp

| Feature | Descripción |
|---------|-------------|
| Detección automática | Reconoce leads de Meta Ads |
| Menú por anuncio | Cada ad_id puede tener menú diferente |
| Tracking | CTR, conversión por anuncio |
| Ventana 72h | Aprovecha ventana gratuita de Meta |

### 3.2 Menús por Curso/Producto

| Feature | Descripción |
|---------|-------------|
| Configuración visual | CRUD desde el CRM |
| Opciones personalizables | Info, Derivar, Inscribir |
| Información dinámica | Precio, fechas, duración |
| Estadísticas | CTR por opción |

### 3.3 Autorespuestas

| Feature | Descripción |
|---------|-------------|
| Por horario | Fuera de horario laboral |
| Por línea | Diferentes mensajes por inbox |
| Por tipo | Primera vez vs. recurrente |

---

## 4. Remarketing

### 4.1 Segmentación

| Feature | Descripción |
|---------|-------------|
| Por estado | Leads en cierto estado |
| Por fecha | Última interacción hace X días |
| Por etiqueta | Tags específicos |
| Por curso | Interesados en producto específico |
| Exclusiones | Evitar contactar a ciertos grupos |

### 4.2 Campañas

| Feature | Descripción |
|---------|-------------|
| Templates | Mensajes aprobados por WhatsApp |
| Programación | Envío diferido |
| Límites | Control anti-baneo automático |
| Preview | Vista previa antes de enviar |

### 4.3 Tracking

| Feature | Descripción |
|---------|-------------|
| Enviados | Cantidad de mensajes despachados |
| Entregados | Confirmación de entrega |
| Leídos | Doble check azul |
| Respondidos | Generaron respuesta |
| Fallidos | Errores de envío |

---

## 5. Gestión de Grupos

### 5.1 Administración

| Feature | Descripción |
|---------|-------------|
| Lista de grupos | Ver todos los grupos de la línea |
| Metadata | Nombre, participantes, descripción |
| Categorización | Organizar por tipo |

### 5.2 Envío Masivo

| Feature | Descripción |
|---------|-------------|
| Selección múltiple | Elegir varios grupos |
| Límites automáticos | Respetar límites anti-baneo |
| Delay configurable | Espera entre envíos |
| Programación | Envío diferido |

### 5.3 Protección Anti-Baneo

| Feature | Descripción |
|---------|-------------|
| Límite por hora | Máximo 100-150 mensajes/hora |
| Límite por grupo | Máximo 20-30 mensajes/día por grupo |
| Delay automático | 3-5 segundos entre grupos |
| Alertas | Notificación al acercarse al límite |

---

## 6. Analytics

### 6.1 Dashboard

| Feature | Descripción |
|---------|-------------|
| Tiempo real | Datos actualizados al momento |
| Filtros de fecha | Hoy, semana, mes, personalizado |
| Por inbox | Métricas por línea |
| Por agente | Rendimiento individual |

### 6.2 Métricas Disponibles

| Métrica | Descripción |
|---------|-------------|
| Leads totales | Cantidad de conversaciones nuevas |
| TTF | Time to First Response |
| Tasa de conversión | % de leads que compran |
| Mensajes enviados/recibidos | Volumen de comunicación |
| CTR por curso | Efectividad de menús CTWA |

### 6.3 Exportación

| Feature | Descripción |
|---------|-------------|
| Excel | Múltiples hojas con datos |
| PDF | Reportes formateados |
| Filtros | Exportar solo lo filtrado |

---

## 7. Configuración

### 7.1 Usuarios

| Feature | Descripción |
|---------|-------------|
| Roles | Admin, Supervisor, Agente |
| Permisos | Por módulo y acción |
| Auditoría | Log de acciones |

### 7.2 Líneas WhatsApp

| Feature | Descripción |
|---------|-------------|
| Cloud API | Líneas oficiales Meta |
| Evolution API | Líneas adicionales |
| Webhooks | Configuración de endpoints |

### 7.3 Integraciones

| Feature | Descripción |
|---------|-------------|
| n8n | Workflows personalizados |
| Supabase | Base de datos y storage |
| Meta Ads | Tracking de campañas |
