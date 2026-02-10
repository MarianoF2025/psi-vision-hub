import { Request, Response } from 'express';
import axios from 'axios';
import { supabase } from '../config/supabase';
import { whatsAppService } from '../services/WhatsAppService';
import { ApiResponse, EnviarMenuRequest, ProcesarSeleccionRequest, Curso, MenuOpcion, MenuSesion } from '../types';

export class MenuController {

  private normalizarTelefono(telefono: string): string {
    let tel = telefono.replace(/\s+/g, '').replace(/-/g, '');
    if (!tel.startsWith('+')) tel = '+' + tel;
    return tel;
  }

  private calcularVentanas(esCTWA: boolean) {
    const ahora = new Date();
    if (esCTWA) {
      const fin72h = new Date(ahora.getTime() + 72 * 60 * 60 * 1000);
      return { ventana_24h_activa: false, ventana_24h_inicio: null, ventana_24h_fin: null, ventana_72h_activa: true, ventana_72h_inicio: ahora.toISOString(), ventana_72h_fin: fin72h.toISOString() };
    }
    const fin24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    return { ventana_24h_activa: true, ventana_24h_inicio: ahora.toISOString(), ventana_24h_fin: fin24h.toISOString(), ventana_72h_activa: false, ventana_72h_inicio: null, ventana_72h_fin: null };
  }

  private async obtenerOCrearContacto(telefono: string, nombre?: string): Promise<{ id: string; nombre: string | null }> {
    const telNormalizado = this.normalizarTelefono(telefono);
    const { data: existente } = await supabase.from('contactos').select('id, nombre').eq('telefono', telNormalizado).single();
    if (existente) {
      if (!existente.nombre && nombre) {
        await supabase.from('contactos').update({ nombre, updated_at: new Date().toISOString() }).eq('id', existente.id);
        return { id: existente.id, nombre };
      }
      return { id: existente.id, nombre: existente.nombre };
    }
    const { data: nuevo, error } = await supabase.from('contactos').insert({ telefono: telNormalizado, nombre: nombre || null, origen: 'whatsapp', tipo: 'lead', activo: true }).select('id, nombre').single();
    if (error || !nuevo) throw new Error(`No se pudo crear el contacto: ${error?.message}`);
    return { id: nuevo.id, nombre: nuevo.nombre };
  }

  private async fijarConversacionEnVentas(telefono: string, motivo: string, nombreContacto?: string, esCTWA: boolean = false): Promise<void> {
    const telNormalizado = this.normalizarTelefono(telefono);
    const contacto = await this.obtenerOCrearContacto(telefono, nombreContacto);
    const ventanas = this.calcularVentanas(esCTWA);
    let conversacionId: string | null = null;

    const { data: conv } = await supabase.from('conversaciones').select('id').eq('telefono', telNormalizado).single();
    if (conv) {
      conversacionId = conv.id;
      await supabase.from('conversaciones').update({
        contacto_id: contacto.id, nombre: contacto.nombre, linea_origen: 'ventas_api', area: 'ventas_api',
        desconectado_wsp4: true, inbox_fijo: 'ventas_api', desconectado_por: esCTWA ? 'automatizacion_ctwa' : 'automatizacion_entrada_directa',
        desconectado_ts: new Date().toISOString(), desconectado_motivo: motivo, ...ventanas, updated_at: new Date().toISOString()
      }).eq('id', conv.id);
    } else {
      const { data: newConv } = await supabase.from('conversaciones').insert({
        telefono: telNormalizado, contacto_id: contacto.id, nombre: contacto.nombre, linea_origen: 'ventas_api', area: 'ventas_api',
        canal: 'whatsapp', estado: 'activa', desconectado_wsp4: true, inbox_fijo: 'ventas_api',
        desconectado_por: esCTWA ? 'automatizacion_ctwa' : 'automatizacion_entrada_directa',
        desconectado_ts: new Date().toISOString(), desconectado_motivo: motivo, ...ventanas
      }).select().single();
      if (newConv) conversacionId = newConv.id;
    }

    if (conversacionId) {
      await supabase.from('mensajes').insert({ conversacion_id: conversacionId, mensaje: `🤖 ${motivo}`, tipo: 'text', direccion: 'entrante', remitente_tipo: 'sistema', remitente_nombre: `Sistema ${esCTWA ? 'CTWA' : 'Ventas'}` });
      await supabase.from('conversaciones').update({ ultimo_mensaje: `🤖 ${motivo}`, ts_ultimo_mensaje: new Date().toISOString() }).eq('id', conversacionId);
    }
  }

  private extraerSufijoWamid(wamid: string): string | null {
    try {
      const base64Part = wamid.replace('wamid.', '');
      const decoded = Buffer.from(base64Part, 'base64').toString('binary');
      const separatorIndex = decoded.indexOf('\x15\x02\x00\x11\x18\x12');
      if (separatorIndex !== -1) return decoded.substring(separatorIndex + 6).replace(/\x00/g, '');
      return decoded.slice(-20).replace(/[\x00-\x1f]/g, '');
    } catch { return null; }
  }

  private async buscarMensajePorSufijo(sufijo: string): Promise<{ id: string; conversacion_id: string } | null> {
    const { data: directMatch } = await supabase.from('mensajes').select('id, conversacion_id').eq('whatsapp_message_id', sufijo).single();
    if (directMatch) return directMatch;
    const { data: mensajes } = await supabase.from('mensajes').select('id, conversacion_id, whatsapp_message_id').not('whatsapp_message_id', 'is', null).order('created_at', { ascending: false }).limit(100);
    if (!mensajes) return null;
    for (const msg of mensajes) {
      if (msg.whatsapp_message_id && this.extraerSufijoWamid(msg.whatsapp_message_id) === sufijo) return { id: msg.id, conversacion_id: msg.conversacion_id };
    }
    return null;
  }

  private async procesarReaccion(req: Request, res: Response): Promise<void> {
    const mensaje = req.body.messages?.[0];
    const emoji = req.body.emoji || mensaje?.reaction?.emoji || '';
    const reactionMessageId = req.body.wamid || mensaje?.reaction?.message_id;
    if (!reactionMessageId) { res.json({ success: true, message: 'Reacción ignorada' }); return; }
    const sufijo = this.extraerSufijoWamid(reactionMessageId);
    if (!sufijo) { res.json({ success: false, message: 'No se pudo procesar el ID' }); return; }
    const mensajeOriginal = await this.buscarMensajePorSufijo(sufijo);
    if (!emoji) {
      if (mensajeOriginal) await supabase.from('mensaje_reacciones').delete().eq('mensaje_id', mensajeOriginal.id).is('usuario_id', null);
      res.json({ success: true, message: 'Reacción eliminada' }); return;
    }
    if (!mensajeOriginal) { res.json({ success: false, message: 'Mensaje no encontrado' }); return; }
    const { data: existe } = await supabase.from('mensaje_reacciones').select('id').eq('mensaje_id', mensajeOriginal.id).is('usuario_id', null).single();
    if (existe) await supabase.from('mensaje_reacciones').update({ emoji }).eq('id', existe.id);
    else await supabase.from('mensaje_reacciones').insert({ mensaje_id: mensajeOriginal.id, emoji, usuario_id: null });
    res.json({ success: true, message: 'Reacción procesada' });
  }

  private async buscarMensajeCitadoId(whatsappContextId: string): Promise<string | null> {
    if (!whatsappContextId) return null;
    const sufijo = this.extraerSufijoWamid(whatsappContextId);
    if (sufijo) { const msg = await this.buscarMensajePorSufijo(sufijo); if (msg) return msg.id; }
    const { data } = await supabase.from('mensajes').select('id').eq('whatsapp_message_id', whatsappContextId).single();
    return data?.id || null;
  }

  private async crearOActualizarSesion(datos: { telefono: string; curso_id?: string; config_ctwa_id?: string; ad_id?: string; ctwa_clid?: string; conversacion_id?: string; mensaje_inicial?: string; origen?: string; }): Promise<string | null> {
    const telNormalizado = this.normalizarTelefono(datos.telefono);
    const ahora = new Date().toISOString();

    const { data: existe } = await supabase.from('menu_sesiones').select('id, interacciones').eq('telefono', telNormalizado).eq('estado', 'activo').single();

    if (existe) {
      const upd: any = { ultima_actividad: ahora, updated_at: ahora };
      if (datos.curso_id) upd.curso_id = datos.curso_id;
      if (datos.config_ctwa_id) upd.config_ctwa_id = datos.config_ctwa_id;
      if (datos.ad_id) upd.ad_id = datos.ad_id;
      if (datos.ctwa_clid) upd.ctwa_clid = datos.ctwa_clid;
      if (datos.conversacion_id) upd.conversacion_id = datos.conversacion_id;
      await supabase.from('menu_sesiones').update(upd).eq('id', existe.id);
      console.log(`[Sesión] ✏️ Actualizada: ${telNormalizado}`);
      return existe.id;
    }

    const ins: any = { telefono: telNormalizado, estado: 'activo', interacciones: 0, ultima_actividad: ahora };
    if (datos.curso_id) ins.curso_id = datos.curso_id;
    if (datos.config_ctwa_id) ins.config_ctwa_id = datos.config_ctwa_id;
    if (datos.ad_id) ins.ad_id = datos.ad_id;
    if (datos.ctwa_clid) ins.ctwa_clid = datos.ctwa_clid;
    if (datos.conversacion_id) ins.conversacion_id = datos.conversacion_id;
    if (datos.mensaje_inicial) ins.mensaje_inicial = datos.mensaje_inicial;
    if (datos.origen) ins.origen = datos.origen; else ins.origen = 'ctwa';

    const { data: nueva, error } = await supabase.from('menu_sesiones').insert(ins).select('id').single();
    if (error) { console.error('[Sesión] Error:', error); return null; }
    console.log(`[Sesión] ✅ Creada: ${telNormalizado}${datos.curso_id ? ` curso:${datos.curso_id}` : ''}`);
    return nueva?.id || null;
  }

  private async incrementarInteracciones(telefono: string, cursoId?: string): Promise<void> {
    const telNormalizado = this.normalizarTelefono(telefono);
    const { data: sesion } = await supabase.from('menu_sesiones').select('id, interacciones').eq('telefono', telNormalizado).eq('estado', 'activo').single();
    if (sesion) {
      await supabase.from('menu_sesiones').update({ interacciones: (sesion.interacciones || 0) + 1, ultima_actividad: new Date().toISOString() }).eq('id', sesion.id);
    } else if (cursoId) {
      await this.crearOActualizarSesion({ telefono: telNormalizado, curso_id: cursoId });
    }
  }

  // =============================================
  // DETECTAR MENSAJE WEB Y MATCHEAR CURSO
  // =============================================
  private normalizarTexto(texto: string): string {
    return texto
      .toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
      .replace(/[^A-Z0-9\s]/g, ' ') // solo letras, números, espacios
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extraerNombreCursoDeWeb(mensaje: string): string | null {
    // Patrón: "sobre el curso [NOMBRE] en la web"
    const match = mensaje.match(/sobre el curso\s+(.+?)\s+en la web/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  }

  private async matchearCursoPorNombre(nombreWeb: string): Promise<Curso | null> {
    const nombreNorm = this.normalizarTexto(nombreWeb);
    console.log(`[Web Match] Buscando curso para: "${nombreNorm}"`);

    // 1. Buscar nombres base en cursos_cohortes (los más limpios)
    const { data: cohortes } = await supabase
      .from('cursos_cohortes')
      .select('curso_codigo, nombre')
      .order('cohorte_anio', { ascending: false });

    if (cohortes) {
      // Agrupar por curso_codigo, quedarnos con el nombre más reciente
      const nombresPorCodigo: Record<string, string> = {};
      for (const c of cohortes) {
        if (!nombresPorCodigo[c.curso_codigo]) {
          // Limpiar: quitar "Curso ", "ATF - ", y la fecha al final (- Mes Año)
          let nombreLimpio = c.nombre
            .replace(/^(Curso|ATF\s*-\s*Curso|Curso de)\s+/i, '')
            .replace(/\s*-\s*(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+\d{4}\s*$/i, '')
            .replace(/\s*-\s*ON DEMAND\s*$/i, '')
            .trim();
          nombresPorCodigo[c.curso_codigo] = nombreLimpio;
        }
      }

      // Buscar match: el nombre de la web debe coincidir con algún nombre de cohorte
      let mejorMatch: { codigo: string; score: number } | null = null;

      for (const [codigo, nombre] of Object.entries(nombresPorCodigo)) {
        const cohorteNorm = this.normalizarTexto(nombre);
        if (!cohorteNorm) continue;

        // Match exacto
        if (nombreNorm === cohorteNorm) {
          console.log(`[Web Match] ✅ Match exacto cohorte: "${nombre}" → ${codigo}`);
          mejorMatch = { codigo, score: 1000 };
          break;
        }

        // Match parcial: el nombre web contiene el de cohorte o viceversa
        if (nombreNorm.includes(cohorteNorm) || cohorteNorm.includes(nombreNorm)) {
          // Score = longitud del match (preferir matches más largos para evitar falsos positivos)
          const score = cohorteNorm.length;
          if (!mejorMatch || score > mejorMatch.score) {
            mejorMatch = { codigo, score };
            console.log(`[Web Match] 🔍 Match parcial cohorte: "${nombre}" → ${codigo} (score: ${score})`);
          }
        }
      }

      if (mejorMatch) {
        // Buscar el curso en tabla cursos por codigo
        const { data: curso } = await supabase
          .from('cursos')
          .select('*')
          .eq('codigo', mejorMatch.codigo)
          .single();

        if (curso) {
          console.log(`[Web Match] ✅ Curso encontrado: ${curso.codigo} - ${curso.nombre} (activo: ${curso.activo})`);
          return curso;
        }
      }
    }

    // 2. Fallback: buscar directo en tabla cursos (nombre, psi_nombre)
    const { data: todosLosCursos } = await supabase
      .from('cursos')
      .select('*')
      .order('codigo');

    if (todosLosCursos) {
      let mejorMatch: { curso: Curso; score: number } | null = null;

      for (const curso of todosLosCursos) {
        const nombres = [curso.nombre, curso.psi_nombre].filter(Boolean);
        for (const nom of nombres) {
          const cursoNorm = this.normalizarTexto(nom);
          if (!cursoNorm) continue;

          if (nombreNorm === cursoNorm) {
            console.log(`[Web Match] ✅ Match exacto cursos: "${nom}" → ${curso.codigo}`);
            return curso;
          }

          if (nombreNorm.includes(cursoNorm) || cursoNorm.includes(nombreNorm)) {
            const score = cursoNorm.length;
            if (!mejorMatch || score > mejorMatch.score) {
              mejorMatch = { curso, score };
            }
          }
        }
      }

      if (mejorMatch) {
        console.log(`[Web Match] ✅ Match parcial cursos: ${mejorMatch.curso.codigo} (score: ${mejorMatch.score})`);
        return mejorMatch.curso;
      }
    }

    console.log(`[Web Match] ❌ No se encontró curso para: "${nombreWeb}"`);
    return null;
  }

  async enviarMenu(req: Request, res: Response): Promise<void> {
    try {
      const body: EnviarMenuRequest = req.body;
      if (!body.telefono) { res.status(400).json({ success: false, error: 'El teléfono es requerido' }); return; }

      let curso: Curso | null = null, configCtwaId: string | null = null, esCtwa = false;

      if (body.ad_id) {
        esCtwa = true;
        const { data: config } = await supabase.from('config_cursos_ctwa').select('id, curso:cursos(*)').eq('ad_id', body.ad_id).eq('activo', true).single();
        if (!config) { res.status(404).json({ success: false, error: `No hay curso para anuncio ${body.ad_id}` }); return; }
        curso = (config.curso as any) as Curso;
        configCtwaId = config.id;
        const { data: ctwaData } = await supabase.from('config_cursos_ctwa').select('ejecuciones').eq('id', configCtwaId).single(); if (ctwaData) await supabase.from('config_cursos_ctwa').update({ ejecuciones: (ctwaData.ejecuciones || 0) + 1 }).eq('id', configCtwaId);
      }

      if (!curso && body.curso_id) {
        const { data } = await supabase.from('cursos').select('*').eq('id', body.curso_id).eq('activo', true).single();
        if (!data) { res.status(404).json({ success: false, error: 'Curso no encontrado' }); return; }
        curso = data;
      }

      if (!curso) { res.status(400).json({ success: false, error: 'Debe especificar ad_id o curso_id' }); return; }

      const { data: opciones } = await supabase.from('menu_opciones').select('*').eq('curso_id', curso.id).eq('activo', true).order('orden');
      if (!opciones?.length) { res.status(400).json({ success: false, error: 'El curso no tiene opciones' }); return; }

      const resultado = await whatsAppService.enviarMenuInteractivo(body.telefono, curso, opciones);
      if (!resultado.success) { res.status(500).json({ success: false, error: resultado.error }); return; }

      if (esCtwa) await this.fijarConversacionEnVentas(body.telefono, `Ingreso CTWA - Curso: ${curso.codigo}`, body.nombre_contacto, true);

      await this.crearOActualizarSesion({ telefono: body.telefono, curso_id: curso.id, config_ctwa_id: configCtwaId || undefined, ad_id: body.ad_id, ctwa_clid: body.ctwa_clid, conversacion_id: body.conversacion_id, mensaje_inicial: body.mensaje_inicial });

      console.log(`📤 Menú enviado: ${body.telefono} → ${curso.codigo}${esCtwa ? ' (CTWA)' : ''}`);
      res.json({ success: true, data: { messageId: resultado.messageId, curso: { id: curso.id, codigo: curso.codigo, nombre: curso.nombre }, opcionesEnviadas: opciones.length } });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  }

  async procesarSeleccion(req: Request, res: Response): Promise<void> {
    try {
      const body: ProcesarSeleccionRequest = req.body;
      if (!body.telefono || !body.opcion_id) { res.status(400).json({ success: false, error: 'telefono y opcion_id requeridos' }); return; }

      const { data: opcion } = await supabase.from('menu_opciones').select('*, curso:cursos(*)').eq('id', body.opcion_id).single();
      if (!opcion) { res.status(404).json({ success: false, error: 'Opción no encontrada' }); return; }

      const curso = opcion.curso as Curso;
      const telNormalizado = this.normalizarTelefono(body.telefono);

      let { data: sesion } = await supabase.from('menu_sesiones').select('*').eq('telefono', telNormalizado).eq('estado', 'activo').single();

      if (!sesion) {
        console.log(`[Sesión] No existe para ${telNormalizado}, creando...`);
        await this.crearOActualizarSesion({ telefono: telNormalizado, curso_id: curso.id, conversacion_id: body.conversacion_id });
        const { data: nueva } = await supabase.from('menu_sesiones').select('*').eq('telefono', telNormalizado).eq('estado', 'activo').single();
        sesion = nueva;
      }

      const esCTWA = !!(sesion?.ad_id || sesion?.config_ctwa_id);

      await supabase.from('menu_interacciones').insert({
        telefono: body.telefono, conversacion_id: body.conversacion_id || sesion?.conversacion_id, curso_id: curso.id, opcion_id: opcion.id,
        curso_codigo: curso.codigo, curso_nombre: curso.nombre, opcion_titulo: opcion.titulo, tipo_opcion: opcion.tipo,
        config_ctwa_id: sesion?.config_ctwa_id, ad_id: sesion?.ad_id, ctwa_clid: sesion?.ctwa_clid, respuesta_enviada: false, derivado: false
      });

      await this.incrementarInteracciones(body.telefono, curso.id);

      let respuestaEnviada = false, derivado = false, mensajeRespuesta = '';

      switch (opcion.tipo) {
        case 'info':
          mensajeRespuesta = opcion.respuesta_custom || (opcion.campo_info && (curso as any)[opcion.campo_info]) || 'Info no disponible.';
          const r = await whatsAppService.enviarTexto(body.telefono, mensajeRespuesta);
          respuestaEnviada = r.success;
          if (opcion.mostrar_menu_despues && r.success) {
            const { data: todas } = await supabase.from('menu_opciones').select('*').eq('curso_id', curso.id).eq('activo', true).order('orden');
            if (todas?.length) await whatsAppService.enviarMenuInteractivo(body.telefono, curso, todas, true, true);
          }
          break;
        case 'derivar':
          mensajeRespuesta = opcion.mensaje_derivacion || 'Un momento, te comunico con nuestro equipo...';
          await whatsAppService.enviarTexto(body.telefono, mensajeRespuesta);
          respuestaEnviada = true; derivado = true;
          await this.fijarConversacionEnVentas(body.telefono, `Derivación - Curso: ${curso.codigo}`, body.nombre_contacto, esCTWA);
          if (sesion) await supabase.from('menu_sesiones').update({ estado: 'derivado' }).eq('id', sesion.id);
          break;
        case 'inscribir':
          mensajeRespuesta = opcion.mensaje_derivacion || '¡Excelente! 🎉 Te comunico con nuestro equipo...';
          await whatsAppService.enviarTexto(body.telefono, mensajeRespuesta);
          respuestaEnviada = true; derivado = true;
          await this.fijarConversacionEnVentas(body.telefono, `Inscripción - Curso: ${curso.codigo}`, body.nombre_contacto, esCTWA);
          if (sesion) await supabase.from('menu_sesiones').update({ estado: 'derivado' }).eq('id', sesion.id);
          break;
      }

      await supabase.from('menu_interacciones').update({ respuesta_enviada: respuestaEnviada, derivado }).eq('telefono', body.telefono).eq('opcion_id', body.opcion_id).order('created_at', { ascending: false }).limit(1);
      console.log(`✅ Selección: ${body.telefono} → ${opcion.titulo} (${opcion.tipo})${derivado ? ' [DERIVADO]' : ''}`);
      res.json({ success: true, data: { tipo: opcion.tipo, respuesta_enviada: respuestaEnviada, derivado, mostrar_menu_despues: opcion.mostrar_menu_despues } });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  }

  async webhookRespuestaMenu(req: Request, res: Response): Promise<void> {
    const { telefono, interactive } = req.body;
    if (!telefono || !interactive?.list_reply?.id) { res.status(400).json({ success: false, error: 'Datos incompletos' }); return; }
    req.body = { telefono, opcion_id: interactive.list_reply.id };
    await this.procesarSeleccion(req, res);
  }

  async obtenerSesion(req: Request, res: Response): Promise<void> {
    const telNormalizado = this.normalizarTelefono(req.params.telefono);
    const { data, error } = await supabase.from('menu_sesiones').select('*, curso:cursos(id, codigo, nombre)').eq('telefono', telNormalizado).eq('estado', 'activo').single();
    if (error?.code === 'PGRST116') { res.status(404).json({ success: false, error: 'No hay sesión activa' }); return; }
    if (error) { res.status(500).json({ success: false, error: error.message }); return; }
    res.json({ success: true, data });
  }

  async finalizarSesion(req: Request, res: Response): Promise<void> {
    const telNormalizado = this.normalizarTelefono(req.params.telefono);
    const { data, error } = await supabase.from('menu_sesiones').update({ estado: 'finalizado' }).eq('telefono', telNormalizado).eq('estado', 'activo').select().single();
    if (error?.code === 'PGRST116') { res.status(404).json({ success: false, error: 'No hay sesión activa' }); return; }
    if (error) { res.status(500).json({ success: false, error: error.message }); return; }
    res.json({ success: true, data, message: 'Sesión finalizada' });
  }

  // =============================================
  // ENTRADA DIRECTA — CON DETECCIÓN WEB
  // =============================================
  async enviarMenuDirecto(req: Request, res: Response): Promise<void> {
    try {
      const { telefono, nombre_contacto } = req.body;
      const tipoMensaje = req.body.tipo || req.body.messages?.[0]?.type || 'text';
      if (tipoMensaje === 'reaction') return this.procesarReaccion(req, res);
      if (!telefono) { res.status(400).json({ success: false, error: 'Teléfono requerido' }); return; }

      const telNormalizado = this.normalizarTelefono(telefono);
      const contenido = req.body.contenido || req.body.messages?.[0]?.text?.body || req.body.mensaje || '';

      // === VERIFICAR SI YA ESTÁ EN VENTAS ===
      const { data: conv } = await supabase.from('conversaciones').select('id, desconectado_wsp4, inbox_fijo').eq('telefono', telNormalizado).single();

      if (conv?.desconectado_wsp4 && conv?.inbox_fijo === 'ventas_api') {
        const ahora = new Date().toISOString();
        let timestamp = ahora;
        if (req.body.timestamp) { const ts = parseInt(req.body.timestamp); if (!isNaN(ts)) timestamp = new Date(ts * 1000).toISOString(); }
        const whatsappContextId = req.body.whatsapp_context_id || req.body.context_id || req.body.messages?.[0]?.context?.id || null;
        const mensajeCitadoId = await this.buscarMensajeCitadoId(whatsappContextId);

        await supabase.from('mensajes').insert({
          conversacion_id: conv.id, mensaje: contenido || `[${tipoMensaje}]`, tipo: tipoMensaje === 'text' ? 'text' : tipoMensaje,
          direccion: 'entrante', remitente_tipo: 'contacto', remitente_nombre: nombre_contacto || null,
          whatsapp_message_id: req.body.whatsapp_message_id || req.body.messages?.[0]?.id || null,
          whatsapp_context_id: whatsappContextId, mensaje_citado_id: mensajeCitadoId,
          media_url: req.body.media_url || null, media_type: req.body.media_type || null, timestamp, leido: false, enviado: false
        });
        await supabase.from('conversaciones').update({ ultimo_mensaje: contenido || `[${tipoMensaje}]`, ts_ultimo_mensaje: ahora, updated_at: ahora }).eq('id', conv.id);
        res.json({ success: true, message: 'Mensaje guardado', data: { tipo: 'guardado_directo', conversacion_id: conv.id } });
        return;
      }

      // === DETECTAR MENSAJE DESDE WEB DE PSI ===
      const nombreCursoWeb = this.extraerNombreCursoDeWeb(contenido);

      if (nombreCursoWeb) {
        console.log(`[Web] 🌐 Mensaje web detectado: "${nombreCursoWeb}" de ${telNormalizado}`);

        const curso = await this.matchearCursoPorNombre(nombreCursoWeb);

        if (curso && curso.activo) {
          // Curso activo → enviar menú interactivo (mismo flujo CTWA)
          const { data: opciones } = await supabase.from('menu_opciones').select('*').eq('curso_id', curso.id).eq('activo', true).order('orden');

          if (opciones?.length) {
            const resultado = await whatsAppService.enviarMenuInteractivo(telefono, curso, opciones);
            if (!resultado.success) { res.status(500).json({ success: false, error: resultado.error }); return; }

            await this.fijarConversacionEnVentas(telefono, `Ingreso Web - Curso: ${curso.codigo}`, nombre_contacto, false);
            await this.crearOActualizarSesion({ telefono: telNormalizado, curso_id: curso.id, origen: 'web', mensaje_inicial: contenido });

            console.log(`[Web] ✅ Menú enviado: ${telNormalizado} → ${curso.codigo} (origen: web)`);
            res.json({ success: true, data: { tipo: 'web_menu_curso', curso: curso.codigo, origen: 'web' } });
            return;
          } else {
            // Curso activo pero sin opciones de menú → derivar directo
            await whatsAppService.enviarTexto(telefono, `¡Hola! 👋 Gracias por tu interés en *${curso.nombre}*.\n\nEn breve te contacta un asesor con toda la info.`);
            await this.fijarConversacionEnVentas(telefono, `Ingreso Web - Curso: ${curso.codigo} (sin menú)`, nombre_contacto, false);
            await this.crearOActualizarSesion({ telefono: telNormalizado, curso_id: curso.id, origen: 'web', mensaje_inicial: contenido });

            console.log(`[Web] ✅ Derivado sin menú: ${telNormalizado} → ${curso.codigo}`);
            res.json({ success: true, data: { tipo: 'web_derivado_sin_menu', curso: curso.codigo, origen: 'web' } });
            return;
          }
        } else if (curso && !curso.activo) {
          // Curso inactivo → derivar con contexto
          await whatsAppService.enviarTexto(telefono, `¡Hola! 👋 Gracias por tu interés en *${curso.nombre}*.\n\nEn este momento no hay cohorte abierta, pero un asesor te puede informar sobre las próximas fechas.`);
          await this.fijarConversacionEnVentas(telefono, `Ingreso Web - Curso INACTIVO: ${curso.codigo}`, nombre_contacto, false);
          await this.crearOActualizarSesion({ telefono: telNormalizado, curso_id: curso.id, origen: 'web', mensaje_inicial: contenido });

          console.log(`[Web] ⚠️ Curso inactivo: ${telNormalizado} → ${curso.codigo}`);
          res.json({ success: true, data: { tipo: 'web_curso_inactivo', curso: curso.codigo, origen: 'web' } });
          return;
        } else {
          // No matcheó ningún curso → derivar con el mensaje original
          console.log(`[Web] ❌ No matcheó curso. Derivando con mensaje original.`);
          await whatsAppService.enviarTexto(telefono, `¡Hola! 👋 Gracias por contactarnos.\n\nEn breve te atiende un asesor.`);
          await this.fijarConversacionEnVentas(telefono, `Ingreso Web - Curso no identificado: "${nombreCursoWeb}"`, nombre_contacto, false);
          await this.crearOActualizarSesion({ telefono: telNormalizado, origen: 'web', mensaje_inicial: contenido });

          res.json({ success: true, data: { tipo: 'web_sin_match', origen: 'web' } });
          return;
        }
      }

      // === FLUJO NORMAL: Botones Cursos/Especializaciones/Asesor ===
      const resultado = await whatsAppService.enviarBotones(telefono, '¡Hola! 👋 Gracias por escribirnos a PSI.\n\n¿Qué tipo de formación te interesa?',
        [{ id: 'tipo_curso', titulo: '📚 Cursos' }, { id: 'tipo_especializacion', titulo: '🎓 Especializaciones' }, { id: 'hablar_agente', titulo: '💬 Hablar c/asesor' }], '🎓 PSI Asociación');
      if (!resultado.success) { res.status(500).json({ success: false, error: resultado.error }); return; }
      await this.crearOActualizarSesion({ telefono: telNormalizado, origen: 'directo' });
      res.json({ success: true, message: 'Botones enviados' });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  }

  // =============================================
  // LISTAR CURSOS POR TIPO — CON PAGINACIÓN
  // =============================================
  async listarCursosPorTipo(req: Request, res: Response): Promise<void> {
    try {
      const { telefono, tipo, nombre_contacto, pagina } = req.body;
      if (!telefono || !tipo) { res.status(400).json({ success: false, error: 'Teléfono y tipo requeridos' }); return; }

      const { data: cursos } = await supabase.from('cursos').select('*').eq('activo', true).eq('disponible_entrada_directa', true).eq('tipo_formacion', tipo).order('categoria').order('nombre');

      if (!cursos?.length) {
        await whatsAppService.enviarTexto(telefono, tipo === 'curso' ? 'No hay cursos disponibles.\n\nEn breve te atiende un asesor.' : 'No hay especializaciones disponibles.\n\nEn breve te atiende un asesor.');
        await this.fijarConversacionEnVentas(telefono, `Entrada directa - Sin ${tipo}s`, nombre_contacto, false);
        res.json({ success: true, data: { tipo: 'derivado_sin_cursos' } }); return;
      }

      const MAX_ROWS_WA = 10;
      const paginaActual = parseInt(pagina) || 1;

      if (cursos.length <= MAX_ROWS_WA) {
        const porCat: Record<string, any[]> = {};
        cursos.forEach((c: any) => { const cat = c.categoria || 'Otros'; if (!porCat[cat]) porCat[cat] = []; porCat[cat].push(c); });
        const sections = Object.entries(porCat).map(([cat, cs]) => ({
          title: cat.substring(0, 24),
          rows: cs.map((c: any) => ({ id: `curso_${c.id}`, title: c.nombre.substring(0, 24), description: c.descripcion?.substring(0, 72) || '' }))
        }));

        const resultado = await whatsAppService.enviarMenuGenerico(telefono, tipo === 'curso' ? 'Seleccioná el curso:' : 'Seleccioná la especialización:', sections, tipo === 'curso' ? '📚 Cursos' : '🎓 Especializaciones');
        if (!resultado.success) { res.status(500).json({ success: false, error: resultado.error }); return; }
      } else {
        const CURSOS_POR_PAGINA = 8;
        const totalPaginas = Math.ceil(cursos.length / CURSOS_POR_PAGINA);
        const pagActual = Math.max(1, Math.min(paginaActual, totalPaginas));
        const inicio = (pagActual - 1) * CURSOS_POR_PAGINA;
        const cursosPagina = cursos.slice(inicio, inicio + CURSOS_POR_PAGINA);

        const rows = cursosPagina.map((c: any) => ({
          id: `curso_${c.id}`,
          title: c.nombre.substring(0, 24),
          description: c.descripcion?.substring(0, 72) || ''
        }));

        if (pagActual < totalPaginas) {
          rows.push({ id: `nav_mas_${tipo}_p${pagActual + 1}`, title: '➡️ Ver más', description: `Página ${pagActual + 1} de ${totalPaginas}` });
        }
        if (pagActual > 1) {
          rows.push({ id: `nav_anterior_${tipo}_p${pagActual - 1}`, title: '⬅️ Página anterior', description: `Volver a página ${pagActual - 1}` });
        }

        const sections = [{ title: `${tipo === 'curso' ? 'Cursos' : 'Especializaciones'} (${pagActual}/${totalPaginas})`, rows }];
        const headerText = tipo === 'curso' ? '📚 Cursos' : '🎓 Especializaciones';
        const bodyText = tipo === 'curso' ? `Seleccioná el curso (${pagActual}/${totalPaginas}):` : `Seleccioná la especialización (${pagActual}/${totalPaginas}):`;

        const resultado = await whatsAppService.enviarMenuGenerico(telefono, bodyText, sections, headerText);
        if (!resultado.success) { res.status(500).json({ success: false, error: resultado.error }); return; }
      }

      await this.incrementarInteracciones(telefono);
      res.json({ success: true, data: { tipo, cantidad: cursos.length, pagina: paginaActual } });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  }

  async procesarSeleccionDirecta(req: Request, res: Response): Promise<void> {
    try {
      const { telefono, seleccion_id, nombre_contacto } = req.body;
      if (!telefono || !seleccion_id) { res.status(400).json({ success: false, error: 'Teléfono y seleccion_id requeridos' }); return; }

      if (seleccion_id === 'tipo_curso') { req.body.tipo = 'curso'; return this.listarCursosPorTipo(req, res); }
      if (seleccion_id === 'tipo_especializacion') { req.body.tipo = 'especializacion'; return this.listarCursosPorTipo(req, res); }

      if (seleccion_id === 'hablar_agente') {
        await whatsAppService.enviarTexto(telefono, '¡Perfecto! 👋\n\nEn breve te atiende un asesor.');
        await this.fijarConversacionEnVentas(telefono, 'Entrada directa - Solicitó agente', nombre_contacto, false);
        await this.incrementarInteracciones(telefono);
        res.json({ success: true, data: { tipo: 'derivado_agente' } }); return;
      }

      const navMatch = seleccion_id.match(/^nav_(?:mas|anterior)_(curso|especializacion)_p(\d+)$/);
      if (navMatch) {
        req.body.tipo = navMatch[1];
        req.body.pagina = parseInt(navMatch[2]);
        return this.listarCursosPorTipo(req, res);
      }

      if (seleccion_id.startsWith('curso_')) {
        const cursoId = seleccion_id.replace('curso_', '');
        const { data: curso } = await supabase.from('cursos').select('*').eq('id', cursoId).single();
        if (!curso) { res.status(404).json({ success: false, error: 'Curso no encontrado' }); return; }

        const { data: opciones } = await supabase.from('menu_opciones').select('*').eq('curso_id', cursoId).eq('activo', true).order('orden');
        if (!opciones?.length) {
          await whatsAppService.enviarTexto(telefono, `¡Gracias por tu interés en *${curso.nombre}*!\n\nEn breve te atiende un asesor.`);
          await this.fijarConversacionEnVentas(telefono, `Entrada directa - Curso: ${curso.codigo} (sin menú)`, nombre_contacto, false);
          res.json({ success: true, data: { tipo: 'derivado_sin_menu', curso: curso.codigo } }); return;
        }

        const resultado = await whatsAppService.enviarMenuInteractivo(telefono, curso, opciones, true, false);
        if (!resultado.success) { res.status(500).json({ success: false, error: resultado.error }); return; }
        await this.crearOActualizarSesion({ telefono, curso_id: cursoId, origen: 'directo' });
        res.json({ success: true, data: { tipo: 'menu_curso', curso: curso.codigo } }); return;
      }

      req.body.opcion_id = seleccion_id;
      return this.procesarSeleccion(req, res);
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  }
}

export const menuController = new MenuController();
export default menuController;
