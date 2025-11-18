# Configuración Rápida - PSI Vision Hub

## Solución Rápida para Ver el Diseño

Si solo quieres ver el diseño sin configurar Supabase, el proyecto ahora funciona sin errores. Sin embargo, para funcionalidad completa necesitarás configurar Supabase.

## Configurar Supabase (Opcional para desarrollo)

1. **Crea el archivo `.env.local`** en la raíz del proyecto:
   ```bash
   # En Windows PowerShell
   New-Item -Path .env.local -ItemType File
   ```

2. **Agrega tus credenciales de Supabase**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
   ```

3. **Reinicia el servidor**:
   ```bash
   npm run dev
   ```

## Obtener Credenciales de Supabase

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Navega a **Settings > API**
3. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Nota

El proyecto ahora funciona sin Supabase configurado para que puedas ver el diseño. La autenticación y funciones relacionadas con usuarios no funcionarán hasta que configures Supabase.

