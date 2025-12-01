import { ProcesadorEntrada } from './ProcesadorEntrada';
import { EvaluadorEstado } from './EvaluadorEstado';
import { EjecutorAccion } from './EjecutorAccion';
import { PersistorRespuesta } from './PersistorRespuesta';
import { IWhatsAppService } from '../services/WhatsAppService';
import { supabase } from '../config/supabase';
import { config } from '../config/environment';
import { logger, logWithRequestId } from '../utils/logger';
import { MensajeEntrante } from '../types';

/**
 * COORDINA LAS 4 FUNCIONES CORE
 * Punto de entrada principal del sistema
 */
export class CentralwapRouter {
  private procesadorEntrada: ProcesadorEntrada;
  private evaluadorEstado: EvaluadorEstado;
  private ejecutorAccion: EjecutorAccion;
  private persistorRespuesta: PersistorRespuesta;

  constructor(
    private whatsappService: IWhatsAppService,
    private supabaseClient = supabase,
    private sistemaConfig = config,
    private appLogger = logger
  ) {
    this.procesadorEntrada = new ProcesadorEntrada(
      this.supabaseClient,
      this.sistemaConfig.sistema,
      this.appLogger
    );
    this.evaluadorEstado = new EvaluadorEstado(
      this.sistemaConfig.sistema,
      this.appLogger
    );
    this.ejecutorAccion = new EjecutorAccion(this.supabaseClient, this.appLogger);
    this.persistorRespuesta = new PersistorRespuesta(
      this.supabaseClient,
      this.whatsappService,
      this.appLogger
    );
  }

  /**
   * MÉTODO PRINCIPAL - Procesamiento completo de mensaje
   */
  async procesarMensaje(
    mensaje: MensajeEntrante,
    userId?: number
  ): Promise<{
    success: boolean;
    request_id: string;
    processing_time_ms: number;
    conversacion_id?: string;
    accion_ejecutada?: string;
    area_destino?: string;
    ticket_creado?: string;
    error?: string;
  }> {
    const startTime = Date.now();
    const requestId = mensaje.metadata?.request_id || this.generateRequestId();

    try {
      logWithRequestId(requestId, 'info', 'Iniciando procesamiento de mensaje', {
        telefono: mensaje.telefono,
        contenido: mensaje.contenido.substring(0, 100),
      });

      // 1. PROCESADOR ENTRADA
      const contexto = await this.procesadorEntrada.procesarEntrada(mensaje);
      if (!contexto) {
        throw new Error('Error procesando entrada: contexto no obtenido');
      }

      // 2. EVALUADOR ESTADO
      const estado = await this.evaluadorEstado.evaluarEstado(contexto, mensaje.contenido);

      // 3. EJECUTOR ACCIÓN
      const accion = await this.ejecutorAccion.ejecutarAccion(estado, contexto);

      // 4. PERSISTOR RESPUESTA
      const resultado = await this.persistorRespuesta.persistirRespuesta(
        accion,
        contexto,
        requestId,
        userId
      );

      const processingTime = Date.now() - startTime;

      if (!resultado.success) {
        throw new Error(resultado.error || 'Error en persistencia');
      }

      logWithRequestId(requestId, 'info', 'Mensaje procesado exitosamente', {
        conversacionId: contexto.id,
        accion: estado.accion,
        processingTimeMs: processingTime,
      });

      return {
        success: true,
        request_id: requestId,
        processing_time_ms: processingTime,
        conversacion_id: contexto.id,
        accion_ejecutada: estado.accion,
        area_destino: estado.area_destino,
        ticket_creado: resultado.ticket_creado,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      logWithRequestId(requestId, 'error', 'Error procesando mensaje', {
        telefono: mensaje.telefono,
        error: errorMessage,
        processingTimeMs: processingTime,
      });

      return {
        success: false,
        request_id: requestId,
        processing_time_ms: processingTime,
        error: errorMessage,
      };
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}









