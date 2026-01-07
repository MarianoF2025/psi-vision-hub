import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { IPaymentProvider } from '../interfaces/IPaymentProvider';
import { MercadoPagoProvider } from '../providers/MercadoPagoProvider';
import { StripeProvider } from '../providers/StripeProvider';
import { SiroProvider } from '../providers/SiroProvider';
import { DLocalProvider } from '../providers/DLocalProvider';
import {
  PaymentProvider,
  CrearPagoRequest,
  Pago,
  EstadoPago,
} from '../types';

export class PaymentService {
  private providers: Map<PaymentProvider, IPaymentProvider> = new Map();

  constructor() {
    // Registrar MercadoPago
    const mp = new MercadoPagoProvider();
    if (mp.isConfigured()) {
      this.providers.set('mercadopago', mp);
      console.log('✅ MercadoPago provider registrado');
    } else {
      console.log('⚠️ MercadoPago no configurado');
    }

    // Registrar Stripe
    const stripe = new StripeProvider();
    if (stripe.isConfigured()) {
      this.providers.set('stripe', stripe);
      console.log('✅ Stripe provider registrado');
    } else {
      console.log('⚠️ Stripe no configurado');
    }

    // Registrar SIRO
    const siro = new SiroProvider();
    if (siro.isConfigured()) {
      this.providers.set('siro', siro);
      console.log('✅ SIRO provider registrado');
    } else {
      console.log('⚠️ SIRO no configurado');
    }

    // Registrar DLocal
    const dlocal = new DLocalProvider();
    if (dlocal.isConfigured()) {
      this.providers.set('dlocal', dlocal);
      console.log('✅ DLocal provider registrado');
    } else {
      console.log('⚠️ DLocal no configurado');
    }

    console.log(`📊 Total providers activos: ${this.providers.size}`);
  }

  getProvidersDisponibles(): PaymentProvider[] {
    return Array.from(this.providers.keys());
  }

  getProviderInfo(): Array<{ id: PaymentProvider; nombre: string; activo: boolean }> {
    const allProviders: Array<{ id: PaymentProvider; nombre: string }> = [
      { id: 'mercadopago', nombre: 'MercadoPago' },
      { id: 'stripe', nombre: 'Stripe' },
      { id: 'siro', nombre: 'SIRO (Rapipago/PagoFácil)' },
      { id: 'dlocal', nombre: 'DLocal' },
    ];

    return allProviders.map(p => ({
      ...p,
      activo: this.providers.has(p.id),
    }));
  }

  async crearPago(request: CrearPagoRequest): Promise<Pago> {
    const provider = this.providers.get(request.provider);
    if (!provider) {
      throw new Error(`Provider ${request.provider} no disponible. Providers activos: ${this.getProvidersDisponibles().join(', ')}`);
    }

    // Generar ID del pago primero para usarlo como referencia si no hay conversacion_id
    const pagoId = crypto.randomUUID();
    
    // Referencia externa: prioridad conversacion_id > contacto_id > pagoId
    const referenciaExterna = request.conversacion_id || request.contacto_id || pagoId;

    const diasVencimiento = request.dias_vencimiento || 7;
    const vencimiento = new Date(Date.now() + diasVencimiento * 24 * 60 * 60 * 1000);

    const linkResponse = await provider.crearLinkPago({
      monto: request.monto,
      moneda: request.moneda || 'ARS',
      descripcion: request.descripcion,
      referencia_externa: referenciaExterna,
      cliente: request.cliente,
      items: request.items,
      vencimiento,
      metadata: {
        ...request.metadata,
        pago_id: pagoId,
        conversacion_id: request.conversacion_id,
        contacto_id: request.contacto_id,
      },
    });

    const { data: pago, error } = await supabase
      .from('pagos')
      .insert({
        id: pagoId,
        conversacion_id: request.conversacion_id || null,
        contacto_id: request.contacto_id || null,
        provider: request.provider,
        provider_payment_id: linkResponse.provider_payment_id,
        monto: request.monto,
        moneda: request.moneda || 'ARS',
        estado: 'pendiente',
        link_pago: linkResponse.link_pago,
        link_qr: linkResponse.link_qr,
        descripcion: request.descripcion,
        vencimiento: vencimiento.toISOString(),
        metadata: request.metadata,
        created_by: request.created_by,
      })
      .select()
      .single();

    if (error) {
      console.error('Error guardando pago:', error);
      throw new Error(`Error guardando pago: ${error.message}`);
    }

    if (request.items && request.items.length > 0) {
      const itemsToInsert = request.items.map(item => ({
        pago_id: pagoId,
        titulo: item.titulo,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
      }));
      await supabase.from('pagos_items').insert(itemsToInsert);
    }

    return pago;
  }

  async obtenerPago(pagoId: string): Promise<Pago | null> {
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', pagoId)
      .single();

    if (error) {
      console.error('Error obteniendo pago:', error);
      return null;
    }
    return data;
  }

  async obtenerPagosPorConversacion(conversacionId: string): Promise<Pago[]> {
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('conversacion_id', conversacionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo pagos:', error);
      return [];
    }
    return data || [];
  }

  async obtenerTodosLosPagos(filtros?: {
    estado?: EstadoPago;
    provider?: PaymentProvider;
    desde?: string;
    hasta?: string;
    limit?: number;
  }): Promise<Pago[]> {
    let query = supabase
      .from('pagos')
      .select('*')
      .order('created_at', { ascending: false });

    if (filtros?.estado) {
      query = query.eq('estado', filtros.estado);
    }
    if (filtros?.provider) {
      query = query.eq('provider', filtros.provider);
    }
    if (filtros?.desde) {
      query = query.gte('created_at', filtros.desde);
    }
    if (filtros?.hasta) {
      query = query.lte('created_at', filtros.hasta);
    }
    if (filtros?.limit) {
      query = query.limit(filtros.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo pagos:', error);
      return [];
    }
    return data || [];
  }

  async procesarWebhook(
    provider: PaymentProvider,
    payload: any,
    headers?: Record<string, string>
  ): Promise<{ success: boolean; pago?: Pago }> {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(`Provider ${provider} no disponible`);
    }

    const webhookId = crypto.randomUUID();
    await supabase.from('pagos_webhooks').insert({
      id: webhookId,
      provider,
      evento: payload.type || payload.event || 'unknown',
      payload,
      procesado: false,
    });

    try {
      const result = await providerInstance.procesarWebhook(payload, headers);
      let pago = await this.buscarPagoPorProviderId(provider, result.provider_payment_id);

      if (pago && result.estado_nuevo) {
        pago = await this.actualizarEstadoPago(pago.id, result.estado_nuevo, {
          metodo_pago: result.metodo_pago,
          pagado_at: result.estado_nuevo === 'pagado' ? new Date().toISOString() : undefined,
        });

        await supabase
          .from('pagos_webhooks')
          .update({ procesado: true, pago_id: pago.id })
          .eq('id', webhookId);

        if (result.estado_nuevo === 'pagado') {
          await this.notificarPagoConfirmado(pago);
        }
      }

      return { success: true, pago: pago || undefined };
    } catch (error) {
      await supabase
        .from('pagos_webhooks')
        .update({ error: String(error) })
        .eq('id', webhookId);
      throw error;
    }
  }

  private async buscarPagoPorProviderId(
    provider: PaymentProvider,
    providerId: string
  ): Promise<Pago | null> {
    // Buscar por provider_payment_id
    let { data } = await supabase
      .from('pagos')
      .select('*')
      .eq('provider', provider)
      .eq('provider_payment_id', providerId)
      .single();

    if (data) return data;

    // Fallback: buscar por referencia externa (puede ser conversacion_id, contacto_id o pago_id)
    const result = await supabase
      .from('pagos')
      .select('*')
      .eq('provider', provider)
      .eq('estado', 'pendiente')
      .or(`conversacion_id.eq.${providerId},contacto_id.eq.${providerId},id.eq.${providerId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return result.data;
  }

  async actualizarEstadoPago(
    pagoId: string,
    estado: EstadoPago,
    extras?: Partial<Pago>
  ): Promise<Pago> {
    const { data, error } = await supabase
      .from('pagos')
      .update({ estado, ...extras })
      .eq('id', pagoId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error actualizando pago: ${error.message}`);
    }
    return data;
  }

  async cancelarPago(pagoId: string): Promise<Pago> {
    const pago = await this.obtenerPago(pagoId);
    if (!pago) {
      throw new Error('Pago no encontrado');
    }
    if (pago.estado !== 'pendiente') {
      throw new Error('Solo se pueden cancelar pagos pendientes');
    }

    const provider = this.providers.get(pago.provider as PaymentProvider);
    if (provider && pago.provider_payment_id) {
      await provider.cancelarPago(pago.provider_payment_id);
    }

    return this.actualizarEstadoPago(pagoId, 'cancelado');
  }

  private async notificarPagoConfirmado(pago: Pago): Promise<void> {
    const webhookUrl = process.env.N8N_WEBHOOK_PAGO_CONFIRMADO;
    if (!webhookUrl) {
      console.log('[PaymentService] No hay webhook configurado para notificar pago');
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pago_id: pago.id,
          conversacion_id: pago.conversacion_id,
          contacto_id: pago.contacto_id,
          monto: pago.monto,
          moneda: pago.moneda,
          descripcion: pago.descripcion,
          provider: pago.provider,
          metodo_pago: pago.metodo_pago,
        }),
      });
      console.log(`[PaymentService] Notificación enviada para pago ${pago.id}`);
    } catch (error) {
      console.error('[PaymentService] Error notificando pago:', error);
    }
  }
}

export const paymentService = new PaymentService();
