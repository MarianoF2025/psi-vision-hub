# Inicio Rápido - Desarrollo Local (PowerShell)

## 🚀 Comandos para PowerShell

### 1. Verificar que estás en el directorio correcto

```powershell
cd C:\Users\Usuario\psi-vision-hub
pwd  # Debería mostrar: C:\Users\Usuario\psi-vision-hub
```

### 2. Instalar dependencias (solo la primera vez o si cambias dependencias)

```powershell
npm install
```

### 3. Verificar que existe .env.local

```powershell
# Ver si existe
Test-Path .env.local

# Si no existe, crear uno básico
# (Luego editar manualmente con tus credenciales de Supabase)
if (-not (Test-Path .env.local)) {
    @"
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# Modo desarrollo (permite acceso sin login)
ALLOW_LOCAL_ACCESS=true
"@ | Out-File -FilePath .env.local -Encoding utf8
    Write-Host "✅ Archivo .env.local creado. Edítalo con tus credenciales de Supabase."
}
```

### 4. Ejecutar en modo desarrollo

```powershell
npm run dev
```

Deberías ver algo como:
```
▲ Next.js 14.2.5
- Local:        http://localhost:3001
✓ Ready in XXXms
```

### 5. Abrir en el navegador

Abrí: `http://localhost:3001`

Para el CRM: `http://localhost:3001/crm-com`

---

## ✅ Verificación Rápida

### ¿Funciona el servidor?
- Deberías ver "Ready" en la terminal
- No debería haber errores de compilación

### ¿Puedo acceder al CRM sin login?
- Abrí `http://localhost:3001/crm-com`
- Debería cargar directamente (sin redirigir a login)
- Si redirige, verificar que estés ejecutando `npm run dev` (no `npm run start`)

### ¿Hay errores?
- Revisá la terminal donde ejecutaste `npm run dev`
- Los errores aparecen en rojo
- Los warnings en amarillo (generalmente no son críticos)

---

## 🛑 Detener el servidor

Presioná `Ctrl + C` en la terminal donde está corriendo `npm run dev`

---

## 🔄 Reiniciar después de cambios

1. Detener con `Ctrl + C`
2. Ejecutar de nuevo: `npm run dev`

**Nota:** En la mayoría de los casos, Next.js detecta cambios automáticamente (Hot Reload) y no necesitas reiniciar.

---

## 📝 Comandos Útiles

### Ver qué archivos cambiaron
```powershell
git status
```

### Ver diferencias
```powershell
git diff
```

### Hacer commit (cuando esté listo)
```powershell
git add .
git commit -m "Descripción de los cambios"
```

### Push a GitHub (cuando esté listo)
```powershell
git push origin master
```

---

## 🐛 Problemas Comunes

### "npm: command not found"
- Instalar Node.js desde https://nodejs.org/
- Reiniciar PowerShell después de instalar

### "Port 3001 already in use"
- Algo está usando el puerto 3001
- Cambiar el puerto en `package.json` o detener el proceso que lo usa

### "Cannot find module"
- Ejecutar `npm install` de nuevo
- Verificar que `node_modules` existe

### El CRM sigue redirigiendo al login
- Verificar que estás ejecutando `npm run dev` (no `npm run start`)
- Verificar que `.env.local` tiene `ALLOW_LOCAL_ACCESS=true`
- Limpiar caché del navegador (Ctrl+Shift+R)

