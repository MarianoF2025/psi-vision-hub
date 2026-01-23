# 📚 DOCUMENTACIÓN COMPLETA CENTRALWAP CRM
## Para Asistente Virtual PSI

**Versión:** 3.0  
**Fecha:** 11 de Enero 2026  
**Propósito:** Contexto para chatbot asistente de PSI Asociación

---

# ÍNDICE

1. [Visión General](#1-visión-general)
2. [Módulo Chat Principal](#2-módulo-chat-principal)
3. [Módulo Contactos](#3-módulo-contactos)
4. [Módulo Etiquetas](#4-módulo-etiquetas)
5. [Módulo Respuestas Rápidas](#5-módulo-respuestas-rápidas)
6. [Módulo Automatizaciones CTWA](#6-módulo-automatizaciones-ctwa)
7. [Módulo Remarketing](#7-módulo-remarketing)
8. [Módulo Grupos WhatsApp](#8-módulo-grupos-whatsapp)
9. [Módulo Estadísticas](#9-módulo-estadísticas)
10. [Integración PSI API](#10-integración-psi-api)

---

# 1. VISIÓN GENERAL

## ¿Qué es Centralwap?

Centralwap es el **CRM de WhatsApp** de PSI Asociación. Funciona como una central telefónica digital que:

- Recibe mensajes de múltiples líneas WhatsApp
- Deriva conversaciones a áreas específicas mediante menús interactivos
- Permite a los agentes responder desde una interfaz unificada
- Gestiona leads, automatizaciones y campañas de remarketing

## Principio Fundamental

> **"Por donde entra, sale"**

Un mensaje que entra por WSP4 siempre sale por WSP4, independientemente del área que lo atienda.

## Líneas WhatsApp

| Línea | Función | API |
|-------|---------|-----|
| **WSP4** | Router principal (web, orgánico) | WhatsApp Cloud API |
| **Ventas** | Leads de Meta Ads (CTWA) | WhatsApp Cloud API |
| **Administración** | Área administrativa | Evolution API |
| **Alumnos** | Soporte académico | Evolution API |
| **Comunidad** | Eventos LC | Evolution API |

## Acceso al CRM

**URL:** https://psivisionhub.com/crm

**Menú lateral (sidebar):**
- 💬 Chat → /crm
- 👥 Contactos → /crm/contactos
- 🏷️ Etiquetas → /crm/etiquetas
- ⚡ Respuestas → /crm/respuestas
- 📊 Estadísticas → /crm/estadisticas
- 🤖 Automatizaciones → /crm/automatizaciones
- 📢 Remarketing → /crm/remarketing
- 👥 Grupos → /crm/grupos
- ⚙️ Ajustes → /crm/ajustes

---

# 2. MÓDULO CHAT PRINCIPAL

**Ruta:** /crm

## Descripción

Interfaz principal para visualizar y responder conversaciones de WhatsApp.

## Estructura de Pantalla
```
┌──────────┬──────────────────┬────────────────────┬─────────────────┐
│ SIDEBAR  │ CONVERSACIONES   │    ÁREA CHAT       │ INFO CONTACTO   │
│  72px    │     320px        │      flex-1        │    320px        │
│ (iconos) │                  │                    │   (toggle)      │
└──────────┴──────────────────┴────────────────────┴─────────────────┘
```

## Panel Conversaciones

**Filtros disponibles:**
- Por inbox: WSP4, Ventas, Admin, Alumnos, Comunidad
- Búsqueda por teléfono o nombre

**Cada conversación muestra:**
- Nombre del contacto
- Último mensaje (preview)
- Hora del último mensaje
- Badge de mensajes sin leer
- Badge de asignación (👤 + nombre agente)

## Panel Chat

**Header:**
- Nombre y teléfono del contacto
- Botón "TOMAR" (asignar conversación)
- Botón "SOLTAR" (liberar conversación)
- Toggle panel info contacto

**Área de mensajes:**
- Burbujas entrantes (izquierda, gris)
- Burbujas salientes (derecha, verde/indigo)
- Soporte multimedia: imagen, audio, video, documento
- Citas/respuestas a mensajes
- Reacciones (emojis)

**Input de mensaje:**
- Campo de texto con Enter para enviar
- Botón adjuntar (imagen, audio, video, documento)
- Grabación de audio (micrófono)
- Respuestas rápidas (/comando)

## Panel Info Contacto (toggle)

- Datos del contacto (nombre, teléfono, email)
- Edición inline de campos
- Historial de etiquetas
- Estado del lead
- Notas

## Respuestas Rápidas en Chat

Al escribir / en el input, se muestra lista de respuestas rápidas disponibles. Seleccionar una inserta el contenido automáticamente.

---

# 3. MÓDULO CONTACTOS

**Ruta:** /crm/contactos

## Descripción

CRUD de contactos con búsqueda, filtros y edición.

## Funcionalidades

- Listar todos los contactos
- Buscar por teléfono, nombre o email
- Filtrar por tipo (lead, alumno, etc.)
- Filtrar por estado
- Crear nuevo contacto
- Editar contacto existente
- Ver historial de conversaciones

## Campos de Contacto

| Campo | Tipo | Descripción |
|-------|------|-------------|
| telefono | TEXT | Número E.164 (único) |
| nombre | TEXT | Nombre completo |
| email | TEXT | Email opcional |
| origen | TEXT | 'whatsapp', 'web', 'psi_api' |
| tipo | TEXT | 'lead', 'alumno', etc. |
| estado | TEXT | 'activo', 'inactivo' |
| estado_lead | TEXT | 'nuevo', 'contactado', 'ganado', 'perdido' |
| resultado | TEXT | Resultado de gestión |
| notas | TEXT | Notas libres |

---

# 4. MÓDULO ETIQUETAS

**Ruta:** /crm/etiquetas

## Descripción

CRUD de etiquetas para clasificar conversaciones y contactos.

## Funcionalidades

- Listar etiquetas ordenadas alfabéticamente
- Crear nueva etiqueta (nombre + color)
- Editar etiqueta existente
- Eliminar etiqueta
- Ver cantidad de usos por etiqueta

## Campos de Etiqueta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| nombre | TEXT | Nombre de la etiqueta |
| color | TEXT | Color hex (#RRGGBB) |

## Colores Disponibles

Paleta predefinida de 12 colores para seleccionar.

---

# 5. MÓDULO RESPUESTAS RÁPIDAS

**Ruta:** /crm/respuestas

## Descripción

Gestión de respuestas predefinidas para insertar rápidamente en el chat usando comandos /atajo.

## Funcionalidades

- Listar respuestas ordenadas por atajo
- Crear nueva respuesta (modal)
- Editar respuesta existente (modal)
- Eliminar respuesta con confirmación
- Copiar contenido al clipboard

## Campos por Respuesta

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| atajo | TEXT | ✅ | Comando (ej: /saludo) - se agrega "/" automáticamente |
| titulo | TEXT | ❌ | Título descriptivo |
| contenido | TEXT | ✅ | Texto a insertar (soporta multilinea) |
| categoria | TEXT | ❌ | Categoría para agrupar |

## Uso en Chat

1. En el input del chat, escribir /
2. Se despliega lista de atajos disponibles
3. Seleccionar uno inserta el contenido automáticamente
4. También se puede escribir el atajo completo (ej: /saludo) y presionar espacio

## Ejemplos de Respuestas

| Atajo | Contenido |
|-------|-----------|
| /saludo | ¡Hola! 👋 Gracias por contactarnos. ¿En qué puedo ayudarte? |
| /precio | El valor del curso es de $XXX con posibilidad de financiación... |
| /horarios | Las clases son los martes y jueves de 19 a 21hs... |
| /link | 👉 https://psi.com.ar/inscripcion |

---

# 6. MÓDULO AUTOMATIZACIONES CTWA

**Ruta:** /crm/automatizaciones

## Descripción

Gestión de menús interactivos CTWA (Click-to-WhatsApp) para leads que llegan desde Meta Ads o entrada directa.

## Dashboard Principal

### Stats Cards (7 métricas)

| Stat | Descripción |
|------|-------------|
| **Leads** | Total de leads en el período |
| **CTWA (Ads)** | Leads desde Meta Ads |
| **Directos** | Leads entrada directa |
| **Engagement** | CTR promedio (%) |
| **Interacciones** | Total interacciones con menús |
| **Cursos** | Cantidad de cursos activos |
| **Anuncios** | Cantidad de anuncios activos |

### Filtros de Período

8 opciones: Hoy, Ayer, Esta semana, Este mes, Mes anterior, Últimos 3 meses, Todo el tiempo, Personalizado (fecha desde/hasta)

### Grid de Cursos

Cards con: código, nombre, leads del período, CTR, toggle activo, botones configurar/stats

## Detalle de Curso

**Ruta:** /crm/automatizaciones/cursos/[id]

### Tab 1: Información

**Campos básicos:**
- Código (ej: AT, TEA, HIP)
- Nombre completo
- Descripción

**3 Mensajes Separados:**
1. **mensaje_saludo** - Se envía primero, antes del menú
2. **mensaje_bienvenida** - Descripción del curso, después del saludo
3. **mensaje_menu_body** - Texto corto dentro del menú interactivo

**Tipo de Formación:**
- Curso
- Especialización

**7 Categorías:**
- Acompañamiento Terapéutico
- Coaching y Crecimiento Personal
- Crianza
- Discapacidad y Neurodiversidad
- Educación
- Gerontología
- Psicología y Salud Mental

**Toggles:**
- Inscripciones abiertas
- Disponible en entrada directa

**8 Campos de Información:**
- Precio, Fechas, Duración, Certificación
- Salida Laboral, Modalidad, Contenido, Requisitos

### Tab 2: Menú

CRUD de opciones del menú interactivo.

**Campos por opción:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| orden | NUMBER | Posición en el menú |
| emoji | TEXT | Emoji decorativo |
| titulo | TEXT | Texto de la opción |
| tipo | SELECT | 'info', 'derivar', 'inscribir' |
| campo_info | SELECT | Campo a mostrar (solo si tipo='info') |
| mostrar_menu_despues | CHECKBOX | Re-mostrar menú después |
| mensaje_derivacion | TEXT | Mensaje al derivar |
| activo | TOGGLE | Visible en menú |

**Tipos de opción:**
- **info**: Envía información del campo seleccionado
- **derivar**: Conecta con vendedora humana
- **inscribir**: Inicia proceso de inscripción

### Tab 3: Anuncios

Vinculación de anuncios de Meta Ads con el curso.

**Para vincular anuncio:**
1. Click "Vincular Anuncio"
2. Ingresar ad_id de Meta Ads
3. Nombre descriptivo (opcional)
4. Guardar

### Tab 4: Estadísticas

**Métricas:**
- Leads del período
- Tasa de engagement
- Tasa de inscripción
- Tasa de abandono

**Rendimiento del Menú:**
- Tabla con cada opción: veces elegida, CTR

**Rendimiento por Anuncio:**
- Tabla con cada anuncio: leads, engagement, inscripciones

**Exportación:**
- Excel (.xlsx) con 3 hojas
- PDF con tablas

---

# 7. MÓDULO REMARKETING

**Ruta:** /crm/remarketing

## Descripción

Campañas de mensajes masivos para recuperar leads y contactar alumnos.

## Dashboard Principal

### 2 Tabs

| Tab | Descripción | Campo tipo en BD |
|-----|-------------|------------------|
| **Leads** | Leads que consultaron pero no se inscribieron | 'leads' |
| **Alumnos** | Alumnos de PSI (egresados, activos, bajas) | 'alumnos' |

### Estados de Campaña

| Estado | Color | Descripción |
|--------|-------|-------------|
| borrador | Gris | Sin enviar aún |
| programada | Azul | Esperando fecha |
| enviando | Amarillo | En proceso |
| pausada | Naranja | Detenida |
| finalizada | Verde | Completada |

### Métricas por Campaña

- Enviados
- Entregados (+ %)
- Leídos (+ %)
- Respuestas (+ %)
- Fallidos

### Acciones

- Editar (solo estados: borrador, pausada, programada)
- Duplicar (crea copia en borrador)
- Eliminar (solo estados: borrador, pausada, programada)

## Wizard Nueva Campaña Leads

**Ruta:** /crm/remarketing/nueva

### 5 Segmentos de Audiencia

| Segmento | Descripción |
|----------|-------------|
| **Abandonó menú** | Consultó el curso pero no pidió hablar con vendedora |
| **Derivado sin cierre** | Habló con vendedora pero no se inscribió |
| **No responde** | Intentamos contactar pero no contesta |
| **Perdido recuperable** | Dijo que no hace más de 30 días |
| **Multi-interés** | Consultó 2 o más cursos (indeciso) |

### Filtros

- **Curso objetivo**: Select de cursos activos
- **Excluir ya inscriptos**: Checkbox (default: ✅)
- **Días antigüedad**: Solo contactos de los últimos X días

### Flujo

1. Completar información básica (nombre, descripción)
2. Seleccionar curso objetivo (opcional para Multi-interés)
3. Elegir segmentos (multi-selección)
4. Aplicar filtros adicionales
5. Click "Calcular audiencia"
6. Ver preview: Audiencia base, Excluidos, Elegibles
7. Seleccionar template
8. Elegir tipo envío: Manual (ahora) o Programado (fecha+hora)
9. Guardar borrador o Crear y enviar

## Wizard Nueva Campaña Alumnos

**Ruta:** /crm/remarketing/alumnos/nueva

### 3 Estados de Alumno

| Estado | Descripción |
|--------|-------------|
| **Egresados** | Completaron el curso (finalizado) |
| **Cursando** | Actualmente cursando (activo) |
| **Bajas** | Abandonaron o se dieron de baja |

### Filtros

- **Curso**: Select de cursos con inscripciones
- **Fecha inscripción**: Desde / Hasta
- **Cuotas pagadas**: Mínimo % / Máximo %
- **Solo morosos**: Pagaron algo pero no completaron

### Flujo

Similar al wizard de Leads pero con datos de API PSI (inscripciones_psi).

### Nota Importante

El wizard de Alumnos **crea contactos automáticamente** si no existen en la tabla contactos, usando datos de inscripciones_psi.

---

# 8. MÓDULO GRUPOS WHATSAPP

**Ruta:** /crm/grupos

## Descripción

Gestión de grupos WhatsApp, envíos masivos, secuencias programadas y creación de grupos para cursos.

## Dashboard con 5 Tabs

### Tab 1: Grupos

Lista de grupos sincronizados desde Evolution API.

**Información por grupo:**
- Nombre
- Descripción
- Categoría
- Estado (puede_enviar)
- Cantidad de participantes
- Último envío

**Acciones:**
- Botón "Sincronizar" → Actualiza lista desde Evolution API

**Categorías:**
- todos (filtro)
- curso
- especializacion
- comunidad
- otro

### Tab 2: Nuevo Envío (Envío Único)

Mensaje masivo a grupos seleccionados con sistema anti-baneo.

**Campos:**
- Nombre (opcional)
- Mensaje (requerido)
- Media URL (opcional)

**Selección de grupos:**
- Checkboxes múltiples
- Filtros: búsqueda + categoría

**Sistema Anti-Baneo:**
- Distribución configurable en X horas (default: 48h)
- Cálculo automático: "≈ 1 mensaje cada X minutos"
- Evita bloqueos de WhatsApp

**Programación:**
- Enviar ahora
- Programar para fecha/hora específica

### Tab 3: Secuencias

Mensajes recurrentes programados por grupo.

**Estructura:**
- Vista expandible por grupo
- Cada grupo puede tener múltiples secuencias
- Cada secuencia puede tener múltiples mensajes

**Tipos de programación:**

| Tipo | Descripción |
|------|-------------|
| **Único** | Fecha específica + hora |
| **Recurrente semanal** | Días de semana + hora + fecha fin opcional |
| **Recurrente mensual** | Día del mes + hora + fecha fin opcional |

**Acciones:**
- Crear secuencia
- Editar secuencia/mensajes
- Activar/pausar
- Eliminar (cascada mensajes)

### Tab 4: Historial

Lista de envíos programados (últimos 50).

**Estados:**
- programado
- en_curso
- pausado
- completado
- fallido

**Información:**
- Nombre
- Preview mensaje
- Total grupos / Enviados / Fallidos
- Inicio programado
- Próximo envío

**Acciones:**
- Pausar / Reanudar
- Editar (nombre/mensaje)
- Eliminar

### Tab 5: Crear Grupo

**Wizard de 3 pasos para crear grupo y enviar invitaciones:**

#### Paso 1: Configurar

- Nombre del grupo (requerido)
- Descripción (opcional)
- Selección de curso desde inscripciones_psi
- Filtros: estado alumno, fecha desde/hasta

#### Paso 2: Seleccionar Inscriptos

- Lista de inscripciones filtradas
- Selección múltiple con checkboxes
- Muestra: nombre, teléfono, email, estado, fecha

**Mensaje de invitación con variables:**
- {nombre} - Nombre del alumno
- {link} - Link de invitación al grupo

#### Paso 3: Crear e Invitar

- **Modo simulación** (activado por default)
- Si no simulación: Crea grupo vía Evolution API
- Genera link de invitación
- Envío masivo de invitaciones
- Progreso en tiempo real
- Logs de simulación/ejecución

---

# 9. MÓDULO ESTADÍSTICAS

**Ruta:** /crm/estadisticas

## Descripción

Métricas de rendimiento del sistema y agentes.

## Control de Acceso

Solo usuarios autorizados pueden ver estadísticas. Emails permitidos configurados en constante EMAILS_ADMIN.

## 3 Tabs

### Tab 1: WSP4 Router

**4 Cards principales:**

| Card | Métrica | Detalle |
|------|---------|---------|
| Mensajes Hoy | Cantidad | + mensajes esta semana |
| Conv. Activas | Cantidad | + conversaciones nuevas hoy |
| Derivaciones Hoy | Cantidad | A otras áreas |
| Autorespuestas | Cantidad | Enviadas hoy |

**Gráfico:** Derivaciones por Área (barras horizontales)

### Tab 2: Ventas API

**4 Cards principales:**

| Card | Métrica | Detalle |
|------|---------|---------|
| Leads Hoy | Cantidad | De Meta Ads |
| Leads Semana | Cantidad | Últimos 7 días |
| Leads Mes | Cantidad | Este mes |
| Conversiones | Cantidad | Total ganados |

**Sección:** Top 5 Anuncios (ranking con leads por anuncio)

### Tab 3: Por Agente

**Filtros de período:**
- Hoy
- Semana
- Mes
- Todo
- Personalizado (fecha desde/hasta)

**Métricas por agente:**

| Métrica | Descripción |
|---------|-------------|
| Mensajes | Total enviados en el período |
| Atendidas | Conversaciones únicas |
| Asignadas | Conversaciones actualmente asignadas |
| Promedio | Mensajes por conversación |
| T. Respuesta | Tiempo promedio de primera respuesta |
| Conversiones | Leads ganados |

**Variación:** Comparación % con período anterior

**Actividad por línea:** Badges con colores por cada línea

## Exportación

Botón "Exportar" con menú desplegable:

| Formato | Contenido |
|---------|-----------|
| **Excel (.xlsx)** | 3 hojas: WSP4 Router, Ventas API, Agentes |
| **CSV (.csv)** | Todas las métricas en un archivo |
| **PDF (.pdf)** | 2 páginas con tablas formateadas |

---

# 10. INTEGRACIÓN PSI API

## Descripción

Sincronización automática de inscripciones desde el sistema de gestión de PSI.

## Tabla: inscripciones_psi

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| telefono | TEXT | Teléfono del alumno |
| nombre | TEXT | Nombre completo |
| email | TEXT | Email |
| curso_codigo | TEXT | Código del curso |
| curso_nombre | TEXT | Nombre del curso |
| curso_id | UUID | Referencia al curso |
| fecha_inscripcion | DATE | Fecha de inscripción |
| estado | TEXT | 'activo', 'finalizado', 'pendiente', 'baja' |
| cuotas_total | INTEGER | Total de cuotas del curso |
| cuotas_pagadas | INTEGER | Cuotas pagadas |

## Sincronización

- **Frecuencia:** Diaria a las 3:00 AM
- **Webhook n8n:** Procesa respuesta de API PSI
- **Acción:** Upsert en tabla inscripciones_psi

## Uso en Módulos

- **Remarketing Alumnos:** Segmentación por estado, curso, cuotas
- **Grupos WhatsApp:** Creación de grupos por curso con invitaciones automáticas
- **Estadísticas:** Métricas de conversión

---

# PREGUNTAS FRECUENTES

## General

**¿Cómo accedo al CRM?**
Ingresá a https://psivisionhub.com/crm con tu usuario y contraseña.

**¿Qué significan los colores de las burbujas en el chat?**
- Gris (izquierda): Mensajes del contacto
- Verde/Indigo (derecha): Mensajes enviados por agentes

**¿Cómo asigno una conversación?**
Click en "TOMAR" en el header del chat. Para liberar, click en "SOLTAR".

## Respuestas Rápidas

**¿Cómo creo una respuesta rápida?**
1. Ir a /crm/respuestas
2. Click "Nueva Respuesta"
3. Completar atajo (ej: /saludo), contenido, y opcionalmente título y categoría
4. Guardar

**¿Cómo uso una respuesta rápida en el chat?**
Escribí / en el input del chat y seleccioná de la lista, o escribí el atajo completo (ej: /saludo) y presioná espacio.

## Automatizaciones

**¿Cómo creo un nuevo curso?**
1. Ir a /crm/automatizaciones
2. Click "Nuevo Curso"
3. Completar los 4 tabs: Información, Menú, Anuncios, Estadísticas
4. Guardar

**¿Cómo vinculo un anuncio de Meta Ads?**
1. Ir al detalle del curso
2. Tab "Anuncios"
3. Click "Vincular Anuncio"
4. Ingresar el ad_id de Meta Ads

## Remarketing

**¿Cuál es la diferencia entre campañas de Leads y Alumnos?**
- **Leads:** Para personas que consultaron por cursos pero no se inscribieron. Datos de Centralwap.
- **Alumnos:** Para alumnos actuales o pasados de PSI. Datos de API PSI.

**¿Qué significa "Multi-interés"?**
Contactos que consultaron por 2 o más cursos diferentes. Son indecisos que pueden necesitar orientación.

**¿Qué significa "Solo morosos"?**
Alumnos que pagaron al menos una cuota pero no completaron todas. Útil para campañas de regularización.

## Grupos

**¿Puedo crear grupos desde el CRM?**
Sí. En /crm/grupos, tab "Crear Grupo", hay un wizard de 3 pasos que permite crear un grupo de WhatsApp y enviar invitaciones automáticas a los inscriptos de un curso.

**¿Qué es el modo simulación?**
Un modo de prueba que muestra los logs de lo que haría el sistema sin ejecutar acciones reales. Útil para verificar la audiencia antes de enviar.

**¿Cómo funciona el sistema anti-baneo?**
Distribuye los envíos a lo largo de X horas (configurable) para evitar que WhatsApp detecte comportamiento de spam y bloquee el número.

## Estadísticas

**¿Por qué no veo las estadísticas?**
Solo usuarios autorizados tienen acceso. Contactá al administrador si necesitás permisos.

**¿Cómo exporto las estadísticas?**
Click en "Exportar" y elegí el formato: Excel, CSV o PDF.

---

# GLOSARIO

| Término | Definición |
|---------|------------|
| **CTWA** | Click-to-WhatsApp. Anuncio de Meta que abre WhatsApp directamente. |
| **Lead** | Persona que consultó por un curso pero aún no se inscribió. |
| **Derivación** | Transferencia de conversación a otra área. |
| **Menú interactivo** | Lista de opciones que WhatsApp muestra al usuario para elegir. |
| **Template** | Mensaje predefinido aprobado por Meta para envíos masivos. |
| **Engagement** | Tasa de interacción (clics en opciones del menú). |
| **TTF** | Time To First Response. Tiempo hasta primera respuesta. |
| **Evolution API** | API alternativa para WhatsApp sin límites de ventana. |
| **Cloud API** | API oficial de Meta para WhatsApp Business. |

---

**Documento generado:** 11 de Enero 2026  
**Basado en:** Análisis de código fuente de producción  
**Para uso de:** Chatbot asistente PSI Asociación

---

# 11. MENSAJES PROGRAMADOS

## Descripción

Funcionalidad estilo ManyChat que permite a los agentes programar mensajes para enviar automáticamente en una fecha y hora específica.

## Requisito Previo: Desconectar del Router

**⚠️ IMPORTANTE:** Para programar un mensaje, la conversación DEBE estar desconectada del Router WSP4.

### ¿Por qué?

Los mensajes programados se envían por las líneas Evolution API (Ventas, Administración, Alumnos, Comunidad), no por WSP4. Si la conversación sigue conectada al Router, el mensaje no podrá enviarse.

### Cómo desconectar

1. Abrir la conversación en el CRM
2. En el header, hacer clic en el botón "Desconectar del Router"
3. Seleccionar la línea por la que se enviará (Ventas, Admin, Alumnos, Comunidad)
4. Confirmar

## Cómo Programar un Mensaje

1. **Desconectar la conversación del Router** (ver arriba)
2. Escribir el mensaje en el input del chat
3. Hacer clic en el botón **🕐 (reloj)** junto al clip de adjuntos
4. En el modal:
   - Verificar la línea de envío (debe coincidir con la línea donde se desconectó)
   - Seleccionar fecha y hora
   - Revisar el preview del mensaje
5. Hacer clic en "Programar mensaje"

## Líneas Disponibles

| Línea | Instancia Evolution | Uso |
|-------|---------------------|-----|
| **Ventas** | PSI Ventas | Leads y seguimiento comercial |
| **Administración** | EME Automations | Pagos, facturas, certificados |
| **Alumnos** | PSI Alumnos | Soporte académico |
| **Comunidad** | PSI Comunidad | Eventos y comunidad LC |

## ¿Qué pasa cuando se envía?

1. El sistema (pg_cron) revisa cada minuto si hay mensajes pendientes
2. Cuando llega la hora programada, envía el mensaje automáticamente
3. El mensaje queda registrado en la conversación
4. Cuando el lead **contesta**, la conversación sube al tope de la lista

## Estados del Mensaje Programado

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Esperando la hora programada |
| `enviado` | Mensaje enviado exitosamente |
| `fallido` | Error al enviar (ver error_mensaje) |
| `cancelado` | Cancelado por el agente |

## Preguntas Frecuentes

**¿Puedo programar mensajes por WSP4?**
No. Solo se pueden programar mensajes por las líneas Evolution API. Primero hay que desconectar la conversación del Router.

**¿Puedo cancelar un mensaje programado?**
Sí, desde la tabla de mensajes programados (si está implementada la vista) o contactando al administrador.

**¿Qué pasa si el lead contesta antes de la hora programada?**
El mensaje programado se enviará de todas formas a la hora indicada. El agente puede cancelarlo manualmente si ya no es necesario.

**¿Puedo adjuntar archivos?**
Sí. Primero adjuntá el archivo, luego hacé clic en el botón de reloj para programar.

