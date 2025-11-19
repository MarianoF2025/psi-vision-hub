# PSI Vision Hub

Portal principal con módulos de CRM-COM, Dashboard IA Empresarial e IA Especialista TCC.

## 🚀 Stack Tecnológico

- **Next.js 14** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **Supabase Cloud** - Backend (auth, database, storage, realtime)
- **WhatsApp Cloud API** - Integración de mensajería
- **PM2** - Gestión de procesos en producción
- **Nginx** - Reverse proxy y SSL termination

## Módulos

1. **CRM-COM** - Gestión de comunicación por área (staff)
2. **Dashboard + IA Empresarial** - Panel de control con IA (admin)
3. **IA Especialista TCC** - Asistente de IA para TCC (alumnos + staff)

## Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Supabase

**Si ya tienes Supabase configurado:**

1. Obtén tus credenciales desde tu proyecto en [Supabase](https://supabase.com):
   - Ve a **Settings > API**
   - Copia la **Project URL** y la **anon/public key**

2. Crea un archivo `.env.local` en la raíz del proyecto:
```bash
cp env.example .env.local
```

3. Edita `.env.local` y agrega tus credenciales:
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

**Si necesitas crear un nuevo proyecto:**
1. Crea un proyecto en [Supabase](https://supabase.com)
2. Sigue los pasos anteriores para configurar las variables de entorno

### 3. Configurar Base de Datos

Ejecuta el siguiente SQL en el SQL Editor de Supabase para crear la tabla de perfiles:

```sql
-- Crear tabla de perfiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  role TEXT DEFAULT 'alumno' CHECK (role IN ('admin', 'developer', 'staff', 'alumno')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios vean su propio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Política para que los usuarios actualicen su propio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### 4. Ejecutar en desarrollo
```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## Estructura de Roles

- **Admin/Developer**: Acceso completo incluyendo administración
- **Staff**: Acceso a CRM-COM e IA TCC
- **Alumnos**: Acceso a IA TCC

## Estructura del Proyecto

```
psi-vision-hub/
├── app/                    # App Router de Next.js
│   ├── page.tsx           # Página principal con cards de módulos
│   ├── crm-com/           # Módulo CRM-COM
│   ├── dashboard/         # Dashboard IA (solo admin)
│   ├── ia-tcc/            # IA Especialista TCC
│   └── admin/             # Panel de administración
├── components/            # Componentes reutilizables
│   ├── Sidebar.tsx        # Barra lateral de navegación
│   ├── Header.tsx         # Encabezado con info de usuario
│   └── ModuleCard.tsx     # Card para módulos principales
├── lib/                   # Utilidades y configuraciones
│   ├── supabase/         # Clientes de Supabase
│   ├── auth.ts           # Funciones de autenticación
│   └── utils.ts          # Utilidades generales
└── middleware.ts         # Middleware de Next.js para auth
```

## 📱 Router PSI

El Router PSI es un proyecto separado que procesa mensajes de WhatsApp automáticamente. Está desplegado de forma independiente y se comunica con el CRM a través de Supabase.

**Nota:** El Router ha sido separado del CRM para mejor escalabilidad y mantenibilidad. Ver el proyecto `psi-router` para más información.

## 🚢 Deployment

### Producción (PM2 + Nginx)

El proyecto está desplegado en producción usando:
- **PM2**: Gestión de procesos Node.js
- **Nginx**: Reverse proxy con SSL (Let's Encrypt)
- **Dominio**: `app.psivisionhub.com`

Ver `DEPLOY.md` para instrucciones completas de deployment.

### Variables de Entorno Requeridas

Copia `env.example` a `.env.local` y completa todas las variables necesarias:

```bash
cp env.example .env.local
```

## 📝 Licencia

Propietario - PSI Asociación
