import { supabase } from '../config/supabase';
import { logger, logWithRequestId } from '../utils/logger';
import { obtenerNombreArea } from '../utils/areaMapper';
import {
  EstadoEvaluado,
  ContextoConversacion,
  AccionProcesada,
} from '../types';

/**
 * RESPONSABILIDADES CRÍTICAS:
 * ✅ Generar contenido de menús (principal y submenús por área)
 * ✅ Preparar mensajes de derivación con contexto PSI
 * ✅ Gestionar mensajes de cortesía y timeouts
 * ✅ Aplicar plantillas y personalizaciones dinámicas
 * ✅ Preparar datos estructurados para persistencia
 * ✅ Manejar casos especiales (multimedia, links, botones)
 */
export class EjecutorAccion {
  constructor(
    private supabaseClient = supabase,
    private appLogger = logger
  ) {}

  /**
   * MÉTODO PRINCIPAL - Ejecutar acción determinada
   */
  async ejecutarAccion(
    estado: EstadoEvaluado,
    contexto: ContextoConversacion
  ): Promise<AccionProcesada> {
    const startTime = Date.now();

    try {
      this.appLogger.debug('Ejecutando acción', {
        conversacionId: contexto.id,
        accion: estado.accion,
        areaDestino: estado.area_destino,
        requiereDerivacion: estado.requiere_derivacion,
      });

      let accionProcesada: AccionProcesada;

      switch (estado.accion) {
        case 'mostrar_menu':
          accionProcesada = await this.generarMenu(estado, contexto);
          break;

        case 'derivar':
          accionProcesada = await this.prepararDerivacion(estado, contexto);
          break;

        case 'continuar_conversacion':
          accionProcesada = this.continuarConversacion(estado, contexto);
          break;

        case 'mensaje_cortesia':
          accionProcesada = this.generarMensajeCortesia(estado, contexto);
          break;

        case 'timeout':
          accionProcesada = this.generarMensajeTimeout(estado, contexto);
          break;

        default:
          accionProcesada = this.generarError(estado, contexto);
      }

      const processingTime = Date.now() - startTime;
      this.appLogger.debug('Acción ejecutada', {
        conversacionId: contexto.id,
        tipo: accionProcesada.tipo,
        contenidoLength: accionProcesada.contenido.length,
        requierePersistencia: accionProcesada.requiere_persistencia,
        processingTimeMs: processingTime,
      });

      return accionProcesada;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.appLogger.error('Error ejecutando acción', {
        conversacionId: contexto.id,
        accion: estado.accion,
        error: error instanceof Error ? error.message : 'Error desconocido',
        processingTimeMs: processingTime,
      });

      return this.generarError(estado, contexto);
    }
  }

  // MÉTODOS AUXILIARES

  /**
   * Generar contenido de menú principal o submenús
   */
  private async generarMenu(
    estado: EstadoEvaluado,
    contexto: ContextoConversacion
  ): Promise<AccionProcesada> {
    const menuPrincipal = `¡Hola! 👋

Soy tu asistente virtual. ¿En qué puedo ayudarte?

Elige una opción:
1️⃣ Administración
2️⃣ Alumnos
3️⃣ Inscripciones
4️⃣ Comunidad
5️⃣ Otra consulta

Escribe el número de la opción que necesites, o escribe MENU para volver a ver este menú.`;

    // Si hay proxy activo y se muestra el menú, desactivarlo
    const desactivarProxy = estado.metadata?.desactivar_proxy || false;

    return {
      tipo: 'menu',
      contenido: menuPrincipal,
      requiere_persistencia: true,
      datos_persistencia: {
        actualizar_menu: {
          menu_actual: 'principal',
          nivel_menu: 0,
        },
        desactivar_proxy: desactivarProxy, // Desactivar proxy si se muestra menú
      },
      metadata: {
        menu_tipo: estado.menu_a_mostrar || 'principal',
        es_mensaje_automatico: estado.es_mensaje_automatico,
        desactivar_proxy: desactivarProxy,
      },
    };
  }

  /**
   * Preparar mensaje y datos de derivación
   */
  private async prepararDerivacion(
    estado: EstadoEvaluado,
    contexto: ContextoConversacion
  ): Promise<AccionProcesada> {
    if (!estado.area_destino) {
      return this.generarError(estado, contexto);
    }

    // Obtener nombre amigable del área
    const nombreArea = obtenerNombreArea(estado.area_destino as any);

    const mensajeDerivacion = `✅ Te hemos derivado a ${nombreArea}.

Un agente humano te responderá a la brevedad. Si necesitás otra cosa, escribí MENU para volver al menú principal.`;

    return {
      tipo: 'derivacion',
      contenido: mensajeDerivacion,
      requiere_persistencia: true,
      datos_persistencia: {
        area_destino: estado.area_destino,
        subetiqueta: estado.subetiqueta,
        motivo: estado.razon || 'seleccion_menu',
        crear_ticket: true,
        actualizar_menu: {
          menu_actual: '',
          nivel_menu: 0,
        },
      },
      metadata: {
        area_origen: contexto.area_actual,
        area_destino: estado.area_destino,
        razon: estado.razon,
      },
    };
  }

  /**
   * Configurar continuación de conversación humana
   */
  private continuarConversacion(
    estado: EstadoEvaluado,
    contexto: ContextoConversacion
  ): AccionProcesada {
    // Sin respuesta automática, conversación humana continúa
    return {
      tipo: 'silencioso',
      contenido: '',
      requiere_persistencia: false,
      metadata: {
        razon: estado.razon,
        area_actual: contexto.area_actual,
      },
    };
  }

  /**
   * Generar mensaje de cortesía para anti-loop
   */
  private generarMensajeCortesia(
    estado: EstadoEvaluado,
    contexto: ContextoConversacion
  ): AccionProcesada {
    const nombresArea: Record<string, string> = {
      admin: 'Administración',
      alumnos: 'Alumnos',
      ventas: 'Inscripciones',
      comunidad: 'Comunidad',
      revisar: 'Revisar',
      wsp4: 'Atención General',
    };

    const nombreArea = nombresArea[contexto.area_actual] || contexto.area_actual;

    const mensajeCortesia = `Ya te derivamos a ${nombreArea}. 

Un agente humano te responderá pronto. Si necesitás cambiar de área, escribí MENU.`;

    return {
      tipo: 'mensaje',
      contenido: mensajeCortesia,
      requiere_persistencia: true,
      metadata: {
        razon: 'antiloop_cortesia',
        area_derivada: contexto.area_actual,
      },
    };
  }

  /**
   * Generar mensaje de timeout
   */
  private generarMensajeTimeout(
    estado: EstadoEvaluado,
    contexto: ContextoConversacion
  ): AccionProcesada {
    const mensajeTimeout = `⏰ La ventana de mensajería ha expirado.

Para continuar, escribí MENU y elegí una opción. Te ayudaremos a resolver tu consulta.`;

    return {
      tipo: 'mensaje',
      contenido: mensajeTimeout,
      requiere_persistencia: true,
      datos_persistencia: {
        actualizar_menu: {
          menu_actual: 'principal',
          nivel_menu: 0,
        },
      },
      metadata: {
        razon: 'timeout_24h',
        timeout_tipo: 'ventana_24h',
      },
    };
  }

  /**
   * Generar respuesta de error
   */
  private generarError(
    estado: EstadoEvaluado,
    contexto: ContextoConversacion
  ): AccionProcesada {
    const mensajeError = `❌ Ocurrió un error al procesar tu mensaje.

Por favor, intentá nuevamente o escribí MENU para volver al menú principal.`;

    return {
      tipo: 'error',
      contenido: mensajeError,
      requiere_persistencia: true,
      metadata: {
        razon: estado.razon || 'error_sistema',
        error_tipo: 'procesamiento',
      },
    };
  }
}


