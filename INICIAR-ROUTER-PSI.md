# Iniciar Router PSI con PM2

## Verificar estado actual

```bash
pm2 status
```

## Si el proceso no existe, iniciarlo

```bash
cd /opt/psi-vision-hub/router-psi
pm2 start ecosystem.config.cjs --env production
```

O usando el script de npm:

```bash
cd /opt/psi-vision-hub/router-psi
npm run start:pm2
```

## Verificar que esté corriendo

```bash
pm2 status router-psi
pm2 logs router-psi --lines 50
```

## Si ya existe pero con otro nombre

```bash
# Ver todos los procesos
pm2 list

# Si está con otro nombre, reiniciarlo
pm2 restart <nombre-del-proceso>
```

## Verificar logs

```bash
pm2 logs router-psi --lines 100
```

Deberías ver:
- `Router PSI escuchando en puerto 3002`
- O cualquier error de inicio

