// ===========================================
// MENU PROCESSOR - Lógica de Procesamiento
// Versión 2.0.0 - Con soporte para códigos de 2 dígitos
// ===========================================
import { 
  MENUS, 
  MenuOption, 
  generarTextoMenu, 
  buscarOpcion, 
  buscarOpcionPorCodigo,
  esComandoEspecial,
  obtenerMenuPadre 
} from '../config/menus';
import { RouterResponse, Conversacion, Area } from '../types/database';

export interface ProcesarMenuInput {
  mensaje: string;
  conversacion: Conversacion;
}

export interface ProcesarMenuOutput {
  accion: 'mostrar_menu' | 'mostrar_submenu' | 'derivar' | 'invalido';
  menuId?: string;
  textoRespuesta?: string;
  derivacion?: {
    area: Area;
    subetiqueta?: string;
    requiere_proxy: boolean;
    mensaje_cierre: string;
  };
  opcionSeleccionada?: string;
  nuevoRouterEstado?: string;
}

export class MenuProcessor {
  
  /**
   * Procesar mensaje entrante según estado del router
   */
  procesar(input: ProcesarMenuInput): ProcesarMenuOutput {
    const { mensaje, conversacion } = input;
    const mensajeLimpio = mensaje.trim();
    
    // 1. Verificar comandos especiales (case insensitive)
    const comando = esComandoEspecial(mensajeLimpio);
    
    if (comando === 'MENU') {
      return this.volverMenuPrincipal();
    }
    
    if (comando === 'VOLVER') {
      return this.volverMenuAnterior(conversacion.menu_actual || 'principal');
    }
    
    // 2. Verificar si es un código de 2 dígitos (11-46)
    // Los códigos de 2 dígitos pueden ser procesados desde cualquier menú
    if (/^\d{2}$/.test(mensajeLimpio)) {
      const resultadoCodigo = this.procesarCodigo2Digitos(mensajeLimpio);
      if (resultadoCodigo) {
        return resultadoCodigo;
      }
      // Si no es un código válido, continuar con el flujo normal
    }
    
    // 3. Procesar según menú actual
    const menuActual = conversacion.menu_actual || 'principal';
    const menu = MENUS[menuActual];
    
    if (!menu) {
      // Si no hay menú válido, mostrar principal
      return this.volverMenuPrincipal();
    }
    
    // 4. Buscar la opción seleccionada en el menú actual
    const opcion = buscarOpcion(menuActual, mensajeLimpio);
    
    if (!opcion) {
      // Opción no válida
      return {
        accion: 'invalido',
        textoRespuesta: `❌ No entendí tu respuesta. Por favor elegí una opción válida.\n\n${generarTextoMenu(menu)}`,
      };
    }
    
    // 5. Procesar la opción
    return this.procesarOpcion(opcion, menuActual);
  }
  
  /**
   * Procesar código de 2 dígitos (11-46)
   * Permite que el usuario escriba directamente el código sin navegar por menús
   */
  private procesarCodigo2Digitos(codigo: string): ProcesarMenuOutput | null {
    const resultado = buscarOpcionPorCodigo(codigo);
    
    if (!resultado) {
      return null; // No es un código válido, dejar que el flujo normal lo maneje
    }
    
    const { opcion, menuId } = resultado;
    
    // Si la opción tiene área, derivar directamente
    if (opcion.area) {
      return {
        accion: 'derivar',
        derivacion: {
          area: opcion.area,
          subetiqueta: opcion.subetiqueta,
          requiere_proxy: opcion.requiere_proxy,
          mensaje_cierre: opcion.mensaje_cierre || '✅ Tu consulta fue derivada. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
        },
        opcionSeleccionada: codigo,
        nuevoRouterEstado: 'derivado',
      };
    }
    
    return null;
  }
  
  /**
   * Procesar una opción seleccionada
   */
  private procesarOpcion(opcion: MenuOption, menuActual: string): ProcesarMenuOutput {
    // Si tiene submenú, mostrar submenú
    if (opcion.submenu) {
      const submenu = MENUS[opcion.submenu];
      
      if (!submenu) {
        console.error(`[MenuProcessor] Submenú no encontrado: ${opcion.submenu}`);
        return this.volverMenuPrincipal();
      }
      
      return {
        accion: 'mostrar_submenu',
        menuId: opcion.submenu,
        textoRespuesta: generarTextoMenu(submenu),
        opcionSeleccionada: opcion.opcion,
        nuevoRouterEstado: `submenu_${opcion.submenu}`,
      };
    }
    
    // Si tiene área de destino, derivar
    if (opcion.area) {
      return {
        accion: 'derivar',
        derivacion: {
          area: opcion.area,
          subetiqueta: opcion.subetiqueta,
          requiere_proxy: opcion.requiere_proxy,
          mensaje_cierre: opcion.mensaje_cierre || '✅ Tu consulta fue derivada. En breve te contactamos. Si necesitás otra cosa, escribí MENU.',
        },
        opcionSeleccionada: opcion.opcion,
        nuevoRouterEstado: 'derivado',
      };
    }
    
    // Si no tiene ni submenú ni área, volver al principal
    return this.volverMenuPrincipal();
  }
  
  /**
   * Volver al menú principal
   */
  private volverMenuPrincipal(): ProcesarMenuOutput {
    const menu = MENUS.principal;
    
    return {
      accion: 'mostrar_menu',
      menuId: 'principal',
      textoRespuesta: generarTextoMenu(menu),
      nuevoRouterEstado: 'menu_principal',
    };
  }
  
  /**
   * Volver al menú anterior
   */
  private volverMenuAnterior(menuActual: string): ProcesarMenuOutput {
    const menuPadre = obtenerMenuPadre(menuActual);
    const menu = MENUS[menuPadre];
    
    return {
      accion: 'mostrar_menu',
      menuId: menuPadre,
      textoRespuesta: generarTextoMenu(menu),
      nuevoRouterEstado: menuPadre === 'principal' ? 'menu_principal' : `submenu_${menuPadre}`,
    };
  }
  
  /**
   * Generar menú inicial para conversación nueva
   */
  generarMenuInicial(): ProcesarMenuOutput {
    return this.volverMenuPrincipal();
  }
  
  /**
   * Verificar si mensaje es solo saludo/agradecimiento (anti-loop)
   */
  esMensajeIgnorable(mensaje: string): boolean {
    const ignorables = [
      'gracias',
      'ok',
      'bueno',
      'dale',
      'perfecto',
      'genial',
      'listo',
      'si',
      'no',
      '👍',
      '🙏',
      '😊',
      '❤️',
    ];
    
    const limpio = mensaje.trim().toLowerCase();
    return ignorables.some(i => limpio === i || limpio.startsWith(i + ' '));
  }
  
  /**
   * Generar mensaje de anti-loop
   */
  generarMensajeAntiLoop(areaDerivada: string): string {
    return `Ya te derivamos a ${areaDerivada}. Si querés cambiar de área, escribí MENU.`;
  }
}

export const menuProcessor = new MenuProcessor();
