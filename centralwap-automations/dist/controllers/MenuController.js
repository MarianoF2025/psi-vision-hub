"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuController = exports.MenuController = void 0;
const axios_1 = __importDefault(require("axios"));
const supabase_1 = require("../config/supabase");
const WhatsAppService_1 = require("../services/WhatsAppService");
const ROUTER_VENTAS_URL = 'https://centralwap.psivisionhub.com/webhook/whatsapp/ventas';
class MenuController {
    normalizarTelefono(telefono) {
        let tel = telefono.replace(/\s+/g, '').replace(/-/g, '');
        if (!tel.startsWith('+')) {
            tel = '+' + tel;
        }
        return tel;
    }
    async fijarConversacionEnVentas(telefono, motivo) {
        const telNormalizado = this.normalizarTelefono(telefono);
        let conversacionId = null;
        const { data: conv } = await supabase_1.supabase
            .from('conversaciones')
            .select('id')
            .eq('telefono', telNormalizado)
            .single();
        if (conv) {
            conversacionId = conv.id;
            await supabase_1.supabase
                .from('conversaciones')
                .update({
                linea_origen: 'ventas',
                area: 'ventas',
                desconectado_wsp4: true,
                inbox_fijo: 'ventas',
                desconectado_por: 'automatizacion_ctwa',
                desconectado_ts: new Date().toISOString(),
                desconectado_motivo: motivo,
                updated_at: new Date().toISOString()
            })
                .eq('id', conv.id);
            console.log(`🔄 Conversación fijada en Ventas: ${telNormalizado} - ${motivo}`);
        }
        else {
            const { data: newConv, error } = await supabase_1.supabase
                .from('conversaciones')
                .insert({
                linea_origen: 'ventas',
                area: 'ventas',
                canal: 'whatsapp',
                estado: 'activa',
                desconectado_wsp4: true,
                inbox_fijo: 'ventas',
                desconectado_por: 'automatizacion_entrada_directa',
                desconectado_ts: new Date().toISOString(),
                desconectado_motivo: motivo
            })
                .select()
                .single();
            if (newConv) {
                conversacionId = newConv.id;
                console.log(`✅ Conversación creada y fijada en Ventas: ${telNormalizado} - ${motivo}`);
            }
            else {
                console.error(`❌ Error creando conversación: ${error?.message}`);
            }
        }
        // Insertar mensaje de sistema para que el agente vea el contexto
        if (conversacionId) {
            await supabase_1.supabase.from('mensajes').insert({
                conversacion_id: conversacionId,
                mensaje: `🤖 ${motivo}`,
                tipo: 'text',
                direccion: 'entrante',
                remitente_tipo: 'sistema',
                remitente_nombre: 'Sistema CTWA',
            });
            // Actualizar último mensaje de la conversación
            await supabase_1.supabase
                .from('conversaciones')
                .update({
                ultimo_mensaje: `🤖 ${motivo}`,
                ts_ultimo_mensaje: new Date().toISOString()
            })
                .eq('id', conversacionId);
        }
    }
    async enviarMenu(req, res) {
        try {
            const body = req.body;
            if (!body.telefono) {
                res.status(400).json({ success: false, error: 'El teléfono es requerido' });
                return;
            }
            let curso = null;
            let configCtwaId = null;
            let esCtwa = false;
            if (body.ad_id) {
                esCtwa = true;
                const { data: config, error } = await supabase_1.supabase
                    .from('config_cursos_ctwa')
                    .select('id, curso:cursos(*)')
                    .eq('ad_id', body.ad_id)
                    .eq('activo', true)
                    .single();
                if (error || !config) {
                    console.warn(`⚠️ No se encontró config para ad_id: ${body.ad_id}`);
                    res.status(404).json({ success: false, error: `No hay curso configurado para el anuncio ${body.ad_id}` });
                    return;
                }
                curso = config.curso;
                configCtwaId = config.id;
                const { data: ctwaData } = await supabase_1.supabase
                    .from('config_cursos_ctwa')
                    .select('ejecuciones')
                    .eq('id', configCtwaId)
                    .single();
                if (ctwaData) {
                    await supabase_1.supabase
                        .from('config_cursos_ctwa')
                        .update({ ejecuciones: (ctwaData.ejecuciones || 0) + 1 })
                        .eq('id', configCtwaId);
                }
            }
            if (!curso && body.curso_id) {
                const { data, error } = await supabase_1.supabase
                    .from('cursos')
                    .select('*')
                    .eq('id', body.curso_id)
                    .eq('activo', true)
                    .single();
                if (error || !data) {
                    res.status(404).json({ success: false, error: 'Curso no encontrado o inactivo' });
                    return;
                }
                curso = data;
            }
            if (!curso) {
                res.status(400).json({ success: false, error: 'Debe especificar ad_id o curso_id' });
                return;
            }
            const { data: opciones, error: opcionesError } = await supabase_1.supabase
                .from('menu_opciones')
                .select('*')
                .eq('curso_id', curso.id)
                .eq('activo', true)
                .order('orden', { ascending: true });
            if (opcionesError || !opciones || opciones.length === 0) {
                res.status(400).json({ success: false, error: 'El curso no tiene opciones de menú configuradas' });
                return;
            }
            const resultado = await WhatsAppService_1.whatsAppService.enviarMenuInteractivo(body.telefono, curso, opciones);
            if (!resultado.success) {
                res.status(500).json({ success: false, error: resultado.error || 'Error enviando menú' });
                return;
            }
            if (esCtwa) {
                await this.fijarConversacionEnVentas(body.telefono, `Ingreso CTWA - Curso: ${curso.codigo}`);
            }
            const sesionData = {
                telefono: body.telefono,
                conversacion_id: body.conversacion_id || null,
                curso_id: curso.id,
                config_ctwa_id: configCtwaId,
                estado: 'activo',
                ad_id: body.ad_id || null,
                ctwa_clid: body.ctwa_clid || null,
                mensaje_inicial: body.mensaje_inicial || null,
                interacciones: 0,
                ultima_actividad: new Date().toISOString()
            };
            await supabase_1.supabase.from('menu_sesiones').upsert(sesionData, { onConflict: 'telefono' });
            console.log(`📤 Menú enviado: ${body.telefono} → ${curso.codigo}${esCtwa ? ' (CTWA)' : ''}`);
            res.json({
                success: true,
                data: {
                    messageId: resultado.messageId,
                    curso: { id: curso.id, codigo: curso.codigo, nombre: curso.nombre },
                    opcionesEnviadas: opciones.length
                },
                message: `Menú de ${curso.nombre} enviado exitosamente`
            });
        }
        catch (error) {
            console.error('Error enviando menú:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async procesarSeleccion(req, res) {
        try {
            const body = req.body;
            if (!body.telefono || !body.opcion_id) {
                res.status(400).json({ success: false, error: 'telefono y opcion_id son requeridos' });
                return;
            }
            const { data: opcion, error: opcionError } = await supabase_1.supabase
                .from('menu_opciones')
                .select('*, curso:cursos(*)')
                .eq('id', body.opcion_id)
                .single();
            if (opcionError || !opcion) {
                res.status(404).json({ success: false, error: 'Opción no encontrada' });
                return;
            }
            const curso = opcion.curso;
            const { data: sesion } = await supabase_1.supabase
                .from('menu_sesiones')
                .select('*')
                .eq('telefono', body.telefono)
                .eq('estado', 'activo')
                .single();
            await supabase_1.supabase.from('menu_interacciones').insert({
                telefono: body.telefono,
                conversacion_id: body.conversacion_id || sesion?.conversacion_id,
                curso_id: curso.id,
                opcion_id: opcion.id,
                curso_codigo: curso.codigo,
                curso_nombre: curso.nombre,
                opcion_titulo: opcion.titulo,
                tipo_opcion: opcion.tipo,
                config_ctwa_id: sesion?.config_ctwa_id,
                ad_id: sesion?.ad_id,
                ctwa_clid: sesion?.ctwa_clid,
                respuesta_enviada: false,
                derivado: false
            });
            if (sesion) {
                await supabase_1.supabase
                    .from('menu_sesiones')
                    .update({
                    interacciones: (sesion.interacciones || 0) + 1,
                    ultima_actividad: new Date().toISOString()
                })
                    .eq('id', sesion.id);
            }
            let respuestaEnviada = false;
            let derivado = false;
            let mensajeRespuesta = '';
            switch (opcion.tipo) {
                case 'info':
                    if (opcion.respuesta_custom) {
                        mensajeRespuesta = opcion.respuesta_custom;
                    }
                    else if (opcion.campo_info && curso[opcion.campo_info]) {
                        mensajeRespuesta = curso[opcion.campo_info];
                    }
                    else {
                        mensajeRespuesta = 'Información no disponible. Por favor contacta con nuestro equipo.';
                    }
                    const resultadoInfo = await WhatsAppService_1.whatsAppService.enviarTexto(body.telefono, mensajeRespuesta);
                    respuestaEnviada = resultadoInfo.success;
                    if (opcion.mostrar_menu_despues && resultadoInfo.success) {
                        const { data: todasOpciones } = await supabase_1.supabase
                            .from('menu_opciones')
                            .select('*')
                            .eq('curso_id', curso.id)
                            .eq('activo', true)
                            .order('orden', { ascending: true });
                        if (todasOpciones && todasOpciones.length > 0) {
                            await WhatsAppService_1.whatsAppService.enviarMenuInteractivo(body.telefono, curso, todasOpciones);
                        }
                    }
                    break;
                case 'derivar':
                    mensajeRespuesta = opcion.mensaje_derivacion || 'Un momento, te comunico con nuestro equipo...';
                    await WhatsAppService_1.whatsAppService.enviarTexto(body.telefono, mensajeRespuesta);
                    respuestaEnviada = true;
                    derivado = true;
                    await this.fijarConversacionEnVentas(body.telefono, `Derivación manual - Curso: ${curso.codigo}`);
                    if (sesion) {
                        await supabase_1.supabase.from('menu_sesiones').update({ estado: 'derivado' }).eq('id', sesion.id);
                    }
                    break;
                case 'inscribir':
                    mensajeRespuesta = opcion.mensaje_derivacion || '¡Excelente decisión! 🎉 Te comunico con nuestro equipo para completar tu inscripción...';
                    await WhatsAppService_1.whatsAppService.enviarTexto(body.telefono, mensajeRespuesta);
                    respuestaEnviada = true;
                    derivado = true;
                    await this.fijarConversacionEnVentas(body.telefono, `Solicitud inscripción - Curso: ${curso.codigo}`);
                    if (sesion) {
                        await supabase_1.supabase.from('menu_sesiones').update({ estado: 'derivado' }).eq('id', sesion.id);
                    }
                    break;
            }
            await supabase_1.supabase
                .from('menu_interacciones')
                .update({ respuesta_enviada: respuestaEnviada, derivado })
                .eq('telefono', body.telefono)
                .eq('opcion_id', body.opcion_id)
                .order('created_at', { ascending: false })
                .limit(1);
            console.log(`✅ Selección procesada: ${body.telefono} → ${opcion.emoji || ''} ${opcion.titulo} (${opcion.tipo})${derivado ? ' [DERIVADO A VENTAS]' : ''}`);
            res.json({
                success: true,
                data: {
                    tipo: opcion.tipo,
                    respuesta_enviada: respuestaEnviada,
                    derivado,
                    mostrar_menu_despues: opcion.mostrar_menu_despues
                },
                message: `Opción "${opcion.titulo}" procesada`
            });
        }
        catch (error) {
            console.error('Error procesando selección:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async webhookRespuestaMenu(req, res) {
        try {
            const { telefono, interactive } = req.body;
            if (!telefono || !interactive?.list_reply?.id) {
                res.status(400).json({ success: false, error: 'Datos incompletos' });
                return;
            }
            req.body = { telefono, opcion_id: interactive.list_reply.id };
            await this.procesarSeleccion(req, res);
        }
        catch (error) {
            console.error('Error en webhook respuesta:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async obtenerSesion(req, res) {
        try {
            const { telefono } = req.params;
            const { data, error } = await supabase_1.supabase
                .from('menu_sesiones')
                .select('*, curso:cursos(id, codigo, nombre)')
                .eq('telefono', telefono)
                .eq('estado', 'activo')
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    res.status(404).json({ success: false, error: 'No hay sesión activa para este teléfono' });
                    return;
                }
                throw error;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            console.error('Error obteniendo sesión:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async finalizarSesion(req, res) {
        try {
            const { telefono } = req.params;
            const { data, error } = await supabase_1.supabase
                .from('menu_sesiones')
                .update({ estado: 'finalizado' })
                .eq('telefono', telefono)
                .eq('estado', 'activo')
                .select()
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    res.status(404).json({ success: false, error: 'No hay sesión activa para finalizar' });
                    return;
                }
                throw error;
            }
            console.log(`✅ Sesión finalizada: ${telefono}`);
            res.json({ success: true, data, message: 'Sesión finalizada' });
        }
        catch (error) {
            console.error('Error finalizando sesión:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async enviarMenuDirecto(req, res) {
        try {
            const { telefono, nombre_contacto } = req.body;
            if (!telefono) {
                res.status(400).json({ success: false, error: 'El teléfono es requerido' });
                return;
            }
            const telNormalizado = this.normalizarTelefono(telefono);
            const { data: convExistente } = await supabase_1.supabase
                .from('conversaciones')
                .select('id, desconectado_wsp4, inbox_fijo')
                .eq('telefono', telNormalizado)
                .single();
            if (convExistente?.desconectado_wsp4 && convExistente?.inbox_fijo === 'ventas') {
                try {
                    const routerPayload = {
                        messages: req.body.messages,
                        contacts: req.body.contacts,
                        messaging_product: req.body.messaging_product || 'whatsapp',
                        metadata: req.body.metadata,
                        telefono: req.body.telefono,
                        contenido: req.body.contenido,
                        tipo: req.body.tipo,
                        timestamp: req.body.timestamp,
                        nombre_contacto: req.body.nombre_contacto,
                        media_url: req.body.media_url,
                        media_type: req.body.media_type,
                        media_id: req.body.media_id,
                        whatsapp_message_id: req.body.whatsapp_message_id,
                        whatsapp_context_id: req.body.whatsapp_context_id
                    };
                    await axios_1.default.post(ROUTER_VENTAS_URL, routerPayload);
                    console.log(`📥 Forward al Router (conv fijada): ${telNormalizado}`);
                    res.json({ success: true, message: 'Mensaje enviado al Router', data: { tipo: 'forward_router' } });
                }
                catch (err) {
                    console.error('Error forward al Router:', err.message);
                    res.status(500).json({ success: false, error: 'Error enviando al Router' });
                }
                return;
            }
            const resultado = await WhatsAppService_1.whatsAppService.enviarBotones(telefono, '¡Hola! 👋 Gracias por escribirnos a PSI.\n\n¿Qué tipo de formación te interesa?', [
                { id: 'tipo_curso', titulo: '📚 Cursos' },
                { id: 'tipo_especializacion', titulo: '🎓 Especializaciones' },
                { id: 'hablar_agente', titulo: '💬 Hablar c/asesor' }
            ], '🎓 PSI Asociación');
            if (!resultado.success) {
                res.status(500).json({ success: false, error: resultado.error || 'Error enviando botones' });
                return;
            }
            await supabase_1.supabase.from('menu_sesiones').upsert({
                estado: 'activo',
                interacciones: 0,
                ultima_actividad: new Date().toISOString()
            }, { onConflict: 'telefono' });
            console.log(`📤 Botones entrada directa enviados: ${telefono}`);
            res.json({ success: true, message: 'Botones de entrada directa enviados' });
        }
        catch (error) {
            console.error('Error enviando menú directo:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async listarCursosPorTipo(req, res) {
        try {
            const { telefono, tipo } = req.body;
            if (!telefono || !tipo) {
                res.status(400).json({ success: false, error: 'Teléfono y tipo son requeridos' });
                return;
            }
            const { data: cursos, error } = await supabase_1.supabase
                .from('cursos')
                .select('*')
                .eq('activo', true)
                .eq('disponible_entrada_directa', true)
                .eq('tipo_formacion', tipo)
                .order('categoria', { ascending: true })
                .order('nombre', { ascending: true });
            if (error || !cursos || cursos.length === 0) {
                const mensaje = tipo === 'curso'
                    ? 'No hay cursos disponibles en este momento.\n\nEn breve te atiende uno de nuestros asesores.'
                    : 'No hay especializaciones disponibles en este momento.\n\nEn breve te atiende uno de nuestros asesores.';
                await WhatsAppService_1.whatsAppService.enviarTexto(telefono, mensaje);
                await this.fijarConversacionEnVentas(telefono, `Entrada directa - Sin ${tipo}s disponibles`);
                res.json({ success: true, data: { tipo: 'derivado_sin_cursos' } });
                return;
            }
            const porCategoria = {};
            cursos.forEach((c) => {
                const cat = c.categoria || 'Otros';
                if (!porCategoria[cat])
                    porCategoria[cat] = [];
                porCategoria[cat].push(c);
            });
            const sections = Object.entries(porCategoria).map(([categoria, cursosCat]) => ({
                title: categoria.substring(0, 24),
                rows: cursosCat.slice(0, 10).map((c) => ({
                    id: `curso_${c.id}`,
                    title: c.nombre.substring(0, 24),
                    description: c.descripcion?.substring(0, 72) || ''
                }))
            }));
            const headerText = tipo === 'curso' ? '📚 Cursos Disponibles' : '🎓 Especializaciones';
            const bodyText = tipo === 'curso'
                ? 'Seleccioná el curso sobre el que querés información:'
                : 'Seleccioná la especialización sobre la que querés información:';
            const resultado = await WhatsAppService_1.whatsAppService.enviarMenuGenerico(telefono, bodyText, sections, headerText);
            if (!resultado.success) {
                res.status(500).json({ success: false, error: resultado.error });
                return;
            }
            console.log(`📤 Lista de ${tipo}s enviada: ${telefono} → ${cursos.length} disponibles`);
            res.json({ success: true, data: { tipo, cantidad: cursos.length } });
        }
        catch (error) {
            console.error('Error listando cursos por tipo:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async procesarSeleccionDirecta(req, res) {
        try {
            const { telefono, seleccion_id } = req.body;
            if (!telefono || !seleccion_id) {
                res.status(400).json({ success: false, error: 'Teléfono y seleccion_id son requeridos' });
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
                await WhatsAppService_1.whatsAppService.enviarTexto(telefono, '¡Perfecto! 👋\n\nEn breve te atiende uno de nuestros asesores.');
                await this.fijarConversacionEnVentas(telefono, 'Entrada directa - Solicitó hablar con agente');
                console.log(`📤 Entrada directa: ${telefono} → Derivado a agente (solicitado)`);
                res.json({ success: true, data: { tipo: 'derivado_agente' } });
                return;
            }
            if (seleccion_id.startsWith('curso_')) {
                const cursoId = seleccion_id.replace('curso_', '');
                const { data: curso, error: cursoError } = await supabase_1.supabase
                    .from('cursos')
                    .select('*')
                    .eq('id', cursoId)
                    .single();
                if (cursoError || !curso) {
                    res.status(404).json({ success: false, error: 'Curso no encontrado' });
                    return;
                }
                const { data: opciones } = await supabase_1.supabase
                    .from('menu_opciones')
                    .select('*')
                    .eq('curso_id', cursoId)
                    .eq('activo', true)
                    .order('orden', { ascending: true });
                if (!opciones || opciones.length === 0) {
                    await WhatsAppService_1.whatsAppService.enviarTexto(telefono, `¡Gracias por tu interés en *${curso.nombre}*! 🎓\n\nEn breve te atiende uno de nuestros asesores.`);
                    await this.fijarConversacionEnVentas(telefono, `Entrada directa - Curso: ${curso.codigo} (sin menú)`);
                    res.json({ success: true, data: { tipo: 'derivado_sin_menu', curso: curso.codigo } });
                    return;
                }
                const resultado = await WhatsAppService_1.whatsAppService.enviarMenuInteractivo(telefono, curso, opciones);
                if (!resultado.success) {
                    res.status(500).json({ success: false, error: resultado.error });
                    return;
                }
                await supabase_1.supabase.from('menu_sesiones').upsert({
                    telefono: this.normalizarTelefono(telefono),
                    curso_id: cursoId,
                    estado: 'activo',
                    interacciones: 1,
                    ultima_actividad: new Date().toISOString()
                }, { onConflict: 'telefono' });
                console.log(`📤 Menú de curso enviado (entrada directa): ${telefono} → ${curso.codigo}`);
                res.json({ success: true, data: { tipo: 'menu_curso', curso: curso.codigo } });
                return;
            }
            req.body.opcion_id = seleccion_id;
            return this.procesarSeleccion(req, res);
        }
        catch (error) {
            console.error('Error procesando selección directa:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}
exports.MenuController = MenuController;
exports.menuController = new MenuController();
exports.default = exports.menuController;
//# sourceMappingURL=MenuController.js.map