import { IPaymentProvider } from '../interfaces/IPaymentProvider';
import { CrearLinkPagoParams, LinkPagoResponse, VerificarPagoResponse, WebhookResult } from '../types';
export declare class MercadoPagoProvider implements IPaymentProvider {
    readonly nombre: "mercadopago";
    private client;
    constructor();
    isConfigured(): boolean;
    crearLinkPago(params: CrearLinkPagoParams): Promise<LinkPagoResponse>;
    verificarPago(providerPaymentId: string): Promise<VerificarPagoResponse>;
    procesarWebhook(payload: any): Promise<WebhookResult>;
    cancelarPago(providerPaymentId: string): Promise<boolean>;
    private mapearEstado;
}
//# sourceMappingURL=MercadoPagoProvider.d.ts.map