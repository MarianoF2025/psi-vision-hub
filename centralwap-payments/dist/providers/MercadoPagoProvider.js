"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoPagoProvider = void 0;
const crypto_1 = __importDefault(require("crypto"));
const mercadopago_1 = require("mercadopago");
const environment_1 = require("../config/environment");
class MercadoPagoProvider {
    constructor() {
        this.nombre = 'mercadopago';
        this.client = null;
        if (this.isConfigured()) {
            this.client = new mercadopago_1.MercadoPagoConfig({
                accessToken: environment_1.config.mercadopago.accessToken
            });
        }
    }
    isConfigured() {
        return !!environment_1.config.mercadopago.accessToken;
    }
    async crearLinkPago(params) {
        if (!this.client) {
            throw new Error('MercadoPago no está configurado');
        }
        const preference = new mercadopago_1.Preference(this.client);
        const vencimiento = params.vencimiento || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const items = params.items?.map((item, index) => ({
            id: `item-${index}-${crypto_1.default.randomUUID().slice(0, 8)}`,
            title: item.titulo,
            description: item.descripcion || item.titulo,
            quantity: item.cantidad,
            unit_price: item.precio_unitario,
            currency_id: params.moneda,
        })) || [{
                id: `item-${crypto_1.default.randomUUID().slice(0, 8)}`,
                title: params.descripcion,
                description: params.descripcion,
                quantity: 1,
                unit_price: params.monto,
                currency_id: params.moneda,
            }];
        const response = await preference.create({
            body: {
                items,
                payer: {
                    name: params.cliente.nombre,
                    email: params.cliente.email || 'cliente@centralwap.com',
                    phone: params.cliente.telefono ? {
                        number: params.cliente.telefono.replace(/\D/g, ''),
                    } : undefined,
                },
                external_reference: params.referencia_externa,
                notification_url: `${environment_1.config.baseUrl}/webhook/mercadopago`,
                back_urls: {
                    success: `${environment_1.config.frontendUrl}/crm/payments/exitoso`,
                    failure: `${environment_1.config.frontendUrl}/crm/payments/error`,
                    pending: `${environment_1.config.frontendUrl}/crm/payments/pendiente`,
                },
                auto_return: 'approved',
                expires: true,
                expiration_date_to: vencimiento.toISOString(),
                metadata: params.metadata,
            },
        });
        return {
            id: response.id || '',
            provider: 'mercadopago',
            provider_payment_id: response.id || '',
            link_pago: response.init_point || '',
            link_qr: response.sandbox_init_point,
            estado: 'pendiente',
            monto: params.monto,
            moneda: params.moneda,
            vencimiento,
            raw_response: response,
        };
    }
    async verificarPago(providerPaymentId) {
        if (!this.client) {
            throw new Error('MercadoPago no está configurado');
        }
        const payment = new mercadopago_1.Payment(this.client);
        const response = await payment.get({ id: providerPaymentId });
        return {
            id: response.id?.toString() || providerPaymentId,
            provider: 'mercadopago',
            estado: this.mapearEstado(response.status || ''),
            monto: response.transaction_amount || 0,
            moneda: response.currency_id || 'ARS',
            metodo_pago: response.payment_type_id || undefined,
            pagado_at: response.date_approved ? new Date(response.date_approved) : undefined,
            raw_response: response,
        };
    }
    async procesarWebhook(payload) {
        const { type, data } = payload;
        if (type !== 'payment') {
            return {
                provider_payment_id: data?.id || 'unknown',
                evento: type,
                raw_payload: payload,
            };
        }
        if (!this.client) {
            throw new Error('MercadoPago no está configurado');
        }
        const payment = new mercadopago_1.Payment(this.client);
        const paymentData = await payment.get({ id: data.id });
        return {
            provider_payment_id: paymentData.external_reference || data.id,
            evento: type,
            estado_nuevo: this.mapearEstado(paymentData.status || ''),
            monto: paymentData.transaction_amount || undefined,
            metodo_pago: paymentData.payment_type_id || undefined,
            raw_payload: paymentData,
        };
    }
    async cancelarPago(providerPaymentId) {
        console.log(`[MP] Cancelar pago ${providerPaymentId} - no soportado`);
        return true;
    }
    mapearEstado(mpStatus) {
        const mapa = {
            'pending': 'pendiente',
            'approved': 'pagado',
            'authorized': 'pendiente',
            'in_process': 'pendiente',
            'in_mediation': 'pendiente',
            'rejected': 'cancelado',
            'cancelled': 'cancelado',
            'refunded': 'reembolsado',
            'charged_back': 'reembolsado',
        };
        return mapa[mpStatus] || 'pendiente';
    }
}
exports.MercadoPagoProvider = MercadoPagoProvider;
//# sourceMappingURL=MercadoPagoProvider.js.map