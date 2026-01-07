import crypto from 'crypto';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { IPaymentProvider } from '../interfaces/IPaymentProvider';
import { 
  CrearLinkPagoParams, 
  LinkPagoResponse, 
  VerificarPagoResponse, 
  WebhookResult,
  EstadoPago 
} from '../types';
import { config } from '../config/environment';

export class MercadoPagoProvider implements IPaymentProvider {
  readonly nombre = 'mercadopago' as const;
  private client: MercadoPagoConfig | null = null;

  constructor() {
    if (this.isConfigured()) {
      this.client = new MercadoPagoConfig({ 
        accessToken: config.mercadopago.accessToken 
      });
    }
  }

  isConfigured(): boolean {
    return !!config.mercadopago.accessToken;
  }

  async crearLinkPago(params: CrearLinkPagoParams): Promise<LinkPagoResponse> {
    if (!this.client) {
      throw new Error('MercadoPago no está configurado');
    }

    const preference = new Preference(this.client);
    const vencimiento = params.vencimiento || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const items = params.items?.map((item, index) => ({
      id: `item-${index}-${crypto.randomUUID().slice(0, 8)}`,
      title: item.titulo,
      description: item.descripcion || item.titulo,
      quantity: item.cantidad,
      unit_price: item.precio_unitario,
      currency_id: params.moneda,
    })) || [{
      id: `item-${crypto.randomUUID().slice(0, 8)}`,
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
        notification_url: `${config.baseUrl}/webhook/mercadopago`,
        back_urls: {
          success: `${config.frontendUrl}/crm/payments/exitoso`,
          failure: `${config.frontendUrl}/crm/payments/error`,
          pending: `${config.frontendUrl}/crm/payments/pendiente`,
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

  async verificarPago(providerPaymentId: string): Promise<VerificarPagoResponse> {
    if (!this.client) {
      throw new Error('MercadoPago no está configurado');
    }

    const payment = new Payment(this.client);
    const response = await payment.get({ id: providerPaymentId });

    return {
      id: response.id?.toString() || providerPaymentId,
      provider: 'mercadopago',
      estado: this.mapearEstado(response.status || ''),
      monto: response.transaction_amount || 0,
      moneda: (response.currency_id as 'ARS' | 'USD') || 'ARS',
      metodo_pago: response.payment_type_id || undefined,
      pagado_at: response.date_approved ? new Date(response.date_approved) : undefined,
      raw_response: response,
    };
  }

  async procesarWebhook(payload: any): Promise<WebhookResult> {
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

    const payment = new Payment(this.client);
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

  async cancelarPago(providerPaymentId: string): Promise<boolean> {
    console.log(`[MP] Cancelar pago ${providerPaymentId} - no soportado`);
    return true;
  }

  private mapearEstado(mpStatus: string): EstadoPago {
    const mapa: Record<string, EstadoPago> = {
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
