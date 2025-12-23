"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuController = exports.MenuController = void 0;
const supabase_1 = require("../config/supabase");
const WhatsAppService_1 = require("../services/WhatsAppService");
class MenuController {
    normalizarTelefono(telefono) {
        let tel = telefono.replace(/\s+/g, '').replace(/-/g, '');
        if (!tel.startsWith('+'))
            tel = '+' + tel;
        return tel;
    }
    calcularVentanas(esCTWA) {
        const ahora = new Date();
        if (esCTWA) {
            const fin72h = new Date(ahora.getTime() + 72 * 60 * 60 * 1000);
            return { ventana_24h_activa: false, ventana_24h_inicio: null, ventana_24h_fin: null, ventana_72h_activa: true, ventana_72h_inicio: ahora.toISOString(), ventana_72h_fin: fin72h.toISOString() };
        }
        const fin24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
        return { ventana_24h_activa: true, ventana_24h_inicio: ahora.toISOString(), ventana_24h_fin: fin24h.toISOString(), ventana_72h_activa: false, ventana_72h_inicio: null, ventana_72h_fin: null };
    }
    async obtenerOCrearContacto(telefono, nombre) {
        const telNormalizado = this.normalizarTelefono(telefono);
        const { data: existente } = await supabase_1.supabase.from('contactos').select('id, nombre').eq('telefono', telNormalizado).single();
        if (existente) {
            if (!existente.nombre && nombre) {
                await supabase_1.supabase.from('contactos').update({ nombre, updated_at: new Date().toISOString() }).eq('id', existente.id);
                return { id: existente.id, nombre };
            }
            return { id: existente.id, nombre: existente.nombre };
        }
        const { data: nuevo, error } = await supabase_1.supabase.from('contactos').insert({ telefono: telNormalizado, nombre: nombre || null, origen: 'whatsapp', tipo: 'lead', activo: true }).select('id, nombre').single();
        if (error || !nuevo)
            throw new Error(`No se pudo crear el contacto: ${error?.message}`);
        return { id: nuevo.id, nombre: nuevo.nombre };
    }
    async fijarConversacionEnVentas(telefono, motivo, nombreContacto, esCTWA = false) {
        const telNormalizado = this.normalizarTelefono(telefono);
        const contacto = await this.obtenerOCrearContacto(telefono, nombreContacto);
        const ventanas = this.calcularVentanas(esCTWA);
        let conversacionId = null;
        const { data: conv } = await supabase_1.supabase.from('conversaciones').select('id').eq('telefono', telNormalizado).single();
        if (conv) {
            conversacionId = conv.id;
            await supabase_1.supabase.from('conversaciones').update({
                contacto_id: contacto.id, nombre: contacto.nombre, linea_origen: 'ventas_api', area: 'ventas_api',
                desconectado_wsp4: true, inbox_fijo: 'ventas_api', desconectado_por: esCTWA ? 'automatizacion_ctwa' : 'automatizacion_entrada_directa',
                desconectado_ts: new Date().toISOString(), desconectado_motivo: motivo, ...ventanas, updated_at: new Date().toISOString()
            }).eq('id', conv.id);
        }
        else {
            const { data: newConv } = await supabase_1.supabase.from('conversaciones').insert({
                telefono: telNormalizado, contacto_id: contacto.id, nombre: contacto.nombre, linea_origen: 'ventas_api', area: 'ventas_api',
                canal: 'whatsapp', estado: 'activa', desconectado_wsp4: true, inbox_fijo: 'ventas_api',
                desconectado_por: esCTWA ? 'automatizacion_ctwa' : 'automatizacion_entrada_directa',
                desconectado_ts: new Date().toISOString(), desconectado_motivo: motivo, ...ventanas
            }).select().single();
            if (newConv)
                conversacionId = newConv.id;
        }
        if (conversacionId) {
            await supabase_1.supabase.from('mensajes').insert({ conversacion_id: conversacionId, mensaje: `🤖 ${motivo}`, tipo: 'text', direccion: 'entrante', remitente_tipo: 'sistema', remitente_nombre: `Sistema ${esCTWA ? 'CTWA' : 'Ventas'}` });
            await supabase_1.supabase.from('conversaciones').update({ ultimo_mensaje: `🤖 ${motivo}`, ts_ultimo_mensaje: new Date().toISOString() }).eq('id', conversacionId);
        }
    }
    extraerSufijoWamid(wamid) {
        try {
            const base64Part = wamid.replace('wamid.', '');
            const decoded = Buffer.from(base64Part, 'base64').toString('binary');
            const separatorIndex = decoded.indexOf('\x15\x02\x00\x11\x18\x12');
            if (separatorIndex !== -1)
                return decoded.substring(separatorIndex + 6).replace(/\x00/g, '');
            return decoded.slice(-20).replace(/[\x00-\x1f]/g, '');
        }
        catch {
            return null;
        }
    }
    async buscarMensajePorSufijo(sufijo) {
        const { data: directMatch } = await supabase_1.supabase.from('mensajes').select('id, conversacion_id').eq('whatsapp_message_id', sufijo).single();
        if (directMatch)
            return directMatch;
        const { data: mensajes } = await supabase_1.supabase.from('mensajes').select('id, conversacion_id, whatsapp_message_id').not('whatsapp_message_id', 'is', null).order('created_at', { ascending: false }).limit(100);
        if (!mensajes)
            return null;
        for (const msg of mensajes) {
            if (msg.whatsapp_message_id && this.extraerSufijoWamid(msg.whatsapp_message_id) === sufijo)
                return { id: msg.id, conversacion_id: msg.conversacion_id };
        }
        return null;
    }
    async procesarReaccion(req, res) {
        const mensaje = req.body.messages?.[0];
        const emoji = req.body.emoji || mensaje?.reaction?.emoji || '';
        const reactionMessageId = req.body.wamid || mensaje?.reaction?.message_id;
        if (!reactionMessageId) {
            res.json({ success: true, message: 'Reacción ignorada' });
            return;
        }
        const sufijo = this.extraerSufijoWamid(reactionMessageId);
        if (!sufijo) {
            res.json({ success: false, message: 'No se pudo procesar el ID' });
            return;
        }
        const mensajeOriginal = await this.buscarMensajePorSufijo(sufijo);
        if (!emoji) {
            if (mensajeOriginal)
                await supabase_1.supabase.from('mensaje_reacciones').delete().eq('mensaje_id', mensajeOriginal.id).is('usuario_id', null);
            res.json({ success: true, message: 'Reacción eliminada' });
            return;
        }
        if (!mensajeOriginal) {
            res.json({ success: false, message: 'Mensaje no encontrado' });
            return;
        }
        const { data: existe } = await supabase_1.supabase.from('mensaje_reacciones').select('id').eq('mensaje_id', mensajeOriginal.id).is('usuario_id', null).single();
        if (existe)
            await supabase_1.supabase.from('mensaje_reacciones').update({ emoji }).eq('id', existe.id);
        else
            await supabase_1.supabase.from('mensaje_reacciones').insert({ mensaje_id: mensajeOriginal.id, emoji, usuario_id: null });
        res.json({ success: true, message: 'Reacción procesada' });
    }
    async buscarMensajeCitadoId(whatsappContextId) {
        if (!whatsappContextId)
            return null;
        const sufijo = this.extraerSufijoWamid(whatsappContextId);
        if (sufijo) {
            const msg = await this.buscarMensajePorSufijo(sufijo);
            if (msg)
                return msg.id;
        }
        const { data } = await supabase_1.supabase.from('mensajes').select('id').eq('whatsapp_message_id', whatsappContextId).single();
        return data?.id || null;
    }
    // CORREGIDO: crear/actualizar sesión
    async crearOActualizarSesion(datos) {
        const telNormalizado = this.normalizarTelefono(datos.telefono);
        const ahora = new Date().toISOString();
        const { data: existe } = await supabase_1.supabase.from('menu_sesiones').select('id, interacciones').eq('telefono', telNormalizado).eq('estado', 'activo').single();
        if (existe) {
            const upd = { ultima_actividad: ahora, updated_at: ahora };
            if (datos.curso_id)
                upd.curso_id = datos.curso_id;
            if (datos.config_ctwa_id)
                upd.config_ctwa_id = datos.config_ctwa_id;
            if (datos.ad_id)
                upd.ad_id = datos.ad_id;
            if (datos.ctwa_clid)
                upd.ctwa_clid = datos.ctwa_clid;
            if (datos.conversacion_id)
                upd.conversacion_id = datos.conversacion_id;
            await supabase_1.supabase.from('menu_sesiones').update(upd).eq('id', existe.id);
            console.log(`[Sesión] ✏️ Actualizada: ${telNormalizado}`);
            return existe.id;
        }
        const ins = { telefono: telNormalizado, estado: 'activo', interacciones: 0, ultima_actividad: ahora };
        if (datos.curso_id)
            ins.curso_id = datos.curso_id;
        if (datos.config_ctwa_id)
            ins.config_ctwa_id = datos.config_ctwa_id;
        if (datos.ad_id)
            ins.ad_id = datos.ad_id;
        if (datos.ctwa_clid)
            ins.ctwa_clid = datos.ctwa_clid;
        if (datos.conversacion_id)
            ins.conversacion_id = datos.conversacion_id;
        if (datos.mensaje_inicial)
            ins.mensaje_inicial = datos.mensaje_inicial;
        if (datos.origen)
            ins.origen = datos.origen;
        else
            ins.origen = 'ctwa';
        const { data: nueva, error } = await supabase_1.supabase.from('menu_sesiones').insert(ins).select('id').single();
        if (error) {
            console.error('[Sesión] Error:', error);
            return null;
        }
        console.log(`[Sesión] ✅ Creada: ${telNormalizado}${datos.curso_id ? ` curso:${datos.curso_id}` : ''}`);
        return nueva?.id || null;
    }
    // CORREGIDO: incrementar interacciones
    async incrementarInteracciones(telefono, cursoId) {
        const telNormalizado = this.normalizarTelefono(telefono);
        const { data: sesion } = await supabase_1.supabase.from('menu_sesiones').select('id, interacciones').eq('telefono', telNormalizado).eq('estado', 'activo').single();
        if (sesion) {
            await supabase_1.supabase.from('menu_sesiones').update({ interacciones: (sesion.interacciones || 0) + 1, ultima_actividad: new Date().toISOString() }).eq('id', sesion.id);
        }
        else if (cursoId) {
            await this.crearOActualizarSesion({ telefono: telNormalizado, curso_id: cursoId });
        }
    }
    async enviarMenu(req, res) {
        try {
            const body = req.body;
            if (!body.telefono) {
                res.status(400).json({ success: false, error: 'El teléfono es requerido' });
                return;
            }
            let curso = null, configCtwaId = null, esCtwa = false;
            if (body.ad_id) {
                esCtwa = true;
                const { data: config } = await supabase_1.supabase.from('config_cursos_ctwa').select('id, curso:cursos(*)').eq('ad_id', body.ad_id).eq('activo', true).single();
                if (!config) {
                    res.status(404).json({ success: false, error: `No hay curso para anuncio ${body.ad_id}` });
                    return;
                }
                curso = config.curso;
                configCtwaId = config.id;
                const { data: ctwaData } = await supabase_1.supabase.from('config_cursos_ctwa').select('ejecuciones').eq('id', configCtwaId).single();
                if (ctwaData)
                    await supabase_1.supabase.from('config_cursos_ctwa').update({ ejecuciones: (ctwaData.ejecuciones || 0) + 1 }).eq('id', configCtwaId);
            }
            if (!curso && body.curso_id) {
                const { data } = await supabase_1.supabase.from('cursos').select('*').eq('id', body.curso_id).eq('activo', true).single();
                if (!data) {
                    res.status(404).json({ success: false, error: 'Curso no encontrado' });
                    return;
                }
                curso = data;
            }
            if (!curso) {
                res.status(400).json({ success: false, error: 'Debe especificar ad_id o curso_id' });
                return;
            }
            const { data: opciones } = await supabase_1.supabase.from('menu_opciones').select('*').eq('curso_id', curso.id).eq('activo', true).order('orden');
            if (!opciones?.length) {
                res.status(400).json({ success: false, error: 'El curso no tiene opciones' });
                return;
            }
            const resultado = await WhatsAppService_1.whatsAppService.enviarMenuInteractivo(body.telefono, curso, opciones);
            if (!resultado.success) {
                res.status(500).json({ success: false, error: resultado.error });
                return;
            }
            if (esCtwa)
                await this.fijarConversacionEnVentas(body.telefono, `Ingreso CTWA - Curso: ${curso.codigo}`, body.nombre_contacto, true);
            await this.crearOActualizarSesion({ telefono: body.telefono, curso_id: curso.id, config_ctwa_id: configCtwaId || undefined, ad_id: body.ad_id, ctwa_clid: body.ctwa_clid, conversacion_id: body.conversacion_id, mensaje_inicial: body.mensaje_inicial });
            console.log(`📤 Menú enviado: ${body.telefono} → ${curso.codigo}${esCtwa ? ' (CTWA)' : ''}`);
            res.json({ success: true, data: { messageId: resultado.messageId, curso: { id: curso.id, codigo: curso.codigo, nombre: curso.nombre }, opcionesEnviadas: opciones.length } });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async procesarSeleccion(req, res) {
        try {
            const body = req.body;
            if (!body.telefono || !body.opcion_id) {
                res.status(400).json({ success: false, error: 'telefono y opcion_id requeridos' });
                return;
            }
            const { data: opcion } = await supabase_1.supabase.from('menu_opciones').select('*, curso:cursos(*)').eq('id', body.opcion_id).single();
            if (!opcion) {
                res.status(404).json({ success: false, error: 'Opción no encontrada' });
                return;
            }
            const curso = opcion.curso;
            const telNormalizado = this.normalizarTelefono(body.telefono);
            let { data: sesion } = await supabase_1.supabase.from('menu_sesiones').select('*').eq('telefono', telNormalizado).eq('estado', 'activo').single();
            // NUEVO: Si no hay sesión, crearla
            if (!sesion) {
                console.log(`[Sesión] No existe para ${telNormalizado}, creando...`);
                await this.crearOActualizarSesion({ telefono: telNormalizado, curso_id: curso.id, conversacion_id: body.conversacion_id });
                const { data: nueva } = await supabase_1.supabase.from('menu_sesiones').select('*').eq('telefono', telNormalizado).eq('estado', 'activo').single();
                sesion = nueva;
            }
            const esCTWA = !!(sesion?.ad_id || sesion?.config_ctwa_id);
            await supabase_1.supabase.from('menu_interacciones').insert({
                telefono: body.telefono, conversacion_id: body.conversacion_id || sesion?.conversacion_id, curso_id: curso.id, opcion_id: opcion.id,
                curso_codigo: curso.codigo, curso_nombre: curso.nombre, opcion_titulo: opcion.titulo, tipo_opcion: opcion.tipo,
                config_ctwa_id: sesion?.config_ctwa_id, ad_id: sesion?.ad_id, ctwa_clid: sesion?.ctwa_clid, respuesta_enviada: false, derivado: false
            });
            await this.incrementarInteracciones(body.telefono, curso.id);
            let respuestaEnviada = false, derivado = false, mensajeRespuesta = '';
            switch (opcion.tipo) {
                case 'info':
                    mensajeRespuesta = opcion.respuesta_custom || (opcion.campo_info && curso[opcion.campo_info]) || 'Info no disponible.';
                    const r = await WhatsAppService_1.whatsAppService.enviarTexto(body.telefono, mensajeRespuesta);
                    respuestaEnviada = r.success;
                    if (opcion.mostrar_menu_despues && r.success) {
                        const { data: todas } = await supabase_1.supabase.from('menu_opciones').select('*').eq('curso_id', curso.id).eq('activo', true).order('orden');
                        if (todas?.length)
                            await WhatsAppService_1.whatsAppService.enviarMenuInteractivo(body.telefono, curso, todas, true, true);
                    }
                    break;
                case 'derivar':
                    mensajeRespuesta = opcion.mensaje_derivacion || 'Un momento, te comunico con nuestro equipo...';
                    await WhatsAppService_1.whatsAppService.enviarTexto(body.telefono, mensajeRespuesta);
                    respuestaEnviada = true;
                    derivado = true;
                    await this.fijarConversacionEnVentas(body.telefono, `Derivación - Curso: ${curso.codigo}`, body.nombre_contacto, esCTWA);
                    if (sesion)
                        await supabase_1.supabase.from('menu_sesiones').update({ estado: 'derivado' }).eq('id', sesion.id);
                    break;
                case 'inscribir':
                    mensajeRespuesta = opcion.mensaje_derivacion || '¡Excelente! 🎉 Te comunico con nuestro equipo...';
                    await WhatsAppService_1.whatsAppService.enviarTexto(body.telefono, mensajeRespuesta);
                    respuestaEnviada = true;
                    derivado = true;
                    await this.fijarConversacionEnVentas(body.telefono, `Inscripción - Curso: ${curso.codigo}`, body.nombre_contacto, esCTWA);
                    if (sesion)
                        await supabase_1.supabase.from('menu_sesiones').update({ estado: 'derivado' }).eq('id', sesion.id);
                    break;
            }
            await supabase_1.supabase.from('menu_interacciones').update({ respuesta_enviada: respuestaEnviada, derivado }).eq('telefono', body.telefono).eq('opcion_id', body.opcion_id).order('created_at', { ascending: false }).limit(1);
            console.log(`✅ Selección: ${body.telefono} → ${opcion.titulo} (${opcion.tipo})${derivado ? ' [DERIVADO]' : ''}`);
            res.json({ success: true, data: { tipo: opcion.tipo, respuesta_enviada: respuestaEnviada, derivado, mostrar_menu_despues: opcion.mostrar_menu_despues } });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async webhookRespuestaMenu(req, res) {
        const { telefono, interactive } = req.body;
        if (!telefono || !interactive?.list_reply?.id) {
            res.status(400).json({ success: false, error: 'Datos incompletos' });
            return;
        }
        req.body = { telefono, opcion_id: interactive.list_reply.id };
        await this.procesarSeleccion(req, res);
    }
    async obtenerSesion(req, res) {
        const telNormalizado = this.normalizarTelefono(req.params.telefono);
        const { data, error } = await supabase_1.supabase.from('menu_sesiones').select('*, curso:cursos(id, codigo, nombre)').eq('telefono', telNormalizado).eq('estado', 'activo').single();
        if (error?.code === 'PGRST116') {
            res.status(404).json({ success: false, error: 'No hay sesión activa' });
            return;
        }
        if (error) {
            res.status(500).json({ success: false, error: error.message });
            return;
        }
        res.json({ success: true, data });
    }
    async finalizarSesion(req, res) {
        const telNormalizado = this.normalizarTelefono(req.params.telefono);
        const { data, error } = await supabase_1.supabase.from('menu_sesiones').update({ estado: 'finalizado' }).eq('telefono', telNormalizado).eq('estado', 'activo').select().single();
        if (error?.code === 'PGRST116') {
            res.status(404).json({ success: false, error: 'No hay sesión activa' });
            return;
        }
        if (error) {
            res.status(500).json({ success: false, error: error.message });
            return;
        }
        res.json({ success: true, data, message: 'Sesión finalizada' });
    }
    async enviarMenuDirecto(req, res) {
        try {
            const { telefono, nombre_contacto } = req.body;
            const tipoMensaje = req.body.tipo || req.body.messages?.[0]?.type || 'text';
            if (tipoMensaje === 'reaction')
                return this.procesarReaccion(req, res);
            if (!telefono) {
                res.status(400).json({ success: false, error: 'Teléfono requerido' });
                return;
            }
            const telNormalizado = this.normalizarTelefono(telefono);
            const { data: conv } = await supabase_1.supabase.from('conversaciones').select('id, desconectado_wsp4, inbox_fijo').eq('telefono', telNormalizado).single();
            if (conv?.desconectado_wsp4 && conv?.inbox_fijo === 'ventas_api') {
                const ahora = new Date().toISOString();
                const contenido = req.body.contenido || req.body.messages?.[0]?.text?.body || '';
                let timestamp = ahora;
                if (req.body.timestamp) {
                    const ts = parseInt(req.body.timestamp);
                    if (!isNaN(ts))
                        timestamp = new Date(ts * 1000).toISOString();
                }
                const whatsappContextId = req.body.whatsapp_context_id || req.body.context_id || req.body.messages?.[0]?.context?.id || null;
                const mensajeCitadoId = await this.buscarMensajeCitadoId(whatsappContextId);
                await supabase_1.supabase.from('mensajes').insert({
                    conversacion_id: conv.id, mensaje: contenido || `[${tipoMensaje}]`, tipo: tipoMensaje === 'text' ? 'text' : tipoMensaje,
                    direccion: 'entrante', remitente_tipo: 'contacto', remitente_nombre: nombre_contacto || null,
                    whatsapp_message_id: req.body.whatsapp_message_id || req.body.messages?.[0]?.id || null,
                    whatsapp_context_id: whatsappContextId, mensaje_citado_id: mensajeCitadoId,
                    media_url: req.body.media_url || null, media_type: req.body.media_type || null, timestamp, leido: false, enviado: false
                });
                await supabase_1.supabase.from('conversaciones').update({ ultimo_mensaje: contenido || `[${tipoMensaje}]`, ts_ultimo_mensaje: ahora, updated_at: ahora }).eq('id', conv.id);
                res.json({ success: true, message: 'Mensaje guardado', data: { tipo: 'guardado_directo', conversacion_id: conv.id } });
                return;
            }
            const resultado = await WhatsAppService_1.whatsAppService.enviarBotones(telefono, '¡Hola! 👋 Gracias por escribirnos a PSI.\n\n¿Qué tipo de formación te interesa?', [{ id: 'tipo_curso', titulo: '📚 Cursos' }, { id: 'tipo_especializacion', titulo: '🎓 Especializaciones' }, { id: 'hablar_agente', titulo: '💬 Hablar c/asesor' }], '🎓 PSI Asociación');
            if (!resultado.success) {
                res.status(500).json({ success: false, error: resultado.error });
                return;
            }
            await this.crearOActualizarSesion({ telefono: telNormalizado, origen: 'directo' });
            res.json({ success: true, message: 'Botones enviados' });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async listarCursosPorTipo(req, res) {
        try {
            const { telefono, tipo, nombre_contacto } = req.body;
            if (!telefono || !tipo) {
                res.status(400).json({ success: false, error: 'Teléfono y tipo requeridos' });
                return;
            }
            const { data: cursos } = await supabase_1.supabase.from('cursos').select('*').eq('activo', true).eq('disponible_entrada_directa', true).eq('tipo_formacion', tipo).order('categoria').order('nombre');
            if (!cursos?.length) {
                await WhatsAppService_1.whatsAppService.enviarTexto(telefono, tipo === 'curso' ? 'No hay cursos disponibles.\n\nEn breve te atiende un asesor.' : 'No hay especializaciones disponibles.\n\nEn breve te atiende un asesor.');
                await this.fijarConversacionEnVentas(telefono, `Entrada directa - Sin ${tipo}s`, nombre_contacto, false);
                res.json({ success: true, data: { tipo: 'derivado_sin_cursos' } });
                return;
            }
            const porCat = {};
            cursos.forEach((c) => { const cat = c.categoria || 'Otros'; if (!porCat[cat])
                porCat[cat] = []; porCat[cat].push(c); });
            const sections = Object.entries(porCat).map(([cat, cs]) => ({
                title: cat.substring(0, 24),
                rows: cs.slice(0, 10).map((c) => ({ id: `curso_${c.id}`, title: c.nombre.substring(0, 24), description: c.descripcion?.substring(0, 72) || '' }))
            }));
            const resultado = await WhatsAppService_1.whatsAppService.enviarMenuGenerico(telefono, tipo === 'curso' ? 'Seleccioná el curso:' : 'Seleccioná la especialización:', sections, tipo === 'curso' ? '📚 Cursos' : '🎓 Especializaciones');
            if (!resultado.success) {
                res.status(500).json({ success: false, error: resultado.error });
                return;
            }
            await this.incrementarInteracciones(telefono);
            res.json({ success: true, data: { tipo, cantidad: cursos.length } });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async procesarSeleccionDirecta(req, res) {
        try {
            const { telefono, seleccion_id, nombre_contacto } = req.body;
            if (!telefono || !seleccion_id) {
                res.status(400).json({ success: false, error: 'Teléfono y seleccion_id requeridos' });
                return;
            }
            if (seleccion_id === 'tipo_curso') {
                req.body.tipo = 'curso';
                return this.listarCursosPorTipo(req, res);
            }
            if (seleccion_id === 'tipo_especializacion') {
                req.body.tipo = 'especializacion';
                return this.listarCursosPorTipo(req, res);
            }
            if (seleccion_id === 'hablar_agente') {
                await WhatsAppService_1.whatsAppService.enviarTexto(telefono, '¡Perfecto! 👋\n\nEn breve te atiende un asesor.');
                await this.fijarConversacionEnVentas(telefono, 'Entrada directa - Solicitó agente', nombre_contacto, false);
                await this.incrementarInteracciones(telefono);
                res.json({ success: true, data: { tipo: 'derivado_agente' } });
                return;
            }
            if (seleccion_id.startsWith('curso_')) {
                const cursoId = seleccion_id.replace('curso_', '');
                const { data: curso } = await supabase_1.supabase.from('cursos').select('*').eq('id', cursoId).single();
                if (!curso) {
                    res.status(404).json({ success: false, error: 'Curso no encontrado' });
                    return;
                }
                const { data: opciones } = await supabase_1.supabase.from('menu_opciones').select('*').eq('curso_id', cursoId).eq('activo', true).order('orden');
                if (!opciones?.length) {
                    await WhatsAppService_1.whatsAppService.enviarTexto(telefono, `¡Gracias por tu interés en *${curso.nombre}*!\n\nEn breve te atiende un asesor.`);
                    await this.fijarConversacionEnVentas(telefono, `Entrada directa - Curso: ${curso.codigo} (sin menú)`, nombre_contacto, false);
                    res.json({ success: true, data: { tipo: 'derivado_sin_menu', curso: curso.codigo } });
                    return;
                }
                const resultado = await WhatsAppService_1.whatsAppService.enviarMenuInteractivo(telefono, curso, opciones, true, false);
                if (!resultado.success) {
                    res.status(500).json({ success: false, error: resultado.error });
                    return;
                }
                await this.crearOActualizarSesion({ telefono, curso_id: cursoId, origen: 'directo' });
                res.json({ success: true, data: { tipo: 'menu_curso', curso: curso.codigo } });
                return;
            }
            req.body.opcion_id = seleccion_id;
            return this.procesarSeleccion(req, res);
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}
exports.MenuController = MenuController;
exports.menuController = new MenuController();
exports.default = exports.menuController;
//# sourceMappingURL=MenuController.js.map