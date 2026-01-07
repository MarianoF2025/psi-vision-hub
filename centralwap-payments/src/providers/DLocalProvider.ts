import crypto from 'crypto';
import { IPaymentProvider } from '../interfaces/IPaymentProvider';
import {
  CrearLinkPagoParams,
  LinkPagoResponse,
  VerificarPagoResponse,
  WebhookResult,
  EstadoPago
} from '../types';
import { config } from '../config/environment';

interface DLocalPaymentResponse {
  id: string;
  redirect_url?: string;
  status?: string;
  amount?: number;
  currency?: string;
  payment_method_type?: string;
  approved_date?: string;
  message?: string;
}

export class DLocalProvider implements IPaymentProvider {
  readonly nombre = 'dlocal' as const;

  isConfigured(): boolean {
    return !!config.dlocal.apiKey && !!config.dlocal.secretKey;
  }

  private getAuthHeaders(): Record<string, string> {
    const timestamp = new Date().toISOString();
    const signature = this.generateSignature(timestamp);
    
    return {
      'Content-Type': 'application/json',
      'X-Date': timestamp,
      'X-Login': config.dlocal.apiKey,
      'Authorization': `V2-HMAC-SHA256, Signature: ${signature}`,
    };
  }

  private generateSignature(timestamp: string): string {
    const data = `${config.dlocal.apiKey}${timestamp}`;
    return crypto
      .createHmac('sha256', config.dlocal.secretKey)
      .update(data)
      .digest('hex');
  }

  async crearLinkPago(params: CrearLinkPagoParams): Promise<LinkPagoResponse> {
    if (!this.isConfigured()) {
      throw new Error('DLocal no está configurado');
    }

    const orderId = `order-${crypto.randomUUID().slice(0, 8)}`;

    try {
      const response = await fetch(`${config.dlocal.apiUrl}/payments`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          amount: params.monto,
          currency: params.moneda,
          country: 'AR',
          payment_method_flow: 'REDIRECT',
          order_id: orderId,
          description: params.descripcion,
          notification_url: `${config.baseUrl}/webhook/dlocal`,
          callback_url: `${config.frontendUrl}/crm/payments/exitoso`,
          payer: {
            name: params.cliente.nombre,
            email: params.cliente.email || 'cliente@centralwap.com',
            phone: params.cliente.telefono,
            document: params.metadata?.documento || undefined,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as DLocalPaymentResponse;
        throw new Error(`Error DLocal: ${errorData.message || response.status}`);
      }

      const data = await response.json() as DLocalPaymentResponse;

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
    } catch (error) {
      console.error('[DLocal] Error creando pago:', error);
      throw error;
    }
  }

  async verificarPago(providerPaymentId: string): Promise<VerificarPagoResponse> {
    if (!this.isConfigured()) {
      throw new Error('DLocal no está configurado');
    }

    try {
      const response = await fetch(
        `${config.dlocal.apiUrl}/payments/${providerPaymentId}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Error verificando: ${response.status}`);
      }

      const data = await response.json() as DLocalPaymentResponse;

      return {
        id: data.id,
        provider: 'dlocal',
        estado: this.mapearEstado(data.status || ''),
        monto: data.amount || 0,
        moneda: (data.currency as 'ARS' | 'USD') || 'USD',
        metodo_pago: data.payment_method_type,
        pagado_at: data.approved_date ? new Date(data.approved_date) : undefined,
        raw_response: data,
      };
    } catch (error) {
      console.error('[DLocal] Error verificando pago:', error);
      throw error;
    }
  }

  async procesarWebhook(payload: any, headers?: Record<string, string>): Promise<WebhookResult> {
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

  async cancelarPago(providerPaymentId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await fetch(
        `${config.dlocal.apiUrl}/payments/${providerPaymentId}/cancel`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
        }
      );
      return response.ok;
    } catch (error) {
      console.error('[DLocal] Error cancelando pago:', error);
      return false;
    }
  }

  private mapearEstado(dlocalStatus: string): EstadoPago {
    const mapa: Record<string, EstadoPago> = {
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
