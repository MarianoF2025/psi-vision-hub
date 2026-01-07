// Tipos de pasarelas
export type PaymentProvider = 'mercadopago' | 'siro' | 'stripe' | 'dlocal';

// Estados de pago
export type EstadoPago = 'pendiente' | 'pagado' | 'vencido' | 'cancelado' | 'reembolsado';

// Monedas
export type Moneda = 'ARS' | 'USD';

// Item de pago
export interface PagoItem {
  titulo: string;
  descripcion?: string;
  cantidad: number;
  precio_unitario: number;
}

// Cliente para crear pago
export interface ClientePago {
  nombre: string;
  email?: string;
  telefono?: string;
}

// Parámetros para crear link de pago
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

// Respuesta de creación de link
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

// Resultado de verificación
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

// Webhook procesado
export interface WebhookResult {
  pago_id?: string;
  provider_payment_id: string;
  evento: string;
  estado_nuevo?: EstadoPago;
  monto?: number;
  metodo_pago?: string;
  raw_payload: any;
}

// Pago en DB
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

// Request del CRM para crear pago
// conversacion_id es OPCIONAL - puede crearse pago solo con contacto_id
export interface CrearPagoRequest {
  conversacion_id?: string;  // Opcional
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
