import { IPaymentProvider } from '../interfaces/IPaymentProvider';
import { CrearLinkPagoParams, LinkPagoResponse, VerificarPagoResponse, WebhookResult } from '../types';
export declare class DLocalProvider implements IPaymentProvider {
    readonly nombre: "dlocal";
    isConfigured(): boolean;
    private getAuthHeaders;
    private generateSignature;
    crearLinkPago(params: CrearLinkPagoParams): Promise<LinkPagoResponse>;
    verificarPago(providerPaymentId: string): Promise<VerificarPagoResponse>;
    procesarWebhook(payload: any, headers?: Record<string, string>): Promise<WebhookResult>;
    cancelarPago(providerPaymentId: string): Promise<boolean>;
    private mapearEstado;
}
//# sourceMappingURL=DLocalProvider.d.ts.map