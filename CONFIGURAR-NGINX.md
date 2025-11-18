# Configuración Nginx para Router PSI Vision Hub

## Paso 1: Instalar Nginx (si no está instalado)

```bash
# Verificar si Nginx está instalado
which nginx || echo "Nginx no está instalado"

# Instalar Nginx
apt update
apt install -y nginx

# Verificar que está corriendo
systemctl status nginx
```

## Paso 2: Instalar Certbot para SSL

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obtener certificado SSL
certbot certonly --nginx -d router.psivisionhub.com --non-interactive --agree-tos --email admin@psivisionhub.com
```

## Paso 3: Copiar Configuración Nginx

```bash
# Copiar la configuración
cp nginx-router.conf /etc/nginx/sites-available/router.psivisionhub.com

# Crear enlace simbólico
ln -sf /etc/nginx/sites-available/router.psivisionhub.com /etc/nginx/sites-enabled/

# Verificar configuración
nginx -t

# Si hay errores, corregirlos. Si todo está bien, recargar Nginx
systemctl reload nginx
```

## Paso 4: Verificar que Funciona

```bash
# Verificar que Nginx está escuchando en puertos 80 y 443
netstat -tlnp | grep nginx

# Probar localmente
curl http://localhost/api/router/whatsapp/webhook

# Probar vía dominio
curl https://router.psivisionhub.com/api/router/whatsapp/webhook
```

## Paso 5: Configurar Auto-renovación SSL

```bash
# Verificar que el timer de renovación está activo
systemctl status certbot.timer

# Si no está activo, activarlo
systemctl enable certbot.timer
systemctl start certbot.timer
```

## Comandos Útiles

```bash
# Ver logs de Nginx
tail -f /var/log/nginx/router-access.log
tail -f /var/log/nginx/router-error.log

# Recargar configuración Nginx (sin downtime)
nginx -t && systemctl reload nginx

# Reiniciar Nginx
systemctl restart nginx

# Ver estado
systemctl status nginx
```

## Notas Importantes

- ⚠️ **Asegúrate de que el router PM2 está corriendo en puerto 3001**
- ⚠️ **Verifica que no hay conflictos de puertos** (Nginx usa 80/443, el router usa 3001)
- ✅ **Nginx es independiente de Traefik** - no interfieren entre sí
- ✅ **Si Traefik también usa 80/443**, necesitarás configurar Nginx en puertos diferentes o deshabilitar Traefik para este dominio

## Si Traefik Está Usando Puertos 80/443

Si Traefik ya está usando los puertos 80/443, tienes dos opciones:

### Opción A: Nginx en puertos diferentes (no recomendado para producción)
```bash
# Cambiar puertos en nginx-router.conf
listen 8080;
listen 8443 ssl http2;
```

### Opción B: Deshabilitar Traefik para router.psivisionhub.com y usar solo Nginx
```bash
# Nginx manejará router.psivisionhub.com
# Traefik seguirá manejando otros dominios (n8n, evolution, etc.)
```

La Opción B es la recomendada.

