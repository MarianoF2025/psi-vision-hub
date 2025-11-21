# Buscar Archivo .env del Router PSI

## Ubicaciones Posibles

El archivo `.env` del router-psi debería estar en:

1. **Ubicación principal (recomendada):**
   ```bash
   /opt/psi-vision-hub/router-psi/.env
   ```

2. **Ubicación alternativa (raíz del proyecto):**
   ```bash
   /opt/psi-vision-hub/.env
   ```

3. **Si usaste .env.local:**
   ```bash
   /opt/psi-vision-hub/.env.local
   /opt/psi-vision-hub/router-psi/.env.local
   ```

## Comandos para Buscar

```bash
# Buscar en router-psi
ls -la /opt/psi-vision-hub/router-psi/.env*

# Buscar en la raíz del proyecto
ls -la /opt/psi-vision-hub/.env*

# Buscar en todo el directorio
find /opt/psi-vision-hub -name ".env*" -type f 2>/dev/null

# Ver contenido si existe
cat /opt/psi-vision-hub/router-psi/.env
```

## Si No Existe

Si no encuentras el archivo, necesitas crearlo:

```bash
cd /opt/psi-vision-hub/router-psi
nano .env
```

Y agregar todas las variables requeridas (ver `CONFIGURAR-VARIABLES-ROUTER-PSI.md`).

## Nota

El archivo `.env` está en `.gitignore`, por lo que no aparece en Git. Solo existe en el servidor.

