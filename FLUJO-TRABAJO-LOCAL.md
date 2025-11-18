# Flujo de Trabajo: Desarrollo Local → Producción

## 🎯 Estrategia

1. **Desarrollo en Local** → Probar y desarrollar en `localhost:3001`
2. **Commit y Push** → Cuando esté listo, subir a GitHub
3. **Deployment en Servidor** → Pull y rebuild en el servidor

---

## 🛠️ Setup Local

### 1. Variables de Entorno

Crear `.env.local` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# WhatsApp Cloud API (opcional para desarrollo)
CLOUD_API_BASE_URL=https://graph.facebook.com/v18.0
CLOUD_API_TOKEN=tu_token
CLOUD_API_PHONE_NUMBER_ID=tu_phone_number_id

# Modo desarrollo (permite acceso sin login)
ALLOW_LOCAL_ACCESS=true
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Ejecutar en Modo Desarrollo

```bash
npm run dev
```

El servidor estará en: `http://localhost:3001`

---

## 🔧 Características del Modo Desarrollo

### Acceso sin Autenticación

- El CRM (`/crm-com`) permite acceso sin login
- Usa un usuario mock: `dev@local.com` (admin)
- No requiere conexión a Supabase para autenticación

### Hot Reload

- Los cambios se reflejan automáticamente
- No necesitas reiniciar el servidor

### Logs Detallados

- Todos los `console.log` aparecen en la terminal
- Fácil debugging

---

## 📤 Proceso de Deployment

### Cuando el código esté listo:

#### 1. Verificar cambios

```bash
git status
git diff
```

#### 2. Hacer commit

```bash
git add .
git commit -m "Descripción de los cambios"
```

#### 3. Push a GitHub

```bash
git push origin master
```

#### 4. En el servidor

```bash
cd /opt/psi-vision-hub
git pull origin master
npm run build
pm2 restart psi-vision-hub
```

---

## 🚀 Script de Deployment Rápido

Crear `deploy.sh` en el servidor para automatizar:

```bash
#!/bin/bash
cd /opt/psi-vision-hub
git pull origin master
npm run build
pm2 restart psi-vision-hub
echo "✅ Deployment completado"
```

Uso:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## ✅ Checklist Antes de Hacer Push

- [ ] Código probado en local
- [ ] Sin errores de linting (`npm run lint`)
- [ ] Build exitoso (`npm run build`)
- [ ] Variables de entorno de producción configuradas en servidor
- [ ] Backup de cambios importantes

---

## 🔍 Verificar en Producción

Después del deployment:

```bash
# Ver logs
pm2 logs psi-vision-hub --lines 50

# Verificar que está corriendo
pm2 status

# Probar endpoint
curl https://app.psivisionhub.com/api/router/debug
```

---

## 📝 Notas Importantes

1. **Nunca hacer push de `.env.local`** - Está en `.gitignore`
2. **Variables de entorno del servidor** - Se mantienen en `/opt/psi-vision-hub/.env.local` del servidor
3. **Modo desarrollo vs producción** - El código detecta automáticamente según `NODE_ENV`
4. **Backup antes de cambios grandes** - Usar git branches o tags

---

## 🐛 Troubleshooting Local

### El CRM sigue redirigiendo al login

- Verificar que estás ejecutando `npm run dev` (no `npm run start`)
- Verificar que `NODE_ENV=development` o `ALLOW_LOCAL_ACCESS=true` en `.env.local`

### No se conecta a Supabase

- Verificar variables de entorno en `.env.local`
- Verificar que las URLs y keys sean correctas

### Cambios no se reflejan

- Verificar que el servidor de desarrollo esté corriendo
- Limpiar caché del navegador (Ctrl+Shift+R)
- Reiniciar el servidor de desarrollo

