import { PaymentProvider, CrearPagoRequest, Pago, EstadoPago } from '../types';
export declare class PaymentService {
    private providers;
    constructor();
    getProvidersDisponibles(): PaymentProvider[];
    getProviderInfo(): Array<{
        id: PaymentProvider;
        nombre: string;
        activo: boolean;
    }>;
    crearPago(request: CrearPagoRequest): Promise<Pago>;
    obtenerPago(pagoId: string): Promise<Pago | null>;
    obtenerPagosPorConversacion(conversacionId: string): Promise<Pago[]>;
    obtenerTodosLosPagos(filtros?: {
        estado?: EstadoPago;
        provider?: PaymentProvider;
        desde?: string;
        hasta?: string;
        limit?: number;
    }): Promise<Pago[]>;
    procesarWebhook(provider: PaymentProvider, payload: any, headers?: Record<string, string>): Promise<{
        success: boolean;
        pago?: Pago;
    }>;
    private buscarPagoPorProviderId;
    actualizarEstadoPago(pagoId: string, estado: EstadoPago, extras?: Partial<Pago>): Promise<Pago>;
    cancelarPago(pagoId: string): Promise<Pago>;
    private notificarPagoConfirmado;
}
export declare const paymentService: PaymentService;
//# sourceMappingURL=PaymentService.d.ts.map