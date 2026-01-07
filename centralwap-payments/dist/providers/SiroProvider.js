"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiroProvider = void 0;
const crypto_1 = __importDefault(require("crypto"));
const environment_1 = require("../config/environment");
class SiroProvider {
    constructor() {
        this.nombre = 'siro';
    }
    isConfigured() {
        return !!environment_1.config.siro.apiKey && !!environment_1.config.siro.comercioId;
    }
    async crearLinkPago(params) {
        if (!this.isConfigured()) {
            throw new Error('SIRO no está configurado');
        }
        const vencimiento = params.vencimiento || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const codigoBarra = this.generarCodigoBarra(params);
        try {
            const response = await fetch(`${environment_1.config.siro.apiUrl}/api/v1/cupones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${environment_1.config.siro.apiKey}`,
                },
                body: JSON.stringify({
                    comercio_id: environment_1.config.siro.comercioId,
                    monto: params.monto,
                    moneda: params.moneda,
                    concepto: params.descripcion,
                    referencia: params.referencia_externa,
                    vencimiento: vencimiento.toISOString().split('T')[0],
                    pagador: {
                        nombre: params.cliente.nombre,
                        email: params.cliente.email,
                        telefono: params.cliente.telefono,
                    },
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error SIRO: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            return {
                id: data.cupon_id || crypto_1.default.randomUUID(),
                provider: 'siro',
                provider_payment_id: data.cupon_id || codigoBarra,
                link_pago: data.link_pago || `https://www.siro.com.ar/pagar/${data.cupon_id}`,
                link_qr: data.qr_code,
                estado: 'pendiente',
                monto: params.monto,
                moneda: params.moneda,
                vencimiento,
                raw_response: data,
            };
        }
        catch (error) {
            console.warn('[SIRO] API no disponible, generando cupón local:', error);
            const cuponId = crypto_1.default.randomUUID();
            return {
                id: cuponId,
                provider: 'siro',
                provider_payment_id: codigoBarra,
                link_pago: '',
                estado: 'pendiente',
                monto: params.monto,
                moneda: params.moneda,
                vencimiento,
                raw_response: { codigo_barra: codigoBarra, fallback: true },
            };
        }
    }
    async verificarPago(providerPaymentId) {
        if (!this.isConfigured()) {
            throw new Error('SIRO no está configurado');
        }
        try {
            const response = await fetch(`${environment_1.config.siro.apiUrl}/api/v1/cupones/${providerPaymentId}`, {
                headers: {
                    'Authorization': `Bearer ${environment_1.config.siro.apiKey}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Error verificando: ${response.status}`);
            }
            const data = await response.json();
            return {
                id: providerPaymentId,
                provider: 'siro',
                estado: this.mapearEstado(data.estado || ''),
                monto: data.monto || 0,
                moneda: 'ARS',
                metodo_pago: data.canal_pago,
                pagado_at: data.fecha_pago ? new Date(data.fecha_pago) : undefined,
                raw_response: data,
            };
        }
        catch (error) {
            console.error('[SIRO] Error verificando pago:', error);
            return {
                id: providerPaymentId,
                provider: 'siro',
                estado: 'pendiente',
                monto: 0,
                moneda: 'ARS',
                raw_response: { error: String(error) },
            };
        }
    }
    async procesarWebhook(payload) {
        const { cupon_id, estado, monto, canal_pago } = payload;
        return {
            provider_payment_id: cupon_id,
            evento: 'pago_recibido',
            estado_nuevo: this.mapearEstado(estado),
            monto,
            metodo_pago: canal_pago,
            raw_payload: payload,
        };
    }
    async cancelarPago(providerPaymentId) {
        if (!this.isConfigured()) {
            return false;
        }
        try {
            const response = await fetch(`${environment_1.config.siro.apiUrl}/api/v1/cupones/${providerPaymentId}/anular`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${environment_1.config.siro.apiKey}`,
                },
            });
            return response.ok;
        }
        catch (error) {
            console.error('[SIRO] Error cancelando cupón:', error);
            return false;
        }
    }
    generarCodigoBarra(params) {
        const comercio = environment_1.config.siro.comercioId.padStart(5, '0').slice(0, 5);
        const ref = params.referencia_externa.replace(/[^0-9]/g, '').padStart(10, '0').slice(0, 10);
        const monto = Math.round(params.monto * 100).toString().padStart(10, '0');
        const venc = (params.vencimiento || new Date())
            .toISOString()
            .slice(2, 10)
            .replace(/-/g, '');
        return `${comercio}${ref}${monto}${venc}`;
    }
    mapearEstado(siroEstado) {
        const mapa = {
            'pendiente': 'pendiente',
            'pagado': 'pagado',
            'acreditado': 'pagado',
            'vencido': 'vencido',
            'anulado': 'cancelado',
        };
        return mapa[siroEstado?.toLowerCase()] || 'pendiente';
    }
}
exports.SiroProvider = SiroProvider;
//# sourceMappingURL=SiroProvider.js.map