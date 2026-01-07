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

interface SiroCuponResponse {
  cupon_id?: string;
  link_pago?: string;
  qr_code?: string;
}

interface SiroVerifyResponse {
  estado?: string;
  monto?: number;
  canal_pago?: string;
  fecha_pago?: string;
}

export class SiroProvider implements IPaymentProvider {
  readonly nombre = 'siro' as const;

  isConfigured(): boolean {
    return !!config.siro.apiKey && !!config.siro.comercioId;
  }

  async crearLinkPago(params: CrearLinkPagoParams): Promise<LinkPagoResponse> {
    if (!this.isConfigured()) {
      throw new Error('SIRO no está configurado');
    }

    const vencimiento = params.vencimiento || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const codigoBarra = this.generarCodigoBarra(params);

    try {
      const response = await fetch(`${config.siro.apiUrl}/api/v1/cupones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.siro.apiKey}`,
        },
        body: JSON.stringify({
          comercio_id: config.siro.comercioId,
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

      const data = await response.json() as SiroCuponResponse;

      return {
        id: data.cupon_id || crypto.randomUUID(),
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
    } catch (error) {
      console.warn('[SIRO] API no disponible, generando cupón local:', error);
      
      const cuponId = crypto.randomUUID();
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

  async verificarPago(providerPaymentId: string): Promise<VerificarPagoResponse> {
    if (!this.isConfigured()) {
      throw new Error('SIRO no está configurado');
    }

    try {
      const response = await fetch(
        `${config.siro.apiUrl}/api/v1/cupones/${providerPaymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.siro.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error verificando: ${response.status}`);
      }

      const data = await response.json() as SiroVerifyResponse;

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
    } catch (error) {
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

  async procesarWebhook(payload: any): Promise<WebhookResult> {
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

  async cancelarPago(providerPaymentId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await fetch(
        `${config.siro.apiUrl}/api/v1/cupones/${providerPaymentId}/anular`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.siro.apiKey}`,
          },
        }
      );
      return response.ok;
    } catch (error) {
      console.error('[SIRO] Error cancelando cupón:', error);
      return false;
    }
  }

  private generarCodigoBarra(params: CrearLinkPagoParams): string {
    const comercio = config.siro.comercioId.padStart(5, '0').slice(0, 5);
    const ref = params.referencia_externa.replace(/[^0-9]/g, '').padStart(10, '0').slice(0, 10);
    const monto = Math.round(params.monto * 100).toString().padStart(10, '0');
    const venc = (params.vencimiento || new Date())
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, '');
    
    return `${comercio}${ref}${monto}${venc}`;
  }

  private mapearEstado(siroEstado: string): EstadoPago {
    const mapa: Record<string, EstadoPago> = {
      'pendiente': 'pendiente',
      'pagado': 'pagado',
      'acreditado': 'pagado',
      'vencido': 'vencido',
      'anulado': 'cancelado',
    };
    return mapa[siroEstado?.toLowerCase()] || 'pendiente';
  }
}
