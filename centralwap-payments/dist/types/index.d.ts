export type PaymentProvider = 'mercadopago' | 'siro' | 'stripe' | 'dlocal';
export type EstadoPago = 'pendiente' | 'pagado' | 'vencido' | 'cancelado' | 'reembolsado';
export type Moneda = 'ARS' | 'USD';
export interface PagoItem {
    titulo: string;
    descripcion?: string;
    cantidad: number;
    precio_unitario: number;
}
export interface ClientePago {
    nombre: string;
    email?: string;
    telefono?: string;
}
export interface CrearLinkPagoParams {
    monto: number;
    moneda: Moneda;
    descripcion: string;
    referencia_externa: string;
    cliente: ClientePago;
    items?: PagoItem[];
    vencimiento?: Date;
    metadata?: Record<string, any>;
}
export interface LinkPagoResponse {
    id: string;
    provider: PaymentProvider;
    provider_payment_id: string;
    link_pago: string;
    link_qr?: string;
    estado: EstadoPago;
    monto: number;
    moneda: Moneda;
    vencimiento?: Date;
    raw_response?: any;
}
export interface VerificarPagoResponse {
    id: string;
    provider: PaymentProvider;
    estado: EstadoPago;
    monto: number;
    moneda: Moneda;
    metodo_pago?: string;
    pagado_at?: Date;
    raw_response?: any;
}
export interface WebhookResult {
    pago_id?: string;
    provider_payment_id: string;
    evento: string;
    estado_nuevo?: EstadoPago;
    monto?: number;
    metodo_pago?: string;
    raw_payload: any;
}
export interface Pago {
    id: string;
    conversacion_id?: string;
    contacto_id?: string;
    provider: PaymentProvider;
    provider_payment_id?: string;
    monto: number;
    moneda: Moneda;
    estado: EstadoPago;
    link_pago?: string;
    link_qr?: string;
    descripcion?: string;
    metodo_pago?: string;
    vencimiento?: string;
    pagado_at?: string;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
    created_by?: string;
}
export interface CrearPagoRequest {
    conversacion_id?: string;
    contacto_id?: string;
    provider: PaymentProvider;
    monto: number;
    moneda?: Moneda;
    descripcion: string;
    cliente: ClientePago;
    items?: PagoItem[];
    dias_vencimiento?: number;
    metadata?: Record<string, any>;
    created_by?: string;
}
//# sourceMappingURL=index.d.ts.map