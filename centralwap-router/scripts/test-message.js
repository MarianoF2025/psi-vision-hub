/**
 * Script de prueba para enviar mensajes de prueba al router
 * Uso: node scripts/test-message.js
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3002';
const ENDPOINT = `${BASE_URL}/api/centralwap/message`;

// Mensaje de prueba
const mensajePrueba = {
  telefono: '+5491134567890', // Cambiar por un teléfono de prueba válido
  contenido: 'MENU',
  whatsapp_message_id: `test_${Date.now()}`,
  timestamp: new Date().toISOString(),
  origen: 'manual',
  utm_data: {
    utm_campaign: 'test_campaign',
    utm_source: 'test',
    utm_medium: 'test',
  },
};

async function enviarMensajePrueba() {
  try {
    console.log('📤 Enviando mensaje de prueba...');
    console.log('Mensaje:', JSON.stringify(mensajePrueba, null, 2));

    const response = await axios.post(ENDPOINT, mensajePrueba, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 segundos timeout
    });

    console.log('\n✅ Respuesta exitosa:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log(`\n⏱️  Tiempo de procesamiento: ${response.data.processing_time_ms}ms`);
      if (response.data.processing_time_ms > 200) {
        console.warn('⚠️  ADVERTENCIA: Tiempo de procesamiento excede 200ms');
      }
    }
  } catch (error) {
    console.error('\n❌ Error enviando mensaje:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
      console.error('¿Está el servidor corriendo en', BASE_URL, '?');
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// Ejecutar
enviarMensajePrueba();









