import { IPaymentProvider } from '../interfaces/IPaymentProvider';
import { CrearLinkPagoParams, LinkPagoResponse, VerificarPagoResponse, WebhookResult } from '../types';
export declare class StripeProvider implements IPaymentProvider {
    readonly nombre: "stripe";
    private client;
    constructor();
    isConfigured(): boolean;
    crearLinkPago(params: CrearLinkPagoParams): Promise<LinkPagoResponse>;
    verificarPago(providerPaymentId: string): Promise<VerificarPagoResponse>;
    procesarWebhook(payload: any, headers?: Record<string, string>): Promise<WebhookResult>;
    cancelarPago(providerPaymentId: string): Promise<boolean>;
    private mapearEstado;
}
//# sourceMappingURL=StripeProvider.d.ts.map