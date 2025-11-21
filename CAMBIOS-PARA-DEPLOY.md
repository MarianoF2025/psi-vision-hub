# 📋 Cambios Realizados - Resumen para Deploy

Este documento lista todos los cambios realizados en local que deben replicarse en el servidor.

## 🎨 Cambios de UI/UX - CRM

### 1. Colores del CRM
- **Color primario cambiado**: De `#1E293B` (azul oscuro) a `#2563EB` (azul más claro)
- **Archivo**: `tailwind.config.ts`
- **Cambios**:
  - `primary.DEFAULT`: `#2563EB`
  - `primary.dark`: `#1D4ED8`
  - `primary.light`: `#3B82F6`
  - Todas las variaciones de `primary` actualizadas a la paleta azul `#2563EB`

### 2. Iconos Modernos
- **Reemplazo de `lucide-react` por `react-icons`**
- **Archivos afectados**:
  - `components/crm/ChatPanel.tsx`
  - `components/crm/InboxSidebar.tsx`
  - `components/crm/ConversationList.tsx`
  - `components/crm/ContactInfo.tsx`
- **Iconos usados**:
  - `react-icons/hi` (Heroicons)
  - `react-icons/md` (Material Design Icons)

### 3. Tipografía
- **Color de textos cambiado a gris oscuro** (`text-gray-800` o `text-gray-900`)
- **Archivos afectados**:
  - `components/crm/ConversationList.tsx`
  - `components/crm/InboxSidebar.tsx`
  - `components/crm/ContactInfo.tsx`
  - `components/crm/ChatPanel.tsx`
  - `components/crm/CRMInterface.tsx`
  - `components/crm/pages/StatisticsPage.tsx`
  - `components/crm/functions/StatisticsView.tsx`
  - `components/crm/AssignmentModal.tsx`

### 4. Home Page
- **Botón "Acceder" del CRM**: Color `#2563EB`
- **Hover del título CRM**: Color `#2563EB`
- **Archivos**:
  - `app/page.tsx`
  - `components/ModuleCard.tsx`
  - `components/Header.tsx`
  - `components/Sidebar.tsx`

## 🔧 Cambios Funcionales - CRM

### 1. Tipos TypeScript
- **Archivo**: `lib/types/crm.ts`
- **Propiedades agregadas a `Message`**:
  - `mensaje_respuesta_id?: string | null`
  - `editado?: boolean`
  - `eliminado?: boolean`

### 2. Corrección de Errores
- **Archivo**: `components/crm/ChatPanel.tsx`
- **Fix**: Variable `hasReaction` movida fuera del bloque `try` para acceso en `catch`

## 🎯 Cambios en Router PSI

### 1. Menús y Submenús
- **Archivo**: `router-psi/src/services/MenuService.ts`
- **Cambios**:

#### Menú Principal:
```
¡Bienvenidos a Asociación PSI! 👋

Para ayudarte mejor, elegí el área con un número:

🟨 1) Administración
🟧 2) Alumnos
🟪 3) Inscripciones
🟦 4) Comunidad PSI y En Vivo
⚪ 5) Otra consulta

Escribí el número (ej: 1)

🔄 Escribí MENU para volver a este menú
```

#### Submenús:
- **Formato**: `🟨 *Administración*` con emoji y asteriscos
- **Lista numerada**: `11) Pagos y medios de pago` (con paréntesis)
- **Instrucciones**: "Elegí el código (ej: 11)" y "🔄 Escribí VOLVER para menú principal"

#### Opciones actualizadas:
- **Administración**: "Pagos y medios de pago", "Problemas con la cuota", etc.
- **Alumnos**: "Acceso al campus", "Clases y cronograma", etc.
- **Inscripciones**: "Cursos vigentes", "Inscripción a un curso", etc.

#### Mensaje de derivación:
```
Perfecto! Te estoy derivando con el equipo de [área]. En unos minutos te van a responder desde este mismo número. ✅
```

## 📦 Archivos que Requieren Compilación

### 1. Next.js App
- **Comando**: `npm run build`
- **Output**: `.next/` directory
- **Estado**: ✅ Compilado

### 2. Router PSI
- **Comando**: `cd router-psi && npm run build`
- **Output**: `router-psi/dist/` directory
- **Estado**: ✅ Compilado

## 🚀 Proceso de Deploy

### Opción 1: Script Automático (Recomendado)
```bash
bash deploy-completo.sh
```

### Opción 2: Manual

#### 1. Compilar Next.js
```bash
cd /opt/psi-vision-hub
npm install
npm run build
```

#### 2. Compilar Router PSI
```bash
cd /opt/psi-vision-hub/router-psi
npm install
npm run build
cd ..
```

#### 3. Reiniciar PM2
```bash
pm2 restart psi-vision-hub
pm2 restart router-psi
```

## ✅ Checklist de Verificación

- [ ] Código actualizado desde Git (`git pull`)
- [ ] Dependencias instaladas (`npm install` en ambos proyectos)
- [ ] Next.js compilado (`npm run build`)
- [ ] Router PSI compilado (`cd router-psi && npm run build`)
- [ ] PM2 reiniciado (ambos servicios)
- [ ] Verificar que los servicios están online (`pm2 status`)
- [ ] Verificar logs sin errores (`pm2 logs`)
- [ ] Probar menús en WhatsApp
- [ ] Verificar colores en el CRM
- [ ] Verificar iconos en el CRM

## 🔍 Verificación Post-Deploy

### CRM
1. Abrir el CRM en el navegador
2. Verificar que los colores son azul `#2563EB`
3. Verificar que los iconos son modernos (no lucide-react)
4. Verificar que los textos son gris oscuro

### Router PSI
1. Enviar "hola" a WhatsApp
2. Verificar que el menú principal tiene emojis de cuadrados
3. Seleccionar una opción (ej: "2" para Alumnos)
4. Verificar que el submenú tiene el formato correcto con emoji y asteriscos
5. Seleccionar una opción del submenú
6. Verificar el mensaje de derivación con ✅

## 📝 Notas Importantes

1. **El Router PSI debe compilarse** antes de reiniciar PM2
2. **Los cambios de colores** requieren rebuild de Next.js
3. **Los cambios de menús** requieren rebuild del Router PSI
4. **Verificar variables de entorno** antes del deploy
5. **Hacer backup** antes del deploy en producción

## 🐛 Troubleshooting

### Si los colores no cambian:
- Verificar que `tailwind.config.ts` está actualizado
- Limpiar cache: `rm -rf .next && npm run build`

### Si los menús no cambian:
- Verificar que `router-psi/dist/services/MenuService.js` tiene los cambios
- Reiniciar Router PSI: `pm2 restart router-psi`

### Si hay errores de TypeScript:
- Verificar que `lib/types/crm.ts` tiene todas las propiedades
- Verificar que `components/crm/ChatPanel.tsx` no tiene errores

