import { IPaymentProvider } from '../interfaces/IPaymentProvider';
import { CrearLinkPagoParams, LinkPagoResponse, VerificarPagoResponse, WebhookResult } from '../types';
export declare class SiroProvider implements IPaymentProvider {
    readonly nombre: "siro";
    isConfigured(): boolean;
    crearLinkPago(params: CrearLinkPagoParams): Promise<LinkPagoResponse>;
    verificarPago(providerPaymentId: string): Promise<VerificarPagoResponse>;
    procesarWebhook(payload: any): Promise<WebhookResult>;
    cancelarPago(providerPaymentId: string): Promise<boolean>;
    private generarCodigoBarra;
    private mapearEstado;
}
//# sourceMappingURL=SiroProvider.d.ts.map