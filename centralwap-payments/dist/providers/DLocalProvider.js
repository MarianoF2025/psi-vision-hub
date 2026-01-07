"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DLocalProvider = void 0;
const crypto_1 = __importDefault(require("crypto"));
const environment_1 = require("../config/environment");
class DLocalProvider {
    constructor() {
        this.nombre = 'dlocal';
    }
    isConfigured() {
        return !!environment_1.config.dlocal.apiKey && !!environment_1.config.dlocal.secretKey;
    }
    getAuthHeaders() {
        const timestamp = new Date().toISOString();
        const signature = this.generateSignature(timestamp);
        return {
            'Content-Type': 'application/json',
            'X-Date': timestamp,
            'X-Login': environment_1.config.dlocal.apiKey,
            'Authorization': `V2-HMAC-SHA256, Signature: ${signature}`,
        };
    }
    generateSignature(timestamp) {
        const data = `${environment_1.config.dlocal.apiKey}${timestamp}`;
        return crypto_1.default
            .createHmac('sha256', environment_1.config.dlocal.secretKey)
            .update(data)
            .digest('hex');
    }
    async crearLinkPago(params) {
        if (!this.isConfigured()) {
            throw new Error('DLocal no está configurado');
        }
        const orderId = `order-${crypto_1.default.randomUUID().slice(0, 8)}`;
        try {
            const response = await fetch(`${environment_1.config.dlocal.apiUrl}/payments`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    amount: params.monto,
                    currency: params.moneda,
                    country: 'AR',
                    payment_method_flow: 'REDIRECT',
                    order_id: orderId,
                    description: params.descripcion,
                    notification_url: `${environment_1.config.baseUrl}/webhook/dlocal`,
                    callback_url: `${environment_1.config.frontendUrl}/crm/payments/exitoso`,
                    payer: {
                        name: params.cliente.nombre,
                        email: params.cliente.email || 'cliente@centralwap.com',
                        phone: params.cliente.telefono,
                        document: params.metadata?.documento || undefined,
                    },
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error DLocal: ${errorData.message || response.status}`);
            }
            const data = await response.json();
            return {
                id: data.id,
                provider: 'dlocal',
                provider_payment_id: data.id,
                link_pago: data.redirect_url || '',
                estado: 'pendiente',
                monto: params.monto,
                moneda: params.moneda,
                vencimiento: params.vencimiento,
                raw_response: data,
            };
        }
        catch (error) {
            console.error('[DLocal] Error creando pago:', error);
            throw error;
        }
    }
    async verificarPago(providerPaymentId) {
        if (!this.isConfigured()) {
            throw new Error('DLocal no está configurado');
        }
        try {
            const response = await fetch(`${environment_1.config.dlocal.apiUrl}/payments/${providerPaymentId}`, {
                headers: this.getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Error verificando: ${response.status}`);
            }
            const data = await response.json();
            return {
                id: data.id,
                provider: 'dlocal',
                estado: this.mapearEstado(data.status || ''),
                monto: data.amount || 0,
                moneda: data.currency || 'USD',
                metodo_pago: data.payment_method_type,
                pagado_at: data.approved_date ? new Date(data.approved_date) : undefined,
                raw_response: data,
            };
        }
        catch (error) {
            console.error('[DLocal] Error verificando pago:', error);
            throw error;
        }
    }
    async procesarWebhook(payload, headers) {
        const { id, status, amount, payment_method_type, order_id } = payload;
        return {
            provider_payment_id: order_id || id,
            evento: 'payment_status_change',
            estado_nuevo: this.mapearEstado(status),
            monto: amount,
            metodo_pago: payment_method_type,
            raw_payload: payload,
        };
    }
    async cancelarPago(providerPaymentId) {
        if (!this.isConfigured()) {
            return false;
        }
        try {
            const response = await fetch(`${environment_1.config.dlocal.apiUrl}/payments/${providerPaymentId}/cancel`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
            });
            return response.ok;
        }
        catch (error) {
            console.error('[DLocal] Error cancelando pago:', error);
            return false;
        }
    }
    mapearEstado(dlocalStatus) {
        const mapa = {
            'PENDING': 'pendiente',
            'AUTHORIZED': 'pendiente',
            'PAID': 'pagado',
            'VERIFIED': 'pagado',
            'REJECTED': 'cancelado',
            'CANCELLED': 'cancelado',
            'EXPIRED': 'vencido',
            'REFUNDED': 'reembolsado',
            'PARTIALLY_REFUNDED': 'reembolsado',
            'CHARGEDBACK': 'reembolsado',
        };
        return mapa[dlocalStatus] || 'pendiente';
    }
}
exports.DLocalProvider = DLocalProvider;
//# sourceMappingURL=DLocalProvider.js.map