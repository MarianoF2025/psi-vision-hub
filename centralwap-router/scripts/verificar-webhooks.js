/**
 * Script para verificar que los webhooks están configurados
 * Uso: node scripts/verificar-webhooks.js
 */

require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });

const webhooks = {
  administracion: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION,
  alumnos: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS,
  ventas: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1,
  comunidad: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD,
  crm: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_CRM,
};

console.log('\n🔍 Verificando configuración de webhooks...\n');

let todosConfigurados = true;

Object.entries(webhooks).forEach(([area, url]) => {
  if (url && url.trim() !== '') {
    console.log(`✅ ${area.padEnd(15)}: ${url.substring(0, 60)}...`);
  } else {
    console.log(`❌ ${area.padEnd(15)}: NO CONFIGURADO`);
    todosConfigurados = false;
  }
});

console.log('\n' + '='.repeat(70));

if (todosConfigurados) {
  console.log('✅ Todos los webhooks están configurados correctamente\n');
} else {
  console.log('⚠️  Algunos webhooks no están configurados. Revisa el archivo .env\n');
  process.exit(1);
}


