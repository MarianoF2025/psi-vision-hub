import { Request, Response } from 'express';
export declare class PaymentController {
    /**
     * GET /api/providers
     * Devuelve todos los providers con estado de configuración
     */
    getProviders(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/pagos
     * Lista todos los pagos con filtros opcionales
     */
    listarPagos(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/pagos/crear
     * conversacion_id es OPCIONAL - puede crearse pago solo con contacto_id o cliente
     */
    crearPago(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/pagos/:id
     */
    obtenerPago(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/pagos/conversacion/:id
     */
    obtenerPagosPorConversacion(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/pagos/:id/cancelar
     */
    cancelarPago(req: Request, res: Response): Promise<void>;
    /**
     * POST /webhook/mercadopago
     */
    webhookMercadoPago(req: Request, res: Response): Promise<void>;
    /**
     * POST /webhook/stripe
     */
    webhookStripe(req: Request, res: Response): Promise<void>;
    /**
     * POST /webhook/siro
     */
    webhookSiro(req: Request, res: Response): Promise<void>;
    /**
     * POST /webhook/dlocal
     */
    webhookDLocal(req: Request, res: Response): Promise<void>;
    /**
     * Genera mensaje de WhatsApp
     */
    private generarMensajeWhatsApp;
}
export declare const paymentController: PaymentController;
//# sourceMappingURL=PaymentController.d.ts.map