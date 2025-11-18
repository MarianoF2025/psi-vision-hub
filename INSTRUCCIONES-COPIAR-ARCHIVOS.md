# Instrucciones para Copiar Archivos al Servidor

## Opción 1: Usar SCP desde tu máquina local (Recomendado)

Si tienes acceso SSH desde tu máquina Windows, ejecuta estos comandos en PowerShell o CMD:

```powershell
# Desde tu máquina local (Windows)
cd C:\Users\Usuario\psi-vision-hub

# Copiar archivos al servidor
scp lib/router/processor.ts root@161.97.136.77:/opt/psi-vision-hub/lib/router/processor.ts
scp components/crm/ChatPanel.tsx root@161.97.136.77:/opt/psi-vision-hub/components/crm/ChatPanel.tsx
scp app/api/messages/send/route.ts root@161.97.136.77:/opt/psi-vision-hub/app/api/messages/send/route.ts
```

## Opción 2: Copiar contenido manualmente en el servidor

Si no tienes SCP, puedes crear los archivos directamente en el servidor:

### 1. Hacer backup primero

```bash
cd /opt/psi-vision-hub
mkdir -p /root/backups/$(date +%Y%m%d)
cp lib/router/processor.ts /root/backups/$(date +%Y%m%d)/processor.ts
cp components/crm/ChatPanel.tsx /root/backups/$(date +%Y%m%d)/ChatPanel.tsx
cp app/api/messages/send/route.ts /root/backups/$(date +%Y%m%d)/route.ts
```

### 2. Descargar archivos desde GitHub (si está disponible)

```bash
# Intentar descargar directamente desde GitHub
cd /opt/psi-vision-hub
wget https://raw.githubusercontent.com/MarianoF2025/psi-vision-hub/master/lib/router/processor.ts -O lib/router/processor.ts
wget https://raw.githubusercontent.com/MarianoF2025/psi-vision-hub/master/components/crm/ChatPanel.tsx -O components/crm/ChatPanel.tsx
wget https://raw.githubusercontent.com/MarianoF2025/psi-vision-hub/master/app/api/messages/send/route.ts -O app/api/messages/send/route.ts
```

### 3. O copiar desde el repositorio local si tienes acceso

Si tienes acceso al repositorio local en otra ubicación del servidor, puedes copiar desde ahí.

## Opción 3: Usar Git con URL alternativa

Si GitHub está caído, puedes intentar con una URL alternativa o clonar de nuevo:

```bash
cd /opt
rm -rf psi-vision-hub-temp
git clone https://github.com/MarianoF2025/psi-vision-hub.git psi-vision-hub-temp
cd psi-vision-hub-temp
cp lib/router/processor.ts ../psi-vision-hub/lib/router/processor.ts
cp components/crm/ChatPanel.tsx ../psi-vision-hub/components/crm/ChatPanel.tsx
cp app/api/messages/send/route.ts ../psi-vision-hub/app/api/messages/send/route.ts
cd ../psi-vision-hub
```

## Después de copiar los archivos

```bash
cd /opt/psi-vision-hub
npm run build
pm2 restart psi-vision-hub
```

## Verificar que funcionó

```bash
pm2 logs psi-vision-hub --lines 0
```

Deberías ver logs como:
- `Guardando mensaje ... remitente_tipo: system, remitente_nombre: Sistema PSI`
- `Mensaje guardado exitosamente: ...`

