import { config } from '../config/environment';
import { logger, logWithRequestId } from '../utils/logger';
import { ContextoConversacion, EstadoEvaluado, CentralwapConfig } from '../types';

/**
 * RESPONSABILIDADES CRÍTICAS:
 * ✅ Verificar timeouts (24h WhatsApp, 72h Meta, anti-loop 15min)
 * ✅ Evaluar si está desconectado de WSP4 (funcionalidad crítica PSI)
 * ✅ Procesar comandos especiales (MENU, VOLVER)
 * ✅ Detectar opciones numéricas de menú (1-5)
 * ✅ Aplicar lógica de anti-loop para mensajes de cortesía
 * ✅ Determinar acción según área actual y contexto
 * ✅ Generar metadata de debugging para troubleshooting
 */
export class EvaluadorEstado {
  constructor(
    private sistemaConfig = config.sistema,
    private appLogger = logger
  ) {}

  /**
   * MÉTODO PRINCIPAL - Evaluar estado de conversación
   */
  async evaluarEstado(
    contexto: ContextoConversacion,
    mensajeEntrante: string
  ): Promise<EstadoEvaluado> {
    const startTime = Date.now();
    const mensaje = mensajeEntrante.trim();

    try {
      this.appLogger.debug('Evaluando estado', {
        conversacionId: contexto.id,
        telefono: contexto.telefono,
        areaActual: contexto.area_actual,
        estado: contexto.estado,
        mensaje: mensaje.substring(0, 50),
        desconectadoWSP4: contexto.desconectado_wsp4,
      });

      // 1. VERIFICAR TIMEOUTS CRÍTICOS
      const timeoutInfo = this.verificarTimeouts(contexto);

      // 2. VERIFICAR ANTI-LOOP (15 MINUTOS)
      const antiloopActivo = this.verificarAntiloop(contexto);

      // 3. VERIFICAR PROXY ACTIVO (PRIORIDAD ALTA - REDIRECCIÓN AUTOMÁTICA)
      if (contexto.proxy_activo && contexto.area_proxy) {
        // Si el proxy está activo, redirigir automáticamente al área proxy
        // Sin mostrar menús ni procesar comandos (excepto MENU que desactiva proxy)
        const comandoEspecial = this.procesarComandosEspeciales(mensaje);
        
        // Permitir comando MENU para desactivar proxy
        if (comandoEspecial && (mensaje.toUpperCase() === 'MENU' || mensaje.toUpperCase() === 'MENÚ')) {
          return {
            ...comandoEspecial,
            antiloop_activo: antiloopActivo,
            timeout_activo: timeoutInfo.timeout_activo,
            metadata: {
              ...comandoEspecial.metadata,
              desactivar_proxy: true, // Indicar que se debe desactivar proxy
            },
          };
        }

        // Proxy activo: continuar conversación en área destino (sin respuesta automática)
        this.appLogger.info('Proxy activo, mensaje redirigido automáticamente a área proxy', {
          conversacionId: contexto.id,
          areaProxy: contexto.area_proxy,
          mensaje: mensaje.substring(0, 50),
        });

        return {
          accion: 'continuar_conversacion',
          requiere_derivacion: false,
          es_mensaje_automatico: false,
          antiloop_activo: antiloopActivo,
          timeout_activo: timeoutInfo.timeout_activo,
          razon: 'proxy_activo_redireccion_automatica',
          metadata: {
            area_proxy: contexto.area_proxy,
            proxy_activo: true,
          },
        };
      }

      // 4. VERIFICAR DESCONEXIÓN WSP4 (FUNCIONALIDAD CRÍTICA PSI)
      if (contexto.desconectado_wsp4 && contexto.area_actual !== 'wsp4') {
        this.appLogger.info('Conversación desconectada de WSP4, derivando directamente', {
          conversacionId: contexto.id,
          areaActual: contexto.area_actual,
        });

        return {
          accion: 'derivar',
          area_destino: contexto.area_actual,
          subetiqueta: contexto.subetiqueta,
          requiere_derivacion: true,
          es_mensaje_automatico: false,
          antiloop_activo: antiloopActivo,
          timeout_activo: timeoutInfo.timeout_activo,
          razon: 'conversacion_desconectada_wsp4',
        };
      }

      // 5. COMANDOS ESPECIALES (PRIORIDAD MÁXIMA)
      const comandoEspecial = this.procesarComandosEspeciales(mensaje);
      if (comandoEspecial) {
        this.appLogger.info('Comando especial detectado', {
          conversacionId: contexto.id,
          comando: mensaje,
          accion: comandoEspecial.accion,
        });

        return {
          ...comandoEspecial,
          antiloop_activo: antiloopActivo,
          timeout_activo: timeoutInfo.timeout_activo,
        };
      }

      // 6. ANTI-LOOP: MENSAJES DE CORTESÍA
      if (antiloopActivo && this.esMensajeCortesia(mensaje)) {
        this.appLogger.info('Anti-loop activo, enviando mensaje de cortesía', {
          conversacionId: contexto.id,
          minutosDesdeDerivacion: this.getMinutosDesdeDerivacion(contexto),
        });

        return {
          accion: 'mensaje_cortesia',
          requiere_derivacion: false,
          es_mensaje_automatico: true,
          antiloop_activo: true,
          timeout_activo: timeoutInfo.timeout_activo,
          razon: 'antiloop_cortesia',
          metadata: { area_derivada: contexto.area_actual },
        };
      }

      // 7. OPCIONES NUMÉRICAS DE MENÚ
      if (this.esOpcionMenu(mensaje)) {
        const opcionMenu = this.procesarOpcionMenu(mensaje, contexto, timeoutInfo.timeout_activo);
        if (opcionMenu) {
          this.appLogger.info('Opción de menú procesada', {
            conversacionId: contexto.id,
            opcion: mensaje,
            accion: opcionMenu.accion,
            areaDestino: opcionMenu.area_destino,
          });

          return opcionMenu;
        }
      }

      // 8. LÓGICA POR ÁREA ACTUAL
      const evaluacionPorArea = this.evaluarPorArea(
        contexto,
        mensaje,
        timeoutInfo.timeout_activo,
        antiloopActivo
      );

      const processingTime = Date.now() - startTime;
      this.appLogger.debug('Estado evaluado', {
        conversacionId: contexto.id,
        accion: evaluacionPorArea.accion,
        requiereDerivacion: evaluacionPorArea.requiere_derivacion,
        processingTimeMs: processingTime,
      });

      return evaluacionPorArea;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.appLogger.error('Error evaluando estado', {
        conversacionId: contexto.id,
        error: error instanceof Error ? error.message : 'Error desconocido',
        processingTimeMs: processingTime,
      });

      return {
        accion: 'error',
        requiere_derivacion: false,
        es_mensaje_automatico: false,
        antiloop_activo: false,
        timeout_activo: false,
        razon: 'error_sistema',
      };
    }
  }

  // MÉTODOS AUXILIARES

  /**
   * Verificar timeouts críticos del sistema
   */
  private verificarTimeouts(contexto: ContextoConversacion) {
    const now = Date.now();
    let timeout_24h_activo = false;
    let timeout_72h_activo = false;

    // Verificar timeout 24h WhatsApp
    if (contexto.countdown_24h) {
      const tiempoRestante = contexto.countdown_24h.getTime() - now;
      if (tiempoRestante <= 0) {
        timeout_24h_activo = true;
      }
    }

    // Verificar timeout 72h Meta (solo para leads Meta)
    if (contexto.es_lead_meta && contexto.ts_ventana_72h_fin) {
      const tiempoRestante72h = contexto.ts_ventana_72h_fin.getTime() - now;
      if (tiempoRestante72h <= 0) {
        timeout_72h_activo = true;
      }
    }

    return {
      timeout_activo: timeout_24h_activo || timeout_72h_activo,
      timeout_24h_activo,
      timeout_72h_activo,
    };
  }

  /**
   * Verificar si está en período de anti-loop (15 min)
   */
  private verificarAntiloop(contexto: ContextoConversacion): boolean {
    if (!contexto.ts_ultima_derivacion) {
      return false;
    }

    const minutosDesdeDerivacion = this.getMinutosDesdeDerivacion(contexto);
    return minutosDesdeDerivacion < this.sistemaConfig.antiloop_minutos;
  }

  /**
   * Procesar comandos especiales MENU y VOLVER
   */
  private procesarComandosEspeciales(mensaje: string): EstadoEvaluado | null {
    const mensajeUpper = mensaje.toUpperCase().trim();

    // Comando MENU
    if (mensajeUpper === 'MENU' || mensajeUpper === 'MENÚ') {
      return {
        accion: 'mostrar_menu',
        menu_a_mostrar: 'principal',
        requiere_derivacion: false,
        es_mensaje_automatico: true,
        antiloop_activo: false,
        timeout_activo: false,
        razon: 'comando_menu',
      };
    }

    // Comando VOLVER
    if (mensajeUpper === 'VOLVER' || mensajeUpper === 'ATRAS' || mensajeUpper === 'ATRÁS') {
      return {
        accion: 'mostrar_menu',
        menu_a_mostrar: 'principal',
        requiere_derivacion: false,
        es_mensaje_automatico: true,
        antiloop_activo: false,
        timeout_activo: false,
        razon: 'comando_volver',
      };
    }

    return null;
  }

  /**
   * Detectar mensajes de cortesía para anti-loop
   */
  private esMensajeCortesia(mensaje: string): boolean {
    const mensajeLower = mensaje.toLowerCase().trim();
    const cortesias = [
      'ok',
      'okay',
      'gracias',
      'grax',
      'thx',
      'perfecto',
      'genial',
      'listo',
      'dale',
      '👍',
      '✅',
      '👌',
    ];

    return cortesias.some((cortesia) => mensajeLower.includes(cortesia));
  }

  /**
   * Verificar si es opción numérica de menú
   */
  private esOpcionMenu(mensaje: string): boolean {
    const numero = parseInt(mensaje.trim(), 10);
    return !isNaN(numero) && numero >= 1 && numero <= 5;
  }

  /**
   * Procesar opción numérica de menú
   */
  private procesarOpcionMenu(
    mensaje: string,
    contexto: ContextoConversacion,
    timeoutActivo: boolean
  ): EstadoEvaluado | null {
    const opcion = parseInt(mensaje.trim(), 10);

    // Mapeo de opciones del menú principal
    const opcionesMenu: Record<number, { area: string; subetiqueta?: string }> = {
      1: { area: 'admin', subetiqueta: 'administracion' },
      2: { area: 'alumnos', subetiqueta: 'alumnos' },
      3: { area: 'ventas', subetiqueta: 'inscripciones' },
      4: { area: 'comunidad', subetiqueta: 'comunidad' },
      5: { area: 'revisar', subetiqueta: 'revisar' },
    };

    const seleccion = opcionesMenu[opcion];
    if (!seleccion) {
      return null;
    }

    // Si ya está en el área seleccionada, solo mostrar mensaje informativo
    if (contexto.area_actual === seleccion.area) {
      return {
        accion: 'continuar_conversacion',
        requiere_derivacion: false,
        es_mensaje_automatico: false,
        antiloop_activo: false,
        timeout_activo: timeoutActivo,
        razon: 'ya_en_area_seleccionada',
      };
    }

    // Derivar a área seleccionada
    return {
      accion: 'derivar',
      area_destino: seleccion.area as any,
      subetiqueta: seleccion.subetiqueta,
      requiere_derivacion: true,
      es_mensaje_automatico: false,
      antiloop_activo: false,
      timeout_activo: timeoutActivo,
      razon: 'opcion_menu_seleccionada',
      metadata: { opcion_menu: opcion },
    };
  }

  /**
   * Evaluar acción según área actual
   */
  private evaluarPorArea(
    contexto: ContextoConversacion,
    mensaje: string,
    timeoutActivo: boolean,
    antiloopActivo: boolean
  ): EstadoEvaluado {
    // Si está en WSP4 (área principal), mostrar menú
    if (contexto.area_actual === 'wsp4') {
      return {
        accion: 'mostrar_menu',
        menu_a_mostrar: 'principal',
        requiere_derivacion: false,
        es_mensaje_automatico: true,
        antiloop_activo: antiloopActivo,
        timeout_activo: timeoutActivo,
        razon: 'area_wsp4_mostrar_menu',
      };
    }

    // Si está en otra área, continuar conversación humana
    return {
      accion: 'continuar_conversacion',
      requiere_derivacion: false,
      es_mensaje_automatico: false,
      antiloop_activo: antiloopActivo,
      timeout_activo: timeoutActivo,
      razon: 'continuar_conversacion_humana',
    };
  }

  private getMinutosDesdeDerivacion(contexto: ContextoConversacion): number {
    if (!contexto.ts_ultima_derivacion) {
      return 999; // Retornar valor alto si no hay derivación previa
    }
    const diff = Date.now() - contexto.ts_ultima_derivacion.getTime();
    return diff / (1000 * 60);
  }
}


