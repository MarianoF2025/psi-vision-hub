/**
 * Test de integración - Flujo completo de mensaje
 * Ejecutar con: npm run test:integration
 */

import { CentralwapRouter } from '../../src/core/CentralwapRouter';
import { EvolutionWhatsAppService } from '../../src/services/WhatsAppService';
import { MensajeEntrante } from '../../src/types';

describe('Flujo completo de mensaje', () => {
  let router: CentralwapRouter;

  beforeAll(() => {
    const whatsappService = new EvolutionWhatsAppService();
    router = new CentralwapRouter(whatsappService);
  });

  test('debe procesar mensaje MENU completo', async () => {
    const mensaje: MensajeEntrante = {
      telefono: '+5491134567890',
      contenido: 'MENU',
      whatsapp_message_id: `test_${Date.now()}`,
      timestamp: new Date(),
      metadata: {
        request_id: `req_${Date.now()}`,
        webhook_source: 'manual',
      },
    };

    const resultado = await router.procesarMensaje(mensaje);

    expect(resultado.success).toBe(true);
    expect(resultado.processing_time_ms).toBeLessThan(2000); // Máximo 2 segundos
    expect(resultado.accion_ejecutada).toBeDefined();
  }, 30000); // Timeout de 30 segundos

  test('debe procesar opción numérica de menú', async () => {
    const mensaje: MensajeEntrante = {
      telefono: '+5491134567890',
      contenido: '1',
      whatsapp_message_id: `test_${Date.now()}`,
      timestamp: new Date(),
      metadata: {
        request_id: `req_${Date.now()}`,
        webhook_source: 'manual',
      },
    };

    const resultado = await router.procesarMensaje(mensaje);

    expect(resultado.success).toBe(true);
    expect(resultado.accion_ejecutada).toBe('derivar');
    expect(resultado.area_destino).toBe('admin');
  }, 30000);

  test('debe normalizar teléfono argentino correctamente', async () => {
    const mensaje: MensajeEntrante = {
      telefono: '91134567890', // Sin código país
      contenido: 'Hola',
      whatsapp_message_id: `test_${Date.now()}`,
      timestamp: new Date(),
      metadata: {
        request_id: `req_${Date.now()}`,
        webhook_source: 'manual',
      },
    };

    const resultado = await router.procesarMensaje(mensaje);

    // Debería normalizar y procesar correctamente
    expect(resultado.success).toBe(true);
  }, 30000);
});




