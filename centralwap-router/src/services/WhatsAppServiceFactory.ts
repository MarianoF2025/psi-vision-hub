import { config } from '../config/environment';
import { IWhatsAppService, EvolutionWhatsAppService } from './WhatsAppService';
import { logger } from '../utils/logger';

/**
 * Factory para crear el servicio de WhatsApp correcto según la configuración
 */
export function createWhatsAppService(): IWhatsAppService {
  const provider = config.whatsapp.provider;

  if (provider === 'evolution') {
    return new EvolutionWhatsAppService(config.whatsapp.evolution, logger);
  } else if (provider === 'cloud_api' && config.whatsapp.meta) {
    // Meta Cloud API - Necesitamos crear esta implementación si no existe
    // Por ahora, usamos Evolution como fallback
    logger.warn('Meta Cloud API no está completamente implementado, usando Evolution como fallback');
    return new EvolutionWhatsAppService(config.whatsapp.evolution, logger);
  } else {
    // Fallback a Evolution
    logger.warn('Proveedor de WhatsApp no reconocido, usando Evolution como fallback');
    return new EvolutionWhatsAppService(config.whatsapp.evolution, logger);
  }
}








