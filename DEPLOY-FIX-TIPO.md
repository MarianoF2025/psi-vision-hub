# 🚀 Deploy: Fix del Error `mensajes_tipo_check`

## ❌ Error en Producción
```
violates check constraint "mensajes_tipo_check"
tipo: "texto" (incorrecto)
```

## ✅ Corrección en Código Local
El código local ya tiene la corrección (línea 769):
```typescript
const tipoFromMetadata = metadata?.type || 'text';
const tipo = tipoFromMetadata === 'texto' ? 'text' : tipoFromMetadata;
```

## 🔧 Pasos para Deploy

### 1. Commit y Push
```bash
git add .
git commit -m "Fix: Corregir tipo de mensaje de 'texto' a 'text' para constraint"
git push origin main
```

### 2. En el Servidor (SSH)
```bash
cd /opt/psi-vision-hub
git pull origin main
npm run build
pm2 restart psi-vision-hub
pm2 logs psi-vision-hub --lines 20
```

### 3. Verificar
Después del restart, enviar un mensaje de prueba y verificar que:
- ✅ No aparece el error `mensajes_tipo_check`
- ✅ Se guarda el mensaje correctamente
- ✅ Se muestra el menú

## 📋 Checklist
- [ ] Código local tiene la corrección
- [ ] Commit y push realizado
- [ ] En servidor: `git pull`
- [ ] En servidor: `npm run build`
- [ ] En servidor: `pm2 restart psi-vision-hub`
- [ ] Verificar logs: no más errores de constraint
- [ ] Probar enviando un mensaje

