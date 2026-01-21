// ===========================================
// CONTACTO SERVICE - Esquema Real Supabase
// ===========================================
import { supabase } from '../config/supabase';
import { Contacto, ContactoInsert } from '../types/database';

export class ContactoService {

  /**
   * Buscar contacto por teléfono
   */
  async buscarPorTelefono(telefono: string): Promise<Contacto | null> {
    const telefonoNormalizado = this.normalizarTelefono(telefono);

    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('telefono', telefonoNormalizado)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('[ContactoService] Error buscando contacto:', error);
      throw error;
    }

    return data;
  }

  /**
   * Crear nuevo contacto
   */
  async crear(datos: ContactoInsert): Promise<Contacto> {
    const contactoData: ContactoInsert = {
      telefono: this.normalizarTelefono(datos.telefono),
      nombre: datos.nombre || null,
      email: datos.email || null,
      origen: datos.origen || 'whatsapp',
      activo: datos.activo ?? true,
      utm_source: datos.utm_source || null,
      utm_campaign: datos.utm_campaign || null,
      etiquetas: datos.etiquetas || [],
    };

    const { data, error } = await supabase
      .from('contactos')
      .insert(contactoData)
      .select()
      .single();

    if (error) {
      console.error('[ContactoService] Error creando contacto:', error);
      throw error;
    }

    console.log(`[ContactoService] Contacto creado: ${data.id}`);
    return data;
  }

  /**
   * Actualizar contacto existente
   */
  async actualizar(id: string, datos: Partial<ContactoInsert>): Promise<Contacto> {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (datos.nombre !== undefined) updateData.nombre = datos.nombre;
    if (datos.email !== undefined) updateData.email = datos.email;
    if (datos.notas !== undefined) updateData.notas = datos.notas;
    if (datos.origen !== undefined) updateData.origen = datos.origen;
    if (datos.activo !== undefined) updateData.activo = datos.activo;
    if (datos.utm_source !== undefined) updateData.utm_source = datos.utm_source;
    if (datos.utm_campaign !== undefined) updateData.utm_campaign = datos.utm_campaign;
    if (datos.etiquetas !== undefined) updateData.etiquetas = datos.etiquetas;

    const { data, error } = await supabase
      .from('contactos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ContactoService] Error actualizando contacto:', error);
      throw error;
    }

    return data;
  }

  /**
   * Obtener o crear contacto (upsert manual)
   * Como n8n no tiene upsert, usamos esta lógica
   */
  async obtenerOCrear(datos: ContactoInsert): Promise<{ contacto: Contacto; esNuevo: boolean }> {
    const telefonoNormalizado = this.normalizarTelefono(datos.telefono);

    // 1. Buscar existente
    const existente = await this.buscarPorTelefono(telefonoNormalizado);

    if (existente) {
      // 2a. Si existe, actualizar campos si vienen nuevos datos
      const actualizaciones: Partial<ContactoInsert> = {};

      if (datos.nombre && !existente.nombre) {
        actualizaciones.nombre = datos.nombre;
      }
      if (datos.utm_source && !existente.utm_source) {
        actualizaciones.utm_source = datos.utm_source;
      }
      if (datos.utm_campaign && !existente.utm_campaign) {
        actualizaciones.utm_campaign = datos.utm_campaign;
      }

      if (Object.keys(actualizaciones).length > 0) {
        const actualizado = await this.actualizar(existente.id, actualizaciones);
        return { contacto: actualizado, esNuevo: false };
      }

      return { contacto: existente, esNuevo: false };
    }

    // 2b. Si no existe, crear nuevo
    const nuevo = await this.crear({
      ...datos,
      telefono: telefonoNormalizado,
    });

    return { contacto: nuevo, esNuevo: true };
  }

  /**
   * Normalizar teléfono a formato E.164
   * Argentina: +54 9 11 XXXX-XXXX
   */
  normalizarTelefono(telefono: string): string {
    // Remover todo excepto números
    let limpio = telefono.replace(/\D/g, '');

    // Si empieza con 54 y tiene 13 dígitos, ya está en formato correcto
    if (limpio.startsWith('54') && limpio.length === 13) {
      return '+' + limpio;
    }

    // Si empieza con 549 y tiene 12 dígitos (sin el 15)
    if (limpio.startsWith('549') && limpio.length === 12) {
      return '+' + limpio;
    }

    // Si empieza con 15 (celular argentino local)
    if (limpio.startsWith('15') && limpio.length === 10) {
      return '+5491' + limpio.substring(2);
    }

    // Si empieza con 11 (Buenos Aires sin 15)
    if (limpio.startsWith('11') && limpio.length === 10) {
      return '+549' + limpio;
    }

    // Si no tiene código país, asumir Argentina
    if (!limpio.startsWith('54') && limpio.length === 10) {
      return '+549' + limpio;
    }

    // Default: agregar + si no lo tiene
    return limpio.startsWith('+') ? limpio : '+' + limpio;
  }

  /**
   * Agregar etiqueta a contacto
   */
  async agregarEtiqueta(id: string, etiqueta: string): Promise<Contacto> {
    const contacto = await this.buscarPorId(id);
    if (!contacto) {
      throw new Error(`Contacto ${id} no encontrado`);
    }

    const etiquetasActuales = contacto.etiquetas || [];
    if (!etiquetasActuales.includes(etiqueta)) {
      etiquetasActuales.push(etiqueta);
    }

    return this.actualizar(id, { etiquetas: etiquetasActuales });
  }

  /**
   * Buscar contacto por ID
   */
  async buscarPorId(id: string): Promise<Contacto | null> {
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[ContactoService] Error buscando contacto por ID:', error);
      throw error;
    }

    return data;
  }
}

export const contactoService = new ContactoService();
