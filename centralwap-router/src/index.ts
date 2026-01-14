// ===========================================
// PSI ROUTER - SERVIDOR PRINCIPAL
// Versión 4.3.0 - Con cursos dinámicos para Inscripciones
// ===========================================
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { routerController } from './core/RouterController';
import { verificarConexion, supabase } from './config/supabase';
import { WhatsAppIncoming, MensajeInsert } from './types/database';
import { conversacionService } from './services/ConversacionService';
import { webhookService } from './services/WebhookService';
import { interactiveService } from './services/InteractiveService';
import { interactiveMenuProcessor } from './core/InteractiveMenuProcessor';
import { obtenerMenuInteractivo, MENU_PRINCIPAL_INTERACTIVO, obtenerAccion, InteractiveList } from './config/interactive-menus';

// Configuración
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Crear aplicación Express
const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ===========================================
// MENSAJE EDUCATIVO PARA LÍNEAS SECUNDARIAS
// ===========================================
const MENSAJE_EDUCATIVO = `¡Hola! 👋 Gracias por escribirnos.

Para poder atenderte mejor, te pedimos que nos contactes por nuestro canal principal:

👉 wa.me/5491156090819

Ahí vas a poder elegir el área que necesitás y te atendemos enseguida.

¡Te esperamos! 💚
Equipo PSI`;

// ===========================================
// FUNCIÓN PARA EXTRAER SUFIJO ÚNICO DEL WAMID
// ===========================================
function extraerSufijoWamid(wamid: string): string | null {
  try {
    const base64Part = wamid.replace('wamid.', '');
    const decoded = Buffer.from(base64Part, 'base64').toString('binary');
    const separatorIndex = decoded.indexOf('\x15\x02\x00\x11\x18\x12');
    if (separatorIndex !== -1) {
      const sufijo = decoded.substring(separatorIndex + 6).replace(/\x00/g, '');
      return sufijo;
    }
    const fallback = decoded.slice(-20).replace(/[\x00-\x1f]/g, '');
    return fallback;
  } catch (error) {
    console.error('[WAMID] Error extrayendo sufijo:', error);
    return null;
  }
}

// ===========================================
// FUNCIÓN PARA BUSCAR MENSAJE POR SUFIJO
// ===========================================
async function buscarMensajePorSufijo(sufijo: string): Promise<{ id: string; conversacion_id: string } | null> {
  try {
    const { data: directMatch } = await supabase
      .from('mensajes')
      .select('id, conversacion_id')
      .eq('whatsapp_message_id', sufijo)
      .single();

    if (directMatch) {
      console.log('[Reacción] Mensaje encontrado por ID directo:', sufijo);
      return { id: directMatch.id, conversacion_id: directMatch.conversacion_id };
    }

    const { data: mensajes } = await supabase
      .from('mensajes')
      .select('id, conversacion_id, whatsapp_message_id')
      .not('whatsapp_message_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!mensajes) return null;

    for (const msg of mensajes) {
      if (msg.whatsapp_message_id) {
        const msgSufijo = extraerSufijoWamid(msg.whatsapp_message_id);
        if (msgSufijo === sufijo) {
          console.log('[Reacción] Mensaje encontrado por sufijo WAMID:', sufijo);
          return { id: msg.id, conversacion_id: msg.conversacion_id };
        }
      }
    }

    console.log('[Reacción] Mensaje NO encontrado para:', sufijo);
    return null;
  } catch (error) {
    console.error('[Reacción] Error buscando por sufijo:', error);
    return null;
  }
}

// ===========================================
// FUNCIÓN PARA PROCESAR REACCIONES ENTRANTES
// ===========================================
async function procesarReaccionEntrante(
  telefono: string,
  emoji: string,
  reactionMessageId: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`[Reacción] Procesando: ${emoji} al mensaje ${reactionMessageId} de ${telefono}`);
    const sufijoReaccion = extraerSufijoWamid(reactionMessageId);

    if (!sufijoReaccion) {
      return { success: false, message: 'No se pudo procesar el ID del mensaje' };
    }

    if (!emoji) {
      const mensajeOriginal = await buscarMensajePorSufijo(sufijoReaccion);
      if (mensajeOriginal) {
        await supabase
          .from('mensaje_reacciones')
          .delete()
          .eq('mensaje_id', mensajeOriginal.id)
          .is('usuario_id', null);
      }
      return { success: true, message: 'Reacción eliminada' };
    }

    const mensajeOriginal = await buscarMensajePorSufijo(sufijoReaccion);
    if (!mensajeOriginal) {
      return { success: false, message: 'Mensaje original no encontrado' };
    }

    const { data: reaccionExistente } = await supabase
      .from('mensaje_reacciones')
      .select('id, emoji')
      .eq('mensaje_id', mensajeOriginal.id)
      .is('usuario_id', null)
      .single();

    if (reaccionExistente) {
      if (reaccionExistente.emoji === emoji) {
        await supabase.from('mensaje_reacciones').delete().eq('id', reaccionExistente.id);
        return { success: true, message: 'Reacción eliminada (toggle)' };
      } else {
        await supabase
          .from('mensaje_reacciones')
          .update({ emoji, created_at: new Date().toISOString() })
          .eq('id', reaccionExistente.id);
        return { success: true, message: 'Reacción actualizada' };
      }
    }

    await supabase.from('mensaje_reacciones').insert({
      mensaje_id: mensajeOriginal.id,
      usuario_id: null,
      emoji: emoji,
    });

    return { success: true, message: 'Reacción guardada' };
  } catch (error) {
    console.error('[Reacción] Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

// ===========================================
// NORMALIZAR PAYLOAD EVOLUTION API
// ===========================================
function normalizarEvolutionPayload(body: any, linea: string): {
  telefono: string;
  mensaje: string;
  nombre: string;
  messageId: string;
  mediaType?: string;
  mediaUrl?: string;
  contextMessageId?: string;
} | null {
  try {
    const data = body.data || body;
    const key = data.key || {};
    const message = data.message || {};

    let telefonoRaw: string | null = null;

    if (key.remoteJidAlt && key.remoteJidAlt.includes('@s.whatsapp.net')) {
      telefonoRaw = key.remoteJidAlt;
    } else if (data.sender && data.sender.includes('@s.whatsapp.net')) {
      telefonoRaw = data.sender;
    } else if (key.remoteJid && key.remoteJid.includes('@s.whatsapp.net')) {
      telefonoRaw = key.remoteJid;
    }

    if (!telefonoRaw) {
      console.error(`[${linea}] No se pudo extraer teléfono válido`);
      return null;
    }

    const telefono = '+' + telefonoRaw.replace('@s.whatsapp.net', '');
    const nombre = data.pushName || '';
    const messageId = key.id || '';

    let mensaje = '';
    let mediaType: string | undefined;
    let mediaUrl: string | undefined;

    if (message.conversation) {
      mensaje = message.conversation;
    } else if (message.extendedTextMessage?.text) {
      mensaje = message.extendedTextMessage.text;
    } else if (message.imageMessage) {
      mediaType = 'image';
      mensaje = message.imageMessage.caption || '[Imagen]';
      mediaUrl = body.media_url || body.mediaUrl;
    } else if (message.audioMessage) {
      mediaType = 'audio';
      mensaje = '[Audio]';
      mediaUrl = body.media_url || body.mediaUrl;
    } else if (message.videoMessage) {
      mediaType = 'video';
      mensaje = message.videoMessage.caption || '[Video]';
      mediaUrl = body.media_url || body.mediaUrl;
    } else if (message.documentMessage) {
      mediaType = 'document';
      mensaje = message.documentMessage.fileName || '[Documento]';
      mediaUrl = body.media_url || body.mediaUrl;
    } else if (message.stickerMessage) {
      mediaType = 'sticker';
      mensaje = '[Sticker]';
    }

    let contextMessageId: string | undefined;
    if (message.extendedTextMessage?.contextInfo?.stanzaId) {
      contextMessageId = message.extendedTextMessage.contextInfo.stanzaId;
    }

    return { telefono, mensaje, nombre, messageId, mediaType, mediaUrl, contextMessageId };
  } catch (error) {
    console.error(`[${linea}] Error normalizando payload:`, error);
    return null;
  }
}

// ===========================================
// NORMALIZAR PAYLOAD CLOUD API (VENTAS)
// ===========================================
function normalizarCloudAPIPayload(body: any): {
  telefono: string;
  mensaje: string;
  nombre: string;
  messageId: string;
  mediaType?: string;
  mediaUrl?: string;
  contextMessageId?: string;
} | null {
  try {
    const messages = body.messages || [];
    const contacts = body.contacts || [];
    if (!messages[0]) return null;
    const msg = messages[0];
    const telefono = '+' + msg.from;
    const nombre = contacts[0]?.profile?.name || '';
    const messageId = msg.id || '';
    const tipo = msg.type;
    let mensaje = '';
    let mediaType: string | undefined;
    let mediaUrl: string | undefined;
    let contextMessageId: string | undefined;

    if (msg.context?.id) {
      contextMessageId = msg.context.id;
    }

    if (tipo === 'text' && msg.text) {
      mensaje = msg.text.body || '';
    } else if (tipo === 'image' && msg.image) {
      mediaType = 'image';
      mensaje = msg.image.caption || '[Imagen]';
    } else if (tipo === 'audio' && msg.audio) {
      mediaType = 'audio';
      mensaje = '[Audio]';
    } else if (tipo === 'video' && msg.video) {
      mediaType = 'video';
      mensaje = msg.video.caption || '[Video]';
    } else if (tipo === 'document' && msg.document) {
      mediaType = 'document';
      mensaje = msg.document.filename || '[Documento]';
    } else if (tipo === 'sticker') {
      mediaType = 'sticker';
      mensaje = '[Sticker]';
    }

    if (body.media_url) {
      mediaUrl = body.media_url;
    }

    return { telefono, mensaje, nombre, messageId, mediaType, mediaUrl, contextMessageId };
  } catch (error) {
    console.error('[Ventas] Error normalizando payload:', error);
    return null;
  }
}

// ===========================================
// PROCESAR MENSAJE DE LÍNEA SECUNDARIA
// ===========================================
async function procesarMensajeLineaSecundaria(
  linea: string,
  payload: {
    telefono: string;
    mensaje: string;
    nombre: string;
    messageId: string;
    mediaType?: string;
    mediaUrl?: string;
    contextMessageId?: string;
  }
): Promise<{ success: boolean; action: string; enviado_educativo: boolean }> {
  try {
    console.log(`[${linea}] Procesando mensaje de ${payload.telefono}`);

    const conversacionExistente = await conversacionService.buscarPorTelefonoYLinea(
      payload.telefono,
      linea
    );

    const conversacionDesconectada = await conversacionService.buscarDesconectadaPorTelefonoEInbox(
      payload.telefono,
      linea
    );

    let enviarEducativo = true;
    let conversacionAUsar: any = null;

    if (conversacionDesconectada) {
      enviarEducativo = false;
      conversacionAUsar = conversacionDesconectada;
      console.log(`[${linea}] Conversación desconectada encontrada (${conversacionDesconectada.id}). Usando para guardar mensaje.`);
    }

    if (conversacionExistente) {
      const iniciadoPorAgente = conversacionExistente.iniciado_por === 'agente';
      const ventanaActiva = conversacionExistente.ventana_24h_activa &&
        conversacionExistente.ventana_24h_fin &&
        new Date(conversacionExistente.ventana_24h_fin) > new Date();

      if (iniciadoPorAgente && ventanaActiva) {
        enviarEducativo = false;
        conversacionAUsar = conversacionExistente;
        console.log(`[${linea}] Conversación iniciada por agente, ventana activa. NO enviar educativo.`);
        await conversacionService.renovarVentana24h(conversacionExistente.id);
      }
    }

    if (enviarEducativo) {
      console.log(`[${linea}] Enviando mensaje educativo a ${payload.telefono} (sin crear conversación)`);

      await webhookService.enviarMensajeViaWebhook({
        linea: linea,
        telefono: payload.telefono,
        mensaje: MENSAJE_EDUCATIVO,
        conversacion_id: '',
        tipo: 'text',
        remitente: 'sistema',
      });

      return { success: true, action: 'mensaje_educativo', enviado_educativo: true };
    }

    if (!conversacionAUsar) {
      const { conversacion } = await conversacionService.obtenerOCrear({
        telefono: payload.telefono,
        linea_origen: linea,
        area: linea,
        estado: 'activa',
        iniciado_por: 'usuario',
      });
      conversacionAUsar = conversacion;
    }

    const mensajeData: MensajeInsert = {
      conversacion_id: conversacionAUsar.id,
      mensaje: payload.mensaje,
      tipo: payload.mediaType || 'text',
      direccion: 'entrante',
      remitente_tipo: 'contacto',
      media_url: payload.mediaUrl,
      media_type: payload.mediaType,
      whatsapp_message_id: payload.messageId,
      whatsapp_context_id: payload.contextMessageId,
    };

    await supabase.from('mensajes').insert(mensajeData);
    await conversacionService.actualizarUltimoMensaje(conversacionAUsar.id, payload.mensaje);

    return { success: true, action: 'mensaje_guardado', enviado_educativo: false };

  } catch (error) {
    console.error(`[${linea}] Error procesando mensaje:`, error);
    return { success: false, action: 'error', enviado_educativo: false };
  }
}

// ===========================================
// PROCESAR SELECCIÓN DE CURSO (WSP4)
// ===========================================
async function procesarSeleccionCurso(
  telefono: string,
  cursoId: string,
  nombreContacto?: string
): Promise<{ success: boolean; action: string; ticketId?: string }> {
  try {
    console.log(`[WSP4-Cursos] Curso seleccionado: ${cursoId}`);

    const telNormalizado = telefono.startsWith('+') ? telefono : '+' + telefono;

    // Obtener info del curso
    const { data: curso, error: cursoError } = await supabase
      .from('cursos')
      .select('id, codigo, nombre')
      .eq('id', cursoId)
      .single();

    if (cursoError || !curso) {
      console.error('[WSP4-Cursos] Curso no encontrado:', cursoId);
      await interactiveService.enviarTexto(telefono,
        '❌ Hubo un problema. Por favor, escribí *MENU* para volver a empezar.'
      );
      return { success: false, action: 'curso_no_encontrado' };
    }

    // Registrar interacción en menu_interacciones
    await supabase.from('menu_interacciones').insert({
      telefono: telNormalizado,
      curso_id: cursoId,
      tipo_opcion: 'seleccion_curso',
      derivado: true,
    });
    console.log(`[WSP4-Cursos] Registrado en menu_interacciones: ${telNormalizado} → ${curso.nombre}`);

    // Buscar o crear conversación
    const { conversacion } = await conversacionService.obtenerOCrear({
      telefono: telNormalizado,
      linea_origen: 'wsp4',
      area: 'ventas',
      estado: 'derivada',
      iniciado_por: 'usuario',
    });

    // Generar ticket
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const ticketId = `TKT-${dateStr}-${randomSuffix}`;

    // Actualizar conversación
    await supabase
      .from('conversaciones')
      .update({
        area: 'ventas',
        estado: 'derivada',
        router_estado: 'derivado',
        menu_actual: null,
        desconectado_motivo: `Interesado en: ${curso.nombre}`,
      })
      .eq('id', conversacion.id);

    // Mensaje de sistema para el agente
    await supabase.from('mensajes').insert({
      conversacion_id: conversacion.id,
      mensaje: `🤖 WSP4 → Ventas → Interesado en: ${curso.nombre} (${curso.codigo})`,
      tipo: 'text',
      direccion: 'entrante',
      remitente_tipo: 'sistema',
      remitente_nombre: 'Router WSP4',
    });

    // Crear ticket
    const { data: ticketData } = await supabase.from('tickets').insert({
      conversacion_id: conversacion.id,
      telefono: telNormalizado,
      ticket_id: ticketId,
      area: 'ventas',
      estado: 'abierto',
      prioridad: 'normal',
      area_origen: 'wsp4',
      area_destino: 'ventas',
      subetiqueta: 'inscripcion_curso',
      metadata: {
        curso_id: cursoId,
        curso_codigo: curso.codigo,
        curso_nombre: curso.nombre,
        nombre_contacto: nombreContacto,
        origen: 'menu_wsp4',
      },
    }).select('id').single();

    // Registro de derivación
    await supabase.from('derivaciones').insert({
      conversacion_id: conversacion.id,
      telefono: telNormalizado,
      area_origen: 'wsp4',
      area_destino: 'ventas',
      motivo: `Inscripción: ${curso.nombre}`,
      menu_option_selected: `curso_${cursoId}`,
      subetiqueta: 'inscripcion_curso',
      ticket_id: ticketData?.id,
      status: 'completada',
      ts_derivacion: now.toISOString(),
      sistema_version: '4.3.0',
      nodo_procesador: 'centralwap-router',
    });

    // Audit log
    await supabase.from('audit_log').insert({
      accion: 'seleccion_curso_wsp4',
      tabla_afectada: 'menu_interacciones',
      registro_id: conversacion.id,
      valores_nuevos: {
        curso_id: cursoId,
        curso_codigo: curso.codigo,
        curso_nombre: curso.nombre,
        ticket_id: ticketId,
      },
      motivo: `Usuario seleccionó curso desde WSP4: ${curso.nombre}`,
      origen: 'router-wsp4',
    });

    // Confirmación al usuario
    await interactiveService.enviarTexto(telefono,
      `✅ ¡Excelente elección!\n\nTe contactamos en breve con toda la info sobre *${curso.nombre}*.\n\nSi necesitás otra cosa, escribí *MENU*.`
    );

    console.log(`[WSP4-Cursos] ✅ Derivación completada: ${ticketId} - ${curso.nombre}`);
    return { success: true, action: 'curso_derivado', ticketId };

  } catch (error) {
    console.error('[WSP4-Cursos] Error:', error);
    return { success: false, action: 'error' };
  }
}

// ===========================================
// PROCESAR MENÚ INTERACTIVO WSP4
// ===========================================
async function procesarMenuInteractivo(
  telefono: string,
  listReplyId: string,
  nombreContacto?: string
): Promise<{ success: boolean; action: string; ticketId?: string }> {
  try {
    console.log(`[WSP4-Interactive] Procesando selección: ${listReplyId} de ${telefono}`);

    // === DETECTAR SELECCIÓN DE CURSO DINÁMICO ===
    if (listReplyId.startsWith('curso_')) {
      const cursoId = listReplyId.replace('curso_', '');
      return await procesarSeleccionCurso(telefono, cursoId, nombreContacto);
    }

    const resultado = await interactiveMenuProcessor.procesar({
      listReplyId,
      telefono,
    });

    // === MOSTRAR MENÚ/SUBMENÚ ===
    if (resultado.accion === 'mostrar_menu' && resultado.menu) {
      console.log(`[WSP4-Interactive] Enviando menú: ${resultado.menuId}`);
      await interactiveService.enviarListaInteractiva(telefono, resultado.menu);

      const telNormalizado = telefono.startsWith('+') ? telefono : '+' + telefono;
      const { data: conv } = await supabase
        .from('conversaciones')
        .select('id')
        .eq('telefono', telNormalizado)
        .eq('linea_origen', 'wsp4')
        .single();

      if (conv) {
        await supabase
          .from('conversaciones')
          .update({
            menu_actual: resultado.menuId,
            router_estado: resultado.menuId === 'principal' ? 'menu_principal' : `submenu_${resultado.menuId}`
          })
          .eq('id', conv.id);
      }

      return { success: true, action: 'menu_enviado' };
    }

    // === MOSTRAR CURSOS DINÁMICOS ===
    if (resultado.accion === 'mostrar_cursos') {
      console.log(`[WSP4-Interactive] Consultando cursos activos...`);

      const { data: cursos, error } = await supabase
        .from('cursos')
        .select('id, codigo, nombre')
        .eq('activo', true)
        .order('nombre');

      if (error || !cursos || cursos.length === 0) {
        console.error('[WSP4-Interactive] Error obteniendo cursos o sin cursos activos:', error);
        // Fallback: derivar directo a ventas sin curso específico
        const telNormalizado = telefono.startsWith('+') ? telefono : '+' + telefono;

        const { conversacion } = await conversacionService.obtenerOCrear({
          telefono: telNormalizado,
          linea_origen: 'wsp4',
          area: 'ventas',
          estado: 'derivada',
          iniciado_por: 'usuario',
        });

        await supabase
          .from('conversaciones')
          .update({
            area: 'ventas',
            estado: 'derivada',
            router_estado: 'derivado',
          })
          .eq('id', conversacion.id);

        await interactiveService.enviarTexto(telefono,
          '✅ Te derivamos con nuestro equipo de inscripciones.\n\nEn breve te contactamos. Si necesitás otra cosa, escribí *MENU*.'
        );

        return { success: true, action: 'derivado_sin_cursos' };
      }

      // Generar menú dinámico con cursos
      const menuCursos: InteractiveList = {
        header: '📝 Inscripciones',
        body: '¿Qué curso te interesa?',
        footer: 'Elegí una opción',
        buttonText: 'Ver cursos',
        sections: [{
          title: 'Cursos disponibles',
          rows: [
            ...cursos.map(c => ({
              id: `curso_${c.id}`,
              title: c.nombre.length > 24 ? c.nombre.substring(0, 21) + '...' : c.nombre,
              description: c.codigo
            })),
            { id: 'volver', title: '⬅️ Volver', description: 'Menú principal' }
          ]
        }]
      };

      await interactiveService.enviarListaInteractiva(telefono, menuCursos);

      // Actualizar estado
      const telNormalizado = telefono.startsWith('+') ? telefono : '+' + telefono;
      await supabase
        .from('conversaciones')
        .update({
          menu_actual: 'cursos',
          router_estado: 'submenu_cursos'
        })
        .eq('telefono', telNormalizado)
        .eq('linea_origen', 'wsp4');

      console.log(`[WSP4-Interactive] Menú de cursos enviado (${cursos.length} cursos)`);
      return { success: true, action: 'menu_cursos_enviado' };
    }

    // === DERIVAR A ÁREA ===
    if (resultado.accion === 'derivar' && resultado.derivacion) {
      console.log(`[WSP4-Interactive] Derivando a: ${resultado.derivacion.area} - ${resultado.derivacion.subetiqueta}`);

      const telNormalizado = telefono.startsWith('+') ? telefono : '+' + telefono;

      const { conversacion } = await conversacionService.obtenerOCrear({
        telefono: telNormalizado,
        linea_origen: 'wsp4',
        area: resultado.derivacion.area,
        estado: 'derivada',
        iniciado_por: 'usuario',
      });

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const ticketId = `TKT-${dateStr}-${randomSuffix}`;

      await supabase
        .from('conversaciones')
        .update({
          area: resultado.derivacion.area,
          estado: 'derivada',
          router_estado: 'derivado',
          desconectado_motivo: resultado.derivacion.mensaje_contexto,
        })
        .eq('id', conversacion.id);

      await supabase.from('mensajes').insert({
        conversacion_id: conversacion.id,
        mensaje: `🤖 WSP4 → ${resultado.derivacion.area} → ${resultado.derivacion.mensaje_contexto}`,
        tipo: 'text',
        direccion: 'entrante',
        remitente_tipo: 'sistema',
        remitente_nombre: 'Router WSP4',
      });

      const { data: ticketData } = await supabase.from('tickets').insert({
        conversacion_id: conversacion.id,
        telefono: telNormalizado,
        ticket_id: ticketId,
        area: resultado.derivacion.area,
        estado: 'abierto',
        prioridad: 'normal',
        area_origen: 'wsp4',
        area_destino: resultado.derivacion.area,
        subetiqueta: resultado.derivacion.subetiqueta,
        metadata: {
          menu_option: listReplyId,
          mensaje_contexto: resultado.derivacion.mensaje_contexto,
          nombre_contacto: nombreContacto,
        },
      }).select('id').single();

      await supabase.from('derivaciones').insert({
        conversacion_id: conversacion.id,
        telefono: telNormalizado,
        area_origen: 'wsp4',
        area_destino: resultado.derivacion.area,
        motivo: resultado.derivacion.mensaje_contexto,
        menu_option_selected: listReplyId,
        subetiqueta: resultado.derivacion.subetiqueta,
        ticket_id: ticketData?.id,
        status: 'completada',
        ts_derivacion: now.toISOString(),
        sistema_version: '4.3.0',
        nodo_procesador: 'centralwap-router',
      });

      await supabase.from('audit_log').insert({
        accion: 'derivacion_menu_interactivo',
        tabla_afectada: 'conversaciones',
        registro_id: conversacion.id,
        valores_nuevos: {
          area: resultado.derivacion.area,
          estado: 'derivada',
          router_estado: 'derivado',
          ticket_id: ticketId,
          subetiqueta: resultado.derivacion.subetiqueta,
        },
        motivo: `Derivación desde menú interactivo: ${resultado.derivacion.mensaje_contexto}`,
        origen: 'router-wsp4',
        detalles: `Usuario seleccionó: ${listReplyId} → ${resultado.derivacion.area}`,
      });

      if (resultado.mensajeConfirmacion) {
        await interactiveService.enviarTexto(telefono, resultado.mensajeConfirmacion);
      }

      console.log(`[WSP4-Interactive] ✅ Derivación completada: ${ticketId}`);
      return { success: true, action: 'derivado', ticketId };
    }

    return { success: false, action: 'unknown' };

  } catch (error) {
    console.error('[WSP4-Interactive] Error:', error);
    return { success: false, action: 'error' };
  }
}

// ===========================================
// GUARDAR MENSAJE SIMPLE (sin procesar menú)
// ===========================================
async function guardarMensajeSimple(
  convId: string,
  mensaje: string,
  nombreContacto?: string,
  mediaType?: string,
  mediaUrl?: string,
  wamid?: string,
  contextMessageId?: string
): Promise<void> {
  await supabase.from('mensajes').insert({
    conversacion_id: convId,
    mensaje: mensaje,
    tipo: mediaType || 'text',
    direccion: 'entrante',
    remitente_tipo: 'contacto',
    remitente_nombre: nombreContacto,
    media_url: mediaUrl,
    media_type: mediaType,
    whatsapp_message_id: wamid,
    whatsapp_context_id: contextMessageId,
  });

  await supabase
    .from('conversaciones')
    .update({
      ultimo_mensaje: mensaje,
      ts_ultimo_mensaje: new Date().toISOString(),
    })
    .eq('id', convId);
}

// ===========================================
// RUTAS
// ===========================================

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await routerController.health();
    res.json({
      ...health,
      version: '4.3.0',
      environment: NODE_ENV,
      features: ['interactive_menus_only', 'dynamic_courses', 'no_numeric_menu'],
      endpoints: [
        '/webhook/whatsapp/wsp4',
        '/webhook/whatsapp/ventas',
        '/webhook/evolution/administracion',
        '/webhook/evolution/alumnos',
        '/webhook/evolution/comunidad',
      ],
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ===========================================
// WEBHOOK WSP4 (PRINCIPAL - ROUTER)
// ===========================================
app.post('/webhook/whatsapp/wsp4', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    let mensajeTexto = '';
    console.log("[WSP4] Body recibido:", JSON.stringify(body).substring(0, 500));
    let mediaType: string | undefined;
    let mediaId: string | undefined;
    let mediaUrl: string | undefined;
    let wamid: string | undefined;
    let nombreContacto: string | undefined;
    let telefonoExtraido: string | undefined;
    let reactionMessageId: string | undefined;
    let reactionEmoji: string | undefined;
    let contextMessageId: string | undefined;
    let listReplyId: string | undefined;
    let buttonReplyId: string | undefined;

    if (body.messages && Array.isArray(body.messages) && body.messages[0]) {
      const msg = body.messages[0];
      wamid = msg.id;
      telefonoExtraido = msg.from;
      const tipo = msg.type;

      if (msg.context && msg.context.id) {
        contextMessageId = msg.context.id;
      }

      if (tipo === 'text' && msg.text) {
        mensajeTexto = msg.text.body || '';
      } else if (tipo === 'image' && msg.image) {
        mediaType = 'image';
        mediaId = msg.image.id;
        mensajeTexto = msg.image.caption || '[Imagen]';
        mediaUrl = body.media_url || body.mediaUrl;
      } else if (tipo === 'audio' && msg.audio) {
        mediaType = 'audio';
        mediaId = msg.audio.id;
        mensajeTexto = '[Audio]';
        mediaUrl = body.media_url || body.mediaUrl;
      } else if (tipo === 'video' && msg.video) {
        mediaType = 'video';
        mediaId = msg.video.id;
        mensajeTexto = msg.video.caption || '[Video]';
        mediaUrl = body.media_url || body.mediaUrl;
      } else if (tipo === 'document' && msg.document) {
        mediaType = 'document';
        mediaId = msg.document.id;
        mensajeTexto = msg.document.filename || '[Documento]';
        mediaUrl = body.media_url || body.mediaUrl;
      } else if (tipo === 'sticker' && msg.sticker) {
        mediaType = 'sticker';
        mediaId = msg.sticker.id;
        mensajeTexto = '[Sticker]';
        mediaUrl = body.media_url || body.mediaUrl;
      } else if (tipo === 'reaction' && msg.reaction) {
        mediaType = 'reaction';
        reactionEmoji = msg.reaction.emoji || '';
        reactionMessageId = msg.reaction.message_id;
      } else if (tipo === 'location' && msg.location) {
        mediaType = 'location';
        mensajeTexto = `[Ubicación: ${msg.location.latitude}, ${msg.location.longitude}]`;
      } else if (tipo === 'contacts' && msg.contacts) {
        mediaType = 'contact';
        mensajeTexto = '[Contacto compartido]';
      } else if (tipo === 'interactive' && msg.interactive) {
        if (msg.interactive.type === 'list_reply' && msg.interactive.list_reply) {
          mediaType = 'list_reply';
          listReplyId = msg.interactive.list_reply.id;
          mensajeTexto = msg.interactive.list_reply.title || listReplyId;
          console.log(`[WSP4] List reply recibido: ${listReplyId}`);
        } else if (msg.interactive.type === 'button_reply' && msg.interactive.button_reply) {
          mediaType = 'button_reply';
          buttonReplyId = msg.interactive.button_reply.id;
          mensajeTexto = msg.interactive.button_reply.title || buttonReplyId;
          console.log(`[WSP4] Button reply recibido: ${buttonReplyId}`);
        }
      }
    }

    if (body.contacts && Array.isArray(body.contacts) && body.contacts[0]) {
      nombreContacto = body.contacts[0].profile?.name;
    }

    // === PROCESAR REACCIONES ===
    if (mediaType === 'reaction' && reactionMessageId) {
      const telefono = telefonoExtraido || body.telefono || body.phone || body.from;
      if (!telefono) {
        res.status(400).json({ success: false, error: 'Falta teléfono para reacción' });
        return;
      }
      const resultado = await procesarReaccionEntrante(telefono, reactionEmoji || '', reactionMessageId);
      res.json(resultado);
      return;
    }

    // === PROCESAR RESPUESTAS DE LISTAS INTERACTIVAS ===
    if (mediaType === 'list_reply' && listReplyId) {
      const telefono = telefonoExtraido || body.telefono;
      if (!telefono) {
        res.status(400).json({ success: false, error: 'Falta teléfono' });
        return;
      }
      const resultado = await procesarMenuInteractivo(telefono, listReplyId, nombreContacto);
      res.json(resultado);
      return;
    }

    // === PROCESAR RESPUESTAS DE BOTONES INTERACTIVOS ===
    if (mediaType === 'button_reply' && buttonReplyId) {
      const telefono = telefonoExtraido || body.telefono;
      if (!telefono) {
        res.status(400).json({ success: false, error: 'Falta teléfono' });
        return;
      }
      const resultado = await procesarMenuInteractivo(telefono, buttonReplyId, nombreContacto);
      res.json(resultado);
      return;
    }

    // === PROCESAR MENSAJES DE TEXTO/MULTIMEDIA ===
    const telefono = telefonoExtraido || body.telefono || body.phone || body.from || body.remoteJid;
    const mensaje = mensajeTexto || body.mensaje || body.message || body.text || body.body || body.contenido || '';

    if (!telefono) {
      res.status(400).json({ success: false, error: 'Falta campo telefono' });
      return;
    }

    if (!mensaje) {
      res.status(400).json({ success: false, error: 'Falta campo mensaje' });
      return;
    }

    const telNormalizado = telefono.startsWith('+') ? telefono : '+' + telefono;

    const { data: convExistente } = await supabase
      .from('conversaciones')
      .select('id, router_estado, estado')
      .eq('telefono', telNormalizado)
      .eq('linea_origen', 'wsp4')
      .single();

    // === VERIFICAR SI ES COMANDO MENU/VOLVER ===
    const comando = interactiveMenuProcessor.esComandoEspecial(mensaje);
    if (comando === 'MENU' || comando === 'VOLVER') {
      console.log(`[WSP4] Comando ${comando} recibido, enviando menú interactivo`);

      if (convExistente) {
        await supabase
          .from('conversaciones')
          .update({
            estado: 'activa',
            router_estado: 'menu_principal',
            menu_actual: 'principal',
          })
          .eq('id', convExistente.id);
      }

      await interactiveService.enviarListaInteractiva(telefono, MENU_PRINCIPAL_INTERACTIVO);
      res.json({ success: true, action: 'menu_enviado' });
      return;
    }

    // === SI ESTÁ DERIVADA: SOLO GUARDAR MENSAJE ===
    if (convExistente && (convExistente.router_estado === 'derivado' || convExistente.estado === 'derivada')) {
      console.log(`[WSP4] Conversación derivada - guardando mensaje para agente`);
      await guardarMensajeSimple(convExistente.id, mensaje, nombreContacto, mediaType, mediaUrl, wamid, contextMessageId);
      res.json({ success: true, action: 'mensaje_guardado', derivada: true });
      return;
    }

    // === CONVERSACIÓN NUEVA O EN MENÚ: ENVIAR MENÚ INTERACTIVO ===
    if (!convExistente || !convExistente.router_estado || convExistente.router_estado === 'menu_principal' || convExistente.router_estado.startsWith('submenu_')) {
      console.log(`[WSP4] Conversación nueva o en menú, enviando menú interactivo`);

      if (!convExistente) {
        await conversacionService.obtenerOCrear({
          telefono: telNormalizado,
          linea_origen: 'wsp4',
          area: 'wsp4',
          estado: 'activa',
          iniciado_por: 'usuario',
        });
      }

      await interactiveService.enviarListaInteractiva(telefono, MENU_PRINCIPAL_INTERACTIVO);
      res.json({ success: true, action: 'menu_enviado' });
      return;
    }

    // === CASO EDGE: Guardar mensaje y enviar menú ===
    console.log(`[WSP4] Caso no manejado - guardando mensaje y enviando menú`);
    if (convExistente) {
      await guardarMensajeSimple(convExistente.id, mensaje, nombreContacto, mediaType, mediaUrl, wamid, contextMessageId);
    }
    await interactiveService.enviarListaInteractiva(telefono, MENU_PRINCIPAL_INTERACTIVO);
    res.json({ success: true, action: 'menu_enviado_edge' });

  } catch (error) {
    console.error('[WSP4] Error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error interno' });
  }
});

// ===========================================
// WEBHOOK VENTAS (CLOUD API)
// ===========================================
app.post('/webhook/whatsapp/ventas', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const messages = body.messages || [];
    const msg = messages[0];

    if (msg && msg.type === 'reaction' && msg.reaction) {
      const telefono = '+' + msg.from;
      const emoji = msg.reaction.emoji || '';
      const reactionMessageId = msg.reaction.message_id;

      if (reactionMessageId) {
        const resultado = await procesarReaccionEntrante(telefono, emoji, reactionMessageId);
        res.json(resultado);
        return;
      }
    }

    const payload = normalizarCloudAPIPayload(body);
    if (!payload || !payload.telefono || !payload.mensaje) {
      res.json({ success: true, ignored: true, reason: 'Payload vacío o inválido' });
      return;
    }
    const resultado = await procesarMensajeLineaSecundaria('ventas', payload);
    res.json(resultado);
  } catch (error) {
    console.error('[Ventas] Error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error interno' });
  }
});

// ===========================================
// WEBHOOK ADMINISTRACIÓN (EVOLUTION API)
// ===========================================
app.post('/webhook/evolution/administracion', async (req: Request, res: Response) => {
  try {
    console.log('[Admin] Payload recibido:', JSON.stringify(req.body, null, 2).substring(0, 1000));

    const body = req.body;

    if (body.tipo === 'reaction' && body.reactionToMessageId) {
      console.log('[Admin] Procesando reacción:', body.emoji, 'al mensaje:', body.reactionToMessageId);
      const resultado = await procesarReaccionEntrante(
        body.telefono,
        body.emoji || '',
        body.reactionToMessageId
      );
      res.json(resultado);
      return;
    }

    let payload;
    if (body.telefono) {
      payload = {
        telefono: body.telefono,
        mensaje: body.mensaje || '',
        nombre: body.nombre || '',
        messageId: body.messageId || '',
        mediaType: body.mediaType || body.media_type,
        mediaUrl: body.mediaUrl || body.media_url,
        contextMessageId: body.contextMessageId,
      };
    } else {
      payload = normalizarEvolutionPayload(body, 'administracion');
    }

    if (!payload || !payload.telefono) {
      res.json({ success: true, ignored: true, reason: 'Sin teléfono' });
      return;
    }

    if (!payload.mensaje && payload.mediaUrl) {
      const placeholders: Record<string, string> = {
        'image': '[Imagen]',
        'audio': '[Audio]',
        'video': '[Video]',
        'document': '[Documento]',
        'sticker': '[Sticker]'
      };
      payload.mensaje = placeholders[payload.mediaType || ''] || '[Multimedia]';
    }

    if (!payload.mensaje) {
      res.json({ success: true, ignored: true, reason: 'Sin mensaje ni multimedia' });
      return;
    }

    const resultado = await procesarMensajeLineaSecundaria('administracion', payload);
    res.json(resultado);
  } catch (error) {
    console.error('[Administracion] Error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error interno' });
  }
});

// ===========================================
// WEBHOOK ALUMNOS (EVOLUTION API)
// ===========================================
app.post('/webhook/evolution/alumnos', async (req: Request, res: Response) => {
  try {
    let payload;
    if (req.body.telefono && req.body.mensaje !== undefined) {
      payload = {
        telefono: req.body.telefono,
        mensaje: req.body.mensaje,
        nombre: req.body.nombre || '',
        messageId: req.body.messageId || '',
        mediaType: req.body.mediaType,
        mediaUrl: req.body.media_url,
        contextMessageId: req.body.contextMessageId,
      };
    } else {
      payload = normalizarEvolutionPayload(req.body, 'alumnos');
    }
    if (!payload || !payload.telefono || !payload.mensaje) {
      res.json({ success: true, ignored: true, reason: 'Payload vacío o inválido' });
      return;
    }
    const resultado = await procesarMensajeLineaSecundaria('alumnos', payload);
    res.json(resultado);
  } catch (error) {
    console.error('[Alumnos] Error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error interno' });
  }
});

// ===========================================
// WEBHOOK COMUNIDAD (EVOLUTION API)
// ===========================================
app.post('/webhook/evolution/comunidad', async (req: Request, res: Response) => {
  try {
    let payload;
    if (req.body.telefono && req.body.mensaje !== undefined) {
      payload = {
        telefono: req.body.telefono,
        mensaje: req.body.mensaje,
        nombre: req.body.nombre || '',
        messageId: req.body.messageId || '',
        mediaType: req.body.mediaType,
        mediaUrl: req.body.media_url,
        contextMessageId: req.body.contextMessageId,
      };
    } else {
      payload = normalizarEvolutionPayload(req.body, 'comunidad');
    }
    if (!payload || !payload.telefono || !payload.mensaje) {
      res.json({ success: true, ignored: true, reason: 'Payload vacío o inválido' });
      return;
    }
    const resultado = await procesarMensajeLineaSecundaria('comunidad', payload);
    res.json(resultado);
  } catch (error) {
    console.error('[Comunidad] Error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error interno' });
  }
});

// ===========================================
// WEBHOOK VENTAS (EVOLUTION API)
// ===========================================
app.post('/webhook/evolution/ventas', async (req: Request, res: Response) => {
  try {
    console.log('[Ventas] Payload recibido:', JSON.stringify(req.body, null, 2).substring(0, 1000));
    const body = req.body;

    if (body.tipo === 'reaction' && body.reactionToMessageId) {
      console.log('[Ventas] Procesando reacción:', body.emoji, 'al mensaje:', body.reactionToMessageId);
      const resultado = await procesarReaccionEntrante(
        body.telefono,
        body.emoji || '',
        body.reactionToMessageId
      );
      res.json(resultado);
      return;
    }

    let payload;
    if (body.telefono) {
      payload = {
        telefono: body.telefono,
        mensaje: body.mensaje || '',
        nombre: body.nombre || '',
        messageId: body.messageId || '',
        mediaType: body.mediaType || body.media_type,
        mediaUrl: body.mediaUrl || body.media_url,
        contextMessageId: body.contextMessageId,
      };
    } else {
      payload = normalizarEvolutionPayload(body, 'ventas');
    }

    if (!payload || !payload.telefono) {
      res.json({ success: true, ignored: true, reason: 'Sin teléfono' });
      return;
    }

    if (!payload.mensaje && payload.mediaUrl) {
      const placeholders: Record<string, string> = {
        'image': '[Imagen]', 'audio': '[Audio]', 'video': '[Video]',
        'document': '[Documento]', 'sticker': '[Sticker]'
      };
      payload.mensaje = placeholders[payload.mediaType || ''] || '[Multimedia]';
    }

    if (!payload.mensaje) {
      res.json({ success: true, ignored: true, reason: 'Sin mensaje ni multimedia' });
      return;
    }

    const esDesdeWeb = payload.mensaje.startsWith('🌐');

    if (esDesdeWeb) {
      console.log('[Ventas] Mensaje desde botón web detectado');

      payload.mensaje = payload.mensaje.replace(/^🌐\s*/, '').trim() || 'Consulta desde web';

      let contacto = await supabase
        .from('contactos')
        .select('*')
        .eq('telefono', payload.telefono)
        .single();

      if (!contacto.data) {
        const nuevoContacto = await supabase
          .from('contactos')
          .insert({
            telefono: payload.telefono,
            nombre: payload.nombre || null,
            origen: 'web',
            tipo: 'lead',
            activo: true
          })
          .select()
          .single();
        contacto = nuevoContacto;
        console.log('[Ventas] Contacto creado con origen web:', payload.telefono);
      } else if (contacto.data.origen !== 'web') {
        await supabase
          .from('contactos')
          .update({ origen: 'web' })
          .eq('id', contacto.data.id);
      }

      let conversacion = await supabase
        .from('conversaciones')
        .select('*')
        .eq('telefono', payload.telefono)
        .eq('inbox_id', 'ventas')
        .in('estado', ['abierta', 'en_menu', 'esperando', 'derivada'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!conversacion.data) {
        const nuevaConv = await supabase
          .from('conversaciones')
          .insert({
            telefono: payload.telefono,
            contacto_id: contacto.data?.id,
            nombre: payload.nombre || contacto.data?.nombre || null,
            canal: 'whatsapp',
            inbox_id: 'ventas',
            inbox_name: 'Ventas',
            area: 'ventas',
            linea_origen: 'ventas',
            estado: 'abierta',
            ultimo_mensaje: payload.mensaje,
            ts_ultimo_mensaje: new Date().toISOString(),
            origen: 'web'
          })
          .select()
          .single();
        conversacion = nuevaConv;
        console.log('[Ventas] Conversación creada para web:', payload.telefono);
      } else {
        await supabase
          .from('conversaciones')
          .update({
            ultimo_mensaje: payload.mensaje,
            ts_ultimo_mensaje: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', conversacion.data.id);
      }

      await supabase.from('mensajes').insert({
        conversacion_id: conversacion.data?.id,
        telefono: payload.telefono,
        mensaje: payload.mensaje,
        tipo: payload.mediaType || 'text',
        direccion: 'entrante',
        media_url: payload.mediaUrl || null,
        media_type: payload.mediaType || null,
        remitente_tipo: 'contacto',
        remitente_nombre: payload.nombre || null,
        whatsapp_message_id: payload.messageId || null,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, action: 'mensaje_web_guardado', origen: 'web' });
      return;
    }

    const resultado = await procesarMensajeLineaSecundaria('ventas', payload);
    res.json(resultado);

  } catch (error) {
    console.error('[Ventas] Error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error interno' });
  }
});

// ===========================================
// WEBHOOK EVOLUTION GENÉRICO
// ===========================================
app.post('/webhook/evolution', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const data = body.data || body;
    const message = data.message || {};

    if (message.reactionMessage) {
      const telefono = data.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
      const emoji = message.reactionMessage.text || '';
      const reactionMessageId = message.reactionMessage.key?.id || '';

      if (telefono && reactionMessageId) {
        const resultado = await procesarReaccionEntrante(telefono, emoji, reactionMessageId);
        res.json(resultado);
        return;
      }
    }

    const telefono = data.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
    const mensaje = message.conversation || message.extendedTextMessage?.text || '';

    if (!telefono || !mensaje) {
      res.json({ success: true, ignored: true });
      return;
    }

    const telNormalizado = telefono.startsWith('+') ? telefono : '+' + telefono;

    const { data: conv } = await supabase
      .from('conversaciones')
      .select('id')
      .eq('telefono', telNormalizado)
      .eq('linea_origen', 'wsp4')
      .single();

    if (conv) {
      await guardarMensajeSimple(conv.id, mensaje, data.pushName);
      res.json({ success: true, action: 'mensaje_guardado' });
    } else {
      const { conversacion } = await conversacionService.obtenerOCrear({
        telefono: telNormalizado,
        linea_origen: 'wsp4',
        area: 'wsp4',
        estado: 'activa',
        iniciado_por: 'usuario',
      });
      await interactiveService.enviarListaInteractiva(telefono, MENU_PRINCIPAL_INTERACTIVO);
      res.json({ success: true, action: 'menu_enviado' });
    }

  } catch (error) {
    console.error('[Evolution] Error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error interno' });
  }
});

// Endpoint de prueba manual (solo dev)
app.post('/test', async (req: Request, res: Response) => {
  if (NODE_ENV === 'production') {
    res.status(403).json({ error: 'No disponible en producción' });
    return;
  }

  try {
    const { telefono, mensaje } = req.body;
    if (!telefono || !mensaje) {
      res.status(400).json({ error: 'Requiere telefono y mensaje' });
      return;
    }

    await interactiveService.enviarListaInteractiva(telefono, MENU_PRINCIPAL_INTERACTIVO);
    res.json({ success: true, action: 'menu_enviado_test' });

  } catch (error) {
    console.error('[Test] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error interno' });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint no encontrado', path: req.path });
});

// Error handler global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error Global]', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ===========================================
// INICIAR SERVIDOR
// ===========================================
async function iniciar() {
  console.log('='.repeat(50));
  console.log('PSI ROUTER v4.3.0 - Con Cursos Dinámicos');
  console.log('='.repeat(50));

  console.log('[Startup] Verificando conexión a Supabase...');
  const conectado = await verificarConexion();

  if (!conectado) {
    console.error('[Startup] ❌ No se pudo conectar a Supabase');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[Startup] ✅ Servidor iniciado en puerto ${PORT}`);
    console.log(`[Startup] Ambiente: ${NODE_ENV}`);
    console.log(`[Startup] Features: Menú interactivo + Cursos dinámicos`);
    console.log(`[Startup] Endpoints:`);
    console.log(`  - /webhook/whatsapp/wsp4 (Router principal)`);
    console.log(`  - /webhook/whatsapp/ventas (Cloud API)`);
    console.log(`  - /webhook/evolution/administracion`);
    console.log(`  - /webhook/evolution/alumnos`);
    console.log(`  - /webhook/evolution/comunidad`);
    console.log('='.repeat(50));
  });
}

process.on('SIGTERM', () => {
  console.log('[Shutdown] Recibido SIGTERM, cerrando...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Shutdown] Recibido SIGINT, cerrando...');
  process.exit(0);
});

iniciar().catch(err => {
  console.error('[Startup] Error fatal:', err);
  process.exit(1);
});
