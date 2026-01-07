import { Request, Response } from 'express';
import { paymentService } from '../services/PaymentService';
import { CrearPagoRequest } from '../types';

export class PaymentController {

  /**
   * GET /api/providers
   * Devuelve todos los providers con estado de configuración
   */
  async getProviders(req: Request, res: Response): Promise<void> {
    try {
      const providers = paymentService.getProviderInfo();
      res.json({ success: true, providers });
    } catch (error) {
      console.error('Error obteniendo providers:', error);
      res.status(500).json({ success: false, error: 'Error interno' });
    }
  }

  /**
   * GET /api/pagos
   * Lista todos los pagos con filtros opcionales
   */
  async listarPagos(req: Request, res: Response): Promise<void> {
    try {
      const { estado, provider, desde, hasta, limit } = req.query;

      const pagos = await paymentService.obtenerTodosLosPagos({
        estado: estado as any,
        provider: provider as any,
        desde: desde as string,
        hasta: hasta as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({ success: true, pagos });
    } catch (error: any) {
      console.error('Error listando pagos:', error);
      res.status(500).json({ success: false, error: error.message || 'Error listando pagos' });
    }
  }

  /**
   * POST /api/pagos/crear
   * conversacion_id es OPCIONAL - puede crearse pago solo con contacto_id o cliente
   */
  async crearPago(req: Request, res: Response): Promise<void> {
    try {
      const request: CrearPagoRequest = req.body;

      // Validaciones obligatorias
      if (!request.provider) {
        res.status(400).json({ success: false, error: 'provider requerido' });
        return;
      }
      if (!request.monto || request.monto <= 0) {
        res.status(400).json({ success: false, error: 'monto debe ser mayor a 0' });
        return;
      }
      if (!request.descripcion) {
        res.status(400).json({ success: false, error: 'descripcion requerida' });
        return;
      }
      if (!request.cliente?.nombre) {
        res.status(400).json({ success: false, error: 'cliente.nombre requerido' });
        return;
      }

      // conversacion_id ya NO es obligatorio - puede ser undefined

      const pago = await paymentService.crearPago(request);

      res.json({
        success: true,
        pago,
        mensaje_whatsapp: this.generarMensajeWhatsApp(pago),
      });
    } catch (error: any) {
      console.error('Error creando pago:', error);
      res.status(500).json({ success: false, error: error.message || 'Error creando pago' });
    }
  }

  /**
   * GET /api/pagos/:id
   */
  async obtenerPago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const pago = await paymentService.obtenerPago(id);

      if (!pago) {
        res.status(404).json({ success: false, error: 'Pago no encontrado' });
        return;
      }

      res.json({ success: true, pago });
    } catch (error: any) {
      console.error('Error obteniendo pago:', error);
      res.status(500).json({ success: false, error: error.message || 'Error obteniendo pago' });
    }
  }

  /**
   * GET /api/pagos/conversacion/:id
   */
  async obtenerPagosPorConversacion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const pagos = await paymentService.obtenerPagosPorConversacion(id);
      res.json({ success: true, pagos });
    } catch (error: any) {
      console.error('Error obteniendo pagos:', error);
      res.status(500).json({ success: false, error: error.message || 'Error obteniendo pagos' });
    }
  }

  /**
   * POST /api/pagos/:id/cancelar
   */
  async cancelarPago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const pago = await paymentService.cancelarPago(id);
      res.json({ success: true, pago });
    } catch (error: any) {
      console.error('Error cancelando pago:', error);
      res.status(500).json({ success: false, error: error.message || 'Error cancelando pago' });
    }
  }

  /**
   * POST /webhook/mercadopago
   */
  async webhookMercadoPago(req: Request, res: Response): Promise<void> {
    try {
      console.log('[Webhook MP] Recibido:', JSON.stringify(req.body));
      const result = await paymentService.procesarWebhook('mercadopago', req.body);
      res.json({ success: result.success, pago: result.pago });
    } catch (error: any) {
      console.error('Error procesando webhook MP:', error);
      res.status(200).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /webhook/stripe
   */
  async webhookStripe(req: Request, res: Response): Promise<void> {
    try {
      console.log('[Webhook Stripe] Recibido');
      const result = await paymentService.procesarWebhook(
        'stripe',
        req.body,
        req.headers as Record<string, string>
      );
      res.json({ success: result.success, pago: result.pago });
    } catch (error: any) {
      console.error('Error procesando webhook Stripe:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /webhook/siro
   */
  async webhookSiro(req: Request, res: Response): Promise<void> {
    try {
      console.log('[Webhook SIRO] Recibido:', JSON.stringify(req.body));
      const result = await paymentService.procesarWebhook('siro', req.body);
      res.json({ success: result.success, pago: result.pago });
    } catch (error: any) {
      console.error('Error procesando webhook SIRO:', error);
      res.status(200).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /webhook/dlocal
   */
  async webhookDLocal(req: Request, res: Response): Promise<void> {
    try {
      console.log('[Webhook DLocal] Recibido:', JSON.stringify(req.body));
      const result = await paymentService.procesarWebhook(
        'dlocal',
        req.body,
        req.headers as Record<string, string>
      );
      res.json({ success: result.success, pago: result.pago });
    } catch (error: any) {
      console.error('Error procesando webhook DLocal:', error);
      res.status(200).json({ success: false, error: error.message });
    }
  }

  /**
   * Genera mensaje de WhatsApp
   */
  private generarMensajeWhatsApp(pago: any): string {
    const vencimiento = pago.vencimiento
      ? new Date(pago.vencimiento).toLocaleDateString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        })
      : null;

    let mensaje = `💳 *Link de Pago*\n\n`;
    mensaje += `📝 ${pago.descripcion}\n`;
    mensaje += `💰 Monto: $${pago.monto.toLocaleString('es-AR')} ${pago.moneda}\n`;

    if (vencimiento) {
      mensaje += `📅 Vence: ${vencimiento}\n`;
    }

    mensaje += `\n👉 Pagá haciendo click acá:\n${pago.link_pago}\n`;
    mensaje += `\n_Podés pagar con tarjeta, transferencia, MercadoPago, Rapipago, Pago Fácil y más._`;

    return mensaje;
  }
}

export const paymentController = new PaymentController();
