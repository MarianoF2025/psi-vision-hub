import { databaseService } from './DatabaseService';
import { Logger } from '../utils/logger';
import { Area, VentanaTipo } from '../models/enums';

export interface MetaAdsData {
  utmSource?: string;
  utmCampaign?: string;
  curso?: string;
  calidad?: 'alto' | 'medio' | 'bajo';
}

class MetaAdsHandler {
  async procesarMensajeMetaAds(telefono: string, texto: string) {
    const meta = this.extraerDatosMetaAds(texto);

    const conversacion = await databaseService.buscarOCrearConversacion(
      telefono,
      'ventas1',
      Area.VENTAS1
    );

    await databaseService.updateConversacion(conversacion.id, {
      es_lead_meta: true,
      ventana_72h_activa: true,
      ventana_72h_inicio: new Date().toISOString(),
      metadata: {
        ...(conversacion.metadata || {}),
        meta,
      },
      router_estado: 'ventas_meta_ads',
    });

    Logger.info('Lead Meta Ads procesado', { telefono, meta });

    return {
      conversacionId: conversacion.id,
      meta,
    };
  }

  extraerDatosMetaAds(texto: string): MetaAdsData {
    const lower = texto.toLowerCase();
    const data: MetaAdsData = {};

    if (lower.includes('utm_source=')) {
      data.utmSource = this.extractParameter(lower, 'utm_source');
    }
    if (lower.includes('utm_campaign=')) {
      data.utmCampaign = this.extractParameter(lower, 'utm_campaign');
    }

    data.curso = this.detectarCurso(lower);
    data.calidad = this.clasificarCalidadLead(data, lower);

    return data;
  }

  private extractParameter(text: string, key: string) {
    const regex = new RegExp(`${key}=([^&\\s]+)`);
    const match = text.match(regex);
    return match ? match[1] : undefined;
  }

  private detectarCurso(text: string) {
    if (text.includes('aba') || text.includes('aplicacion de aba')) return 'ABA';
    if (text.includes('tea')) return 'TEA';
    if (text.includes('tcc') || text.includes('cognitivo')) return 'TCC';
    return 'general';
  }

  private clasificarCalidadLead(meta: MetaAdsData, text: string): 'alto' | 'medio' | 'bajo' {
    if (meta.utmSource?.includes('meta') && meta.utmCampaign?.includes('remarketing')) {
      return 'alto';
    }
    if (text.length > 100) return 'alto';
    if (text.includes('precio') || text.includes('informacion')) return 'medio';
    return 'bajo';
  }
}

export const metaAdsHandler = new MetaAdsHandler();





