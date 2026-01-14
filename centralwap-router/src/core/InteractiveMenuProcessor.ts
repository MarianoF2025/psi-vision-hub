// ===========================================
// PROCESADOR DE MENÚS INTERACTIVOS
// Versión 2.1.0 - Con base de datos
// ===========================================
import { supabase } from '../config/supabase';
import { InteractiveList } from '../config/interactive-menus';

export interface ProcesarInteractivoInput {
  listReplyId: string;
  telefono: string;
  conversacionId?: string;
  menuActual?: string;
}

export interface ProcesarInteractivoOutput {
  accion: 'mostrar_menu' | 'derivar' | 'inscripciones' | 'mostrar_cursos';
  menu?: InteractiveList;
  menuId?: string;
  derivacion?: {
    area: string;
    subetiqueta: string;
    mensaje_contexto: string;
  };
  mensajeConfirmacion?: string;
}

interface MenuConfig {
  id: string;
  nombre: string;
  header: string;
  body: string;
  footer: string;
  button_text: string;
  tipo_menu: string;
  activo: boolean;
}

interface MenuOpcion {
  id: string;
  menu_config_id: string;
  orden: number;
  opcion_id: string;
  emoji: string;
  titulo: string;
  descripcion: string;
  tipo_accion: string;
  submenu_id?: string;
  area_destino?: string;
  subetiqueta?: string;
  mensaje_contexto?: string;
  activo: boolean;
}

export class InteractiveMenuProcessor {
  private menuCache: Map<string, MenuConfig> = new Map();
  private opcionesCache: Map<string, MenuOpcion[]> = new Map();
  private lastCacheUpdate: Date = new Date(0);
  private readonly CACHE_DURATION = 60000; // 1 minuto

  constructor() {
    // Cargar cache inicial
    this.cargarMenusEnCache();
  }

  /**
   * Procesar respuesta de lista interactiva
   */
  async procesar(input: ProcesarInteractivoInput): Promise<ProcesarInteractivoOutput> {
    const { listReplyId } = input;
    console.log(`[InteractiveMenuProcessor] Procesando selección: ${listReplyId}`);
    
    // Actualizar cache si es necesario
    await this.actualizarCacheSiNecesario();
    
    // Obtener acción para este ID
    const accion = await this.obtenerAccion(listReplyId);
    
    if (!accion) {
      console.log(`[InteractiveMenuProcessor] ID no reconocido: ${listReplyId}, mostrando menú principal`);
      return await this.mostrarMenuPrincipal();
    }
    
    return await this.ejecutarAccion(accion, listReplyId);
  }

  /**
   * Actualizar cache si ha pasado el tiempo
   */
  private async actualizarCacheSiNecesario(): Promise<void> {
    const ahora = new Date();
    if (ahora.getTime() - this.lastCacheUpdate.getTime() > this.CACHE_DURATION) {
      await this.cargarMenusEnCache();
      this.lastCacheUpdate = ahora;
    }
  }

  /**
   * Cargar menús en cache
   */
  private async cargarMenusEnCache(): Promise<void> {
    try {
      const { data: menus, error: menuError } = await supabase
        .from('router_menu_config')
        .select('*')
        .eq('activo', true);

      if (menuError) {
        console.error('[InteractiveMenuProcessor] Error cargando menús:', menuError);
        return;
      }

      this.menuCache.clear();
      this.opcionesCache.clear();

      for (const menu of menus || []) {
        this.menuCache.set(menu.tipo_menu, menu);
        
        const { data: opciones, error: opcionesError } = await supabase
          .from('router_menu_opciones')
          .select('*')
          .eq('menu_config_id', menu.id)
          .eq('activo', true)
          .order('orden');

        if (!opcionesError && opciones) {
          this.opcionesCache.set(menu.tipo_menu, opciones);
        }
      }

      console.log(`[InteractiveMenuProcessor] Cache actualizado: ${this.menuCache.size} menús, ${this.opcionesCache.size} grupos de opciones`);
    } catch (error) {
      console.error('[InteractiveMenuProcessor] Error actualizando cache:', error);
    }
  }

  /**
   * Obtener acción desde cache o DB
   */
  private async obtenerAccion(listReplyId: string): Promise<MenuOpcion | null> {
    // Buscar en todas las opciones cacheadas
    for (const [_, opciones] of this.opcionesCache) {
      const opcion = opciones.find(o => o.opcion_id === listReplyId);
      if (opcion) {
        return opcion;
      }
    }

    // Si no está en cache, buscar en DB directamente
    const { data, error } = await supabase
      .from('router_menu_opciones')
      .select('*')
      .eq('opcion_id', listReplyId)
      .eq('activo', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Ejecutar acción según tipo
   */
  private async ejecutarAccion(accion: MenuOpcion, seleccionId: string): Promise<ProcesarInteractivoOutput> {
    switch (accion.tipo_accion) {
      case 'submenu':
        return await this.mostrarSubmenu(accion);
      
      case 'derivar':
        return this.derivar(accion);
      
      case 'cursos_dinamico':
        return this.mostrarCursosDinamicos();
      
      case 'volver':
        return await this.mostrarMenuPrincipal();
      
      default:
        return await this.mostrarMenuPrincipal();
    }
  }

  /**
   * Mostrar menú principal
   */
  async mostrarMenuPrincipal(): Promise<ProcesarInteractivoOutput> {
    const menu = await this.obtenerMenuInteractivo('principal');
    
    if (!menu) {
      console.error('[InteractiveMenuProcessor] No se pudo cargar el menú principal de la DB, usando fallback');
      // Fallback al menú hardcodeado si falla la DB
      return {
        accion: 'mostrar_menu',
        menu: this.getMenuPrincipalFallback(),
        menuId: 'principal'
      };
    }

    return {
      accion: 'mostrar_menu',
      menu: menu,
      menuId: 'principal'
    };
  }

  /**
   * Mostrar submenú
   */
  private async mostrarSubmenu(opcion: MenuOpcion): Promise<ProcesarInteractivoOutput> {
    if (!opcion.submenu_id) {
      return await this.mostrarMenuPrincipal();
    }

    // Obtener el tipo de menú del submenu_id
    const { data: submenuConfig, error } = await supabase
      .from('router_menu_config')
      .select('tipo_menu')
      .eq('id', opcion.submenu_id)
      .single();

    if (error || !submenuConfig) {
      console.log(`[InteractiveMenuProcessor] Submenú no encontrado: ${opcion.submenu_id}`);
      return await this.mostrarMenuPrincipal();
    }

    const menu = await this.obtenerMenuInteractivo(submenuConfig.tipo_menu);
    
    if (!menu) {
      console.log(`[InteractiveMenuProcessor] Submenú no encontrado: ${submenuConfig.tipo_menu}`);
      return await this.mostrarMenuPrincipal();
    }

    return {
      accion: 'mostrar_menu',
      menu: menu,
      menuId: submenuConfig.tipo_menu
    };
  }

  /**
   * Obtener menú interactivo desde cache/DB
   */
  private async obtenerMenuInteractivo(tipoMenu: string): Promise<InteractiveList | null> {
    await this.actualizarCacheSiNecesario();
    
    const menuConfig = this.menuCache.get(tipoMenu);
    const opciones = this.opcionesCache.get(tipoMenu);

    if (!menuConfig || !opciones || opciones.length === 0) {
      console.error(`[InteractiveMenuProcessor] Menú no encontrado o sin opciones: ${tipoMenu}`);
      return null;
    }

    // Construir lista interactiva
    const rows = opciones.map(opcion => {
      let titulo = opcion.titulo;
      if (opcion.emoji) {
        titulo = `${opcion.emoji} ${titulo}`;
      }
      
      return {
        id: opcion.opcion_id,
        title: titulo,
        description: opcion.descripcion || undefined
      };
    });

    return {
      header: menuConfig.header || menuConfig.nombre,
      body: menuConfig.body,
      footer: menuConfig.footer || 'Elegí una opción',
      buttonText: menuConfig.button_text || 'Ver opciones',
      sections: [{
        title: 'Opciones disponibles',
        rows: rows
      }]
    };
  }

  /**
   * Derivar a área específica
   */
  private derivar(opcion: MenuOpcion): ProcesarInteractivoOutput {
    return {
      accion: 'derivar',
      derivacion: {
        area: opcion.area_destino || 'admin',
        subetiqueta: opcion.subetiqueta || '',
        mensaje_contexto: opcion.mensaje_contexto || ''
      },
      mensajeConfirmacion: `✅ Te derivé al área de *${this.getNombreArea(opcion.area_destino || 'admin')}*` +
        (opcion.mensaje_contexto ? ` por *${opcion.mensaje_contexto}*` : '') +
        '.\n\nEn breve te van a responder. ¡Gracias por tu paciencia!'
    };
  }

  /**
   * Mostrar cursos dinámicos
   */
  private mostrarCursosDinamicos(): ProcesarInteractivoOutput {
    return {
      accion: 'mostrar_cursos'
    };
  }

  /**
   * Obtener nombre legible del área
   */
  private getNombreArea(area: string): string {
    const nombres: Record<string, string> = {
      'admin': 'Administración',
      'alumnos': 'Alumnos',
      'ventas': 'Ventas/Inscripciones',
      'comunidad': 'Comunidad PSI'
    };
    return nombres[area] || area;
  }

  /**
   * Menú principal de fallback (hardcodeado)
   */
  private getMenuPrincipalFallback(): InteractiveList {
    return {
      header: '¡Hola! 👋',
      body: '¡Bienvenidos a Asociación PSI!\n\n¿En qué podemos ayudarte hoy?',
      footer: 'Elegí una opción del menú',
      buttonText: 'Ver áreas',
      sections: [{
        title: 'Áreas de atención',
        rows: [
          { id: 'area_admin', title: '🏛️ Administración', description: 'Pagos, facturas, certificados' },
          { id: 'area_alumnos', title: '🎓 Alumnos', description: 'Campus, clases, recursos' },
          { id: 'area_inscripciones', title: '📝 Inscripciones', description: 'Cursos, precios, promos' },
          { id: 'area_comunidad', title: '👥 Comunidad PSI', description: 'Vivos, grabaciones, eventos' },
          { id: 'area_otra', title: '💬 Otra consulta', description: 'Hablar con una persona' }
        ]
      }]
    };
  }

  /**
   * Verificar si es selección de curso
   */
  esCurso(listReplyId: string): boolean {
    return listReplyId.startsWith('curso_');
  }

  /**
   * Procesar selección de curso
   */
  procesarCurso(listReplyId: string): ProcesarInteractivoOutput {
    const codigoCurso = listReplyId.replace('curso_', '').toUpperCase();
    
    return {
      accion: 'derivar',
      derivacion: {
        area: 'ventas',
        subetiqueta: 'info_curso',
        mensaje_contexto: `Info sobre curso ${codigoCurso}`
      },
      mensajeConfirmacion: `✅ Te derivé a *Inscripciones* para brindarte información sobre el curso *${codigoCurso}*.\n\nEn breve te van a responder. ¡Gracias por tu paciencia!`
    };
  }

  /**
   * Verificar si es comando especial
   */
  esComandoEspecial(mensaje: string): string | null {
    const mensajeUpper = mensaje.toUpperCase().trim();
    
    // Comandos reconocidos
    if (mensajeUpper === 'MENU' || mensajeUpper === 'MENÚ' || mensajeUpper === '0') {
      return 'MENU';
    }
    if (mensajeUpper === 'VOLVER' || mensajeUpper === 'ATRAS' || mensajeUpper === 'ATRÁS') {
      return 'VOLVER';
    }
    
    return null;
  }
}

// Crear instancia singleton para compatibilidad
export const interactiveMenuProcessor = new InteractiveMenuProcessor();
