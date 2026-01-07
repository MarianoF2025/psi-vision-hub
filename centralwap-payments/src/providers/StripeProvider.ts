import Stripe from 'stripe';
import { IPaymentProvider } from '../interfaces/IPaymentProvider';
import {
  CrearLinkPagoParams,
  LinkPagoResponse,
  VerificarPagoResponse,
  WebhookResult,
  EstadoPago
} from '../types';
import { config } from '../config/environment';

export class StripeProvider implements IPaymentProvider {
  readonly nombre = 'stripe' as const;
  private client: Stripe | null = null;

  constructor() {
    if (this.isConfigured()) {
      this.client = new Stripe(config.stripe.secretKey);
    }
  }

  isConfigured(): boolean {
    return !!config.stripe.secretKey;
  }

  async crearLinkPago(params: CrearLinkPagoParams): Promise<LinkPagoResponse> {
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
      success_url: `${config.frontendUrl}/crm/payments/exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/crm/payments/cancelado`,
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

  async verificarPago(providerPaymentId: string): Promise<VerificarPagoResponse> {
    if (!this.client) {
      throw new Error('Stripe no está configurado');
    }

    const session = await this.client.checkout.sessions.retrieve(providerPaymentId);

    return {
      id: session.id,
      provider: 'stripe',
      estado: this.mapearEstado(session.payment_status || ''),
      monto: (session.amount_total || 0) / 100,
      moneda: (session.currency?.toUpperCase() as 'ARS' | 'USD') || 'USD',
      metodo_pago: 'card',
      pagado_at: session.payment_status === 'paid' ? new Date() : undefined,
      raw_response: session,
    };
  }

  async procesarWebhook(payload: any, headers?: Record<string, string>): Promise<WebhookResult> {
    if (!this.client) {
      throw new Error('Stripe no está configurado');
    }

    let event: Stripe.Event;

    if (config.stripe.webhookSecret && headers?.['stripe-signature']) {
      try {
        event = this.client.webhooks.constructEvent(
          JSON.stringify(payload),
          headers['stripe-signature'],
          config.stripe.webhookSecret
        );
      } catch (err) {
        throw new Error(`Webhook signature verification failed`);
      }
    } else {
      event = payload as Stripe.Event;
    }

    const session = event.data.object as Stripe.Checkout.Session;

    return {
      provider_payment_id: session.metadata?.referencia_externa || session.id,
      evento: event.type,
      estado_nuevo: event.type === 'checkout.session.completed' ? 'pagado' : undefined,
      monto: session.amount_total ? session.amount_total / 100 : undefined,
      metodo_pago: 'card',
      raw_payload: event,
    };
  }

  async cancelarPago(providerPaymentId: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Stripe no está configurado');
    }

    try {
      await this.client.checkout.sessions.expire(providerPaymentId);
      return true;
    } catch (error) {
      console.error('[Stripe] Error cancelando sesión:', error);
      return false;
    }
  }

  private mapearEstado(stripeStatus: string): EstadoPago {
    const mapa: Record<string, EstadoPago> = {
      'unpaid': 'pendiente',
      'paid': 'pagado',
      'no_payment_required': 'pagado',
      'expired': 'vencido',
    };
    return mapa[stripeStatus] || 'pendiente';
  }
}
