"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaAdsHandler = void 0;
const DatabaseService_1 = require("./DatabaseService");
const logger_1 = require("../utils/logger");
const enums_1 = require("../models/enums");
class MetaAdsHandler {
    async procesarMensajeMetaAds(telefono, texto) {
        const meta = this.extraerDatosMetaAds(texto);
        const conversacion = await DatabaseService_1.databaseService.buscarOCrearConversacion(telefono, 'ventas1', enums_1.Area.VENTAS1);
        await DatabaseService_1.databaseService.updateConversacion(conversacion.id, {
            es_lead_meta: true,
            ventana_72h_activa: true,
            ventana_72h_inicio: new Date().toISOString(),
            metadata: {
                ...(conversacion.metadata || {}),
                meta,
            },
            router_estado: 'ventas_meta_ads',
        });
        logger_1.Logger.info('Lead Meta Ads procesado', { telefono, meta });
        return {
            conversacionId: conversacion.id,
            meta,
        };
    }
    extraerDatosMetaAds(texto) {
        const lower = texto.toLowerCase();
        const data = {};
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
    extractParameter(text, key) {
        const regex = new RegExp(`${key}=([^&\\s]+)`);
        const match = text.match(regex);
        return match ? match[1] : undefined;
    }
    detectarCurso(text) {
        if (text.includes('aba') || text.includes('aplicacion de aba'))
            return 'ABA';
        if (text.includes('tea'))
            return 'TEA';
        if (text.includes('tcc') || text.includes('cognitivo'))
            return 'TCC';
        return 'general';
    }
    clasificarCalidadLead(meta, text) {
        if (meta.utmSource?.includes('meta') && meta.utmCampaign?.includes('remarketing')) {
            return 'alto';
        }
        if (text.length > 100)
            return 'alto';
        if (text.includes('precio') || text.includes('informacion'))
            return 'medio';
        return 'bajo';
    }
}
exports.metaAdsHandler = new MetaAdsHandler();
