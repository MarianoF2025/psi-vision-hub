// ===========================================
// PROCESADOR DE MENÚS INTERACTIVOS
// Versión 1.0.0
// ===========================================

import {
  obtenerMenuInteractivo,
  obtenerAccion,
  AccionMenu,
  InteractiveList,
  MENU_PRINCIPAL_INTERACTIVO
} from '../config/interactive-menus';

export interface ProcesarInteractivoInput {
  listReplyId: string;  // ID de la opción seleccionada
  telefono: string;
  conversacionId?: string;
  menuActual?: string;
}

export interface ProcesarInteractivoOutput {
  accion: 'mostrar_menu' | 'derivar' | 'inscripciones';
  menu?: InteractiveList;
  menuId?: string;
  derivacion?: {
    area: string;
    subetiqueta: string;
    mensaje_contexto: string;
  };
  mensajeConfirmacion?: string;
}

export class InteractiveMenuProcessor {

  /**
   * Procesar respuesta de lista interactiva
   */
  procesar(input: ProcesarInteractivoInput): ProcesarInteractivoOutput {
    const { listReplyId } = input;
    
    console.log(`[InteractiveMenuProcessor] Procesando selección: ${listReplyId}`);

    // Obtener acción para este ID
    const accion = obtenerAccion(listReplyId);
    
    if (!accion) {
      console.log(`[InteractiveMenuProcessor] ID no reconocido: ${listReplyId}, mostrando menú principal`);
      return this.mostrarMenuPrincipal();
    }

    return this.ejecutarAccion(accion, listReplyId);
  }

  /**
   * Ejecutar acción según tipo
   */
  private ejecutarAccion(accion: AccionMenu, seleccionId: string): ProcesarInteractivoOutput {
    switch (accion.tipo) {
      case 'submenu':
        return this.mostrarSubmenu(accion.submenu!);
      
      case 'derivar':
        return this.derivar(accion);
      
      
      case 'volver':
        return this.mostrarMenuPrincipal();
      
      default:
        return this.mostrarMenuPrincipal();
    }
  }

  /**
   * Mostrar menú principal
   */
  mostrarMenuPrincipal(): ProcesarInteractivoOutput {
    return {
      accion: 'mostrar_menu',
      menu: MENU_PRINCIPAL_INTERACTIVO,
      menuId: 'principal'
    };
  }

  /**
   * Mostrar submenú
   */
  private mostrarSubmenu(submenuId: string): ProcesarInteractivoOutput {
    const menu = obtenerMenuInteractivo(submenuId);
    
    if (!menu) {
      console.log(`[InteractiveMenuProcessor] Submenú no encontrado: ${submenuId}`);
      return this.mostrarMenuPrincipal();
    }

    return {
      accion: 'mostrar_menu',
      menu: menu,
      menuId: submenuId
    };
  }

  /**
   * Derivar a área
   */
  private derivar(accion: AccionMenu): ProcesarInteractivoOutput {
    const areaLabels: Record<string, string> = {
      'admin': 'Administración',
      'alumnos': 'Alumnos',
      'comunidad': 'Comunidad PSI',
      'ventas': 'Inscripciones'
    };

    const areaLabel = areaLabels[accion.area!] || accion.area;

    return {
      accion: 'derivar',
      derivacion: {
        area: accion.area!,
        subetiqueta: accion.subetiqueta!,
        mensaje_contexto: accion.mensaje_contexto!
      },
      mensajeConfirmacion: `✅ Tu consulta sobre *${accion.mensaje_contexto}* fue derivada a *${areaLabel}*.\n\nEn breve te contactamos. Si necesitás otra cosa, escribí *MENU*.`
    };
  }

  /**
   * Redirigir a flujo de inscripciones (psi-automations)
   */
  private redirigirInscripciones(): ProcesarInteractivoOutput {
    return {
      accion: 'inscripciones',
      mensajeConfirmacion: '' // psi-automations manejará el mensaje
    };
  }

  /**
   * Generar menú inicial para nueva conversación
   */
  generarMenuInicial(): ProcesarInteractivoOutput {
    return this.mostrarMenuPrincipal();
  }

  /**
   * Verificar si es comando especial (MENU, VOLVER)
   */
  esComandoEspecial(mensaje: string): 'MENU' | 'VOLVER' | null {
    const limpio = mensaje.trim().toUpperCase();
    if (limpio === 'MENU') return 'MENU';
    if (limpio === 'VOLVER') return 'VOLVER';
    return null;
  }

  /**
   * Procesar comando especial
   */
  procesarComando(comando: 'MENU' | 'VOLVER', menuActual?: string): ProcesarInteractivoOutput {
    if (comando === 'MENU' || comando === 'VOLVER') {
      return this.mostrarMenuPrincipal();
    }
    return this.mostrarMenuPrincipal();
  }
}

export const interactiveMenuProcessor = new InteractiveMenuProcessor();
