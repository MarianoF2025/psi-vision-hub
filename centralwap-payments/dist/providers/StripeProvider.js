"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeProvider = void 0;
const stripe_1 = __importDefault(require("stripe"));
const environment_1 = require("../config/environment");
class StripeProvider {
    constructor() {
        this.nombre = 'stripe';
        this.client = null;
        if (this.isConfigured()) {
            this.client = new stripe_1.default(environment_1.config.stripe.secretKey);
        }
    }
    isConfigured() {
        return !!environment_1.config.stripe.secretKey;
    }
    async crearLinkPago(params) {
        if (!this.client) {
            throw new Error('Stripe no está configurado');
        }
        const vencimiento = params.vencimiento || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const session = await this.client.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: params.items?.map(item => ({
                price_data: {
                    currency: params.moneda.toLowerCase(),
                    product_data: {
                        name: item.titulo,
                        description: item.descripcion || item.titulo,
                    },
                    unit_amount: Math.round(item.precio_unitario * 100),
                },
                quantity: item.cantidad,
            })) || [{
                    price_data: {
                        currency: params.moneda.toLowerCase(),
                        product_data: {
                            name: params.descripcion,
                        },
                        unit_amount: Math.round(params.monto * 100),
                    },
                    quantity: 1,
                }],
            mode: 'payment',
            success_url: `${environment_1.config.frontendUrl}/crm/payments/exitoso?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${environment_1.config.frontendUrl}/crm/payments/cancelado`,
            expires_at: Math.floor(vencimiento.getTime() / 1000),
            customer_email: params.cliente.email || undefined,
            metadata: {
                referencia_externa: params.referencia_externa,
                cliente_nombre: params.cliente.nombre,
                cliente_telefono: params.cliente.telefono || '',
            },
        });
        return {
            id: session.id,
            provider: 'stripe',
            provider_payment_id: session.id,
            link_pago: session.url || '',
            estado: 'pendiente',
            monto: params.monto,
            moneda: params.moneda,
            vencimiento,
            raw_response: session,
        };
    }
    async verificarPago(providerPaymentId) {
        if (!this.client) {
            throw new Error('Stripe no está configurado');
        }
        const session = await this.client.checkout.sessions.retrieve(providerPaymentId);
        return {
            id: session.id,
            provider: 'stripe',
            estado: this.mapearEstado(session.payment_status || ''),
            monto: (session.amount_total || 0) / 100,
            moneda: session.currency?.toUpperCase() || 'USD',
            metodo_pago: 'card',
            pagado_at: session.payment_status === 'paid' ? new Date() : undefined,
            raw_response: session,
        };
    }
    async procesarWebhook(payload, headers) {
        if (!this.client) {
            throw new Error('Stripe no está configurado');
        }
        let event;
        if (environment_1.config.stripe.webhookSecret && headers?.['stripe-signature']) {
            try {
                event = this.client.webhooks.constructEvent(JSON.stringify(payload), headers['stripe-signature'], environment_1.config.stripe.webhookSecret);
            }
            catch (err) {
                throw new Error(`Webhook signature verification failed`);
            }
        }
        else {
            event = payload;
        }
        const session = event.data.object;
        return {
            provider_payment_id: session.metadata?.referencia_externa || session.id,
            evento: event.type,
            estado_nuevo: event.type === 'checkout.session.completed' ? 'pagado' : undefined,
            monto: session.amount_total ? session.amount_total / 100 : undefined,
            metodo_pago: 'card',
            raw_payload: event,
        };
    }
    async cancelarPago(providerPaymentId) {
        if (!this.client) {
            throw new Error('Stripe no está configurado');
        }
        try {
            await this.client.checkout.sessions.expire(providerPaymentId);
            return true;
        }
        catch (error) {
            console.error('[Stripe] Error cancelando sesión:', error);
            return false;
        }
    }
    mapearEstado(stripeStatus) {
        const mapa = {
            'unpaid': 'pendiente',
            'paid': 'pagado',
            'no_payment_required': 'pagado',
            'expired': 'vencido',
        };
        return mapa[stripeStatus] || 'pendiente';
    }
}
exports.StripeProvider = StripeProvider;
//# sourceMappingURL=StripeProvider.js.map