import { CrearLinkPagoParams, LinkPagoResponse, VerificarPagoResponse, WebhookResult, PaymentProvider } from '../types';
export interface IPaymentProvider {
    /**
     * Nombre del provider
     */
    readonly nombre: PaymentProvider;
    /**
     * Verifica si el provider está configurado correctamente
     */
    isConfigured(): boolean;
    /**
     * Crea un link de pago
     */
    crearLinkPago(params: CrearLinkPagoParams): Promise<LinkPagoResponse>;
    /**
     * Verifica el estado de un pago
     */
    verificarPago(providerPaymentId: string): Promise<VerificarPagoResponse>;
    /**
     * Procesa un webhook entrante
     */
    procesarWebhook(payload: any, headers?: Record<string, string>): Promise<WebhookResult>;
    /**
     * Cancela un pago pendiente
     */
    cancelarPago(providerPaymentId: string): Promise<boolean>;
}
//# sourceMappingURL=IPaymentProvider.d.ts.map