// ===========================================
// PSI ROUTER - SERVIDOR PRINCIPAL
// Versión 2.4.0 - Agregado soporte para mensajes citados (context)
// ===========================================
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { routerController } from './core/RouterController';
import { verificarConexion, supabase } from './config/supabase';
import { WhatsAppIncoming } from './types/database';

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
// FUNCIÓN PARA EXTRAER SUFIJO ÚNICO DEL WAMID
// El wamid contiene: [header][teléfono][separador][ID_ÚNICO]
// El ID_ÚNICO es igual independiente de quién ve el mensaje
// ===========================================
function extraerSufijoWamid(wamid: string): string | null {
  try {
    // Quitar prefijo "wamid."
    const base64Part = wamid.replace('wamid.', '');

    // Decodificar base64
    const decoded = Buffer.from(base64Part, 'base64').toString('binary');

    // El sufijo único está después del separador (bytes 15 02 00 11 18 12)
    // Buscamos la posición del separador y extraemos lo que sigue
    const separatorIndex = decoded.indexOf('\x15\x02\x00\x11\x18\x12');

    if (separatorIndex !== -1) {
      // Extraer el ID único (después del separador, sin el null byte final)
      const sufijo = decoded.substring(separatorIndex + 6).replace(/\x00/g, '');
      console.log(`[WAMID] Sufijo extraído: ${sufijo}`);
      return sufijo;
    }

    // Fallback: tomar los últimos 18-20 caracteres del decoded
    const fallback = decoded.slice(-20).replace(/[\x00-\x1f]/g, '');
    console.log(`[WAMID] Sufijo fallback: ${fallback}`);
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
    // Buscar mensajes y filtrar por sufijo
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
          console.log(`[Reacción] ✅ Mensaje encontrado por sufijo: ${msg.id}`);
          return { id: msg.id, conversacion_id: msg.conversacion_id };
        }
      }
    }

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

    // Extraer sufijo del wamid de la reacción
    const sufijoReaccion = extraerSufijoWamid(reactionMessageId);

    if (!sufijoReaccion) {
      console.warn(`[Reacción] ⚠️ No se pudo extraer sufijo de: ${reactionMessageId}`);
      return { success: false, message: 'No se pudo procesar el ID del mensaje' };
    }

    // Si emoji está vacío, es una eliminación de reacción
    if (!emoji) {
      const mensajeOriginal = await buscarMensajePorSufijo(sufijoReaccion);

      if (mensajeOriginal) {
        await supabase
          .from('mensaje_reacciones')
          .delete()
          .eq('mensaje_id', mensajeOriginal.id)
          .is('usuario_id', null);

        console.log(`[Reacción] ✅ Reacción eliminada del mensaje ${mensajeOriginal.id}`);
      }

      return { success: true, message: 'Reacción eliminada' };
    }

    // Buscar el mensaje por sufijo
    const mensajeOriginal = await buscarMensajePorSufijo(sufijoReaccion);

    if (!mensajeOriginal) {
      console.warn(`[Reacción] ⚠️ No se encontró mensaje con sufijo: ${sufijoReaccion}`);
      return { success: false, message: 'Mensaje original no encontrado' };
    }

    // Verificar si ya existe una reacción del contacto en este mensaje
    const { data: reaccionExistente } = await supabase
      .from('mensaje_reacciones')
      .select('id, emoji')
      .eq('mensaje_id', mensajeOriginal.id)
      .is('usuario_id', null)
      .single();

    if (reaccionExistente) {
      if (reaccionExistente.emoji === emoji) {
        await supabase
          .from('mensaje_reacciones')
          .delete()
          .eq('id', reaccionExistente.id);

        console.log(`[Reacción] ✅ Reacción ${emoji} eliminada (toggle)`);
        return { success: true, message: 'Reacción eliminada (toggle)' };
      } else {
        await supabase
          .from('mensaje_reacciones')
          .update({ emoji, created_at: new Date().toISOString() })
          .eq('id', reaccionExistente.id);

        console.log(`[Reacción] ✅ Reacción actualizada de ${reaccionExistente.emoji} a ${emoji}`);
        return { success: true, message: 'Reacción actualizada' };
      }
    }

    // Insertar nueva reacción
    const { error: insertError } = await supabase
      .from('mensaje_reacciones')
      .insert({
        mensaje_id: mensajeOriginal.id,
        usuario_id: null,
        emoji: emoji,
      });

    if (insertError) {
      console.error(`[Reacción] ❌ Error insertando:`, insertError);
      return { success: false, message: insertError.message };
    }

    console.log(`[Reacción] ✅ Reacción ${emoji} guardada en mensaje ${mensajeOriginal.id}`);
    return { success: true, message: 'Reacción guardada' };

  } catch (error) {
    console.error('[Reacción] Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Error desconocido' };
  }
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
      version: '2.4.0',
      environment: NODE_ENV,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Webhook principal para mensajes de WhatsApp
app.post('/webhook/whatsapp/wsp4', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // =========================================
    // EXTRACCIÓN DE DATOS DE WHATSAPP CLOUD API
    // =========================================
    let mensajeTexto = '';
    let mediaType: string | undefined;
    let mediaId: string | undefined;
    let mediaUrl: string | undefined;
    let wamid: string | undefined;
    let nombreContacto: string | undefined;
    let telefonoExtraido: string | undefined;
    let reactionMessageId: string | undefined;
    let reactionEmoji: string | undefined;
    let contextMessageId: string | undefined;  // NUEVO: ID del mensaje citado

    // Si viene el array messages de WhatsApp Cloud API
    if (body.messages && Array.isArray(body.messages) && body.messages[0]) {
      const msg = body.messages[0];
      wamid = msg.id;
      telefonoExtraido = msg.from;
      const tipo = msg.type;

      // NUEVO: Extraer context si existe (mensaje citado)
      if (msg.context && msg.context.id) {
        contextMessageId = msg.context.id;
        console.log(`[Router] Mensaje cita a: ${contextMessageId}`);
      }

      if (tipo === 'text' && msg.text) {
        mensajeTexto = msg.text.body || '';
      } else if (tipo === 'image' && msg.image) {
        mediaType = 'image';
        mediaId = msg.image.id;
        mensajeTexto = msg.image.caption || '[Imagen]';
      } else if (tipo === 'audio' && msg.audio) {
        mediaType = 'audio';
        mediaId = msg.audio.id;
        mensajeTexto = '[Audio]';
      } else if (tipo === 'video' && msg.video) {
        mediaType = 'video';
        mediaId = msg.video.id;
        mensajeTexto = msg.video.caption || '[Video]';
      } else if (tipo === 'document' && msg.document) {
        mediaType = 'document';
        mediaId = msg.document.id;
        mensajeTexto = msg.document.filename || '[Documento]';
      } else if (tipo === 'sticker' && msg.sticker) {
        mediaType = 'sticker';
        mediaId = msg.sticker.id;
        mensajeTexto = '[Sticker]';
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
      }
    }

    // Extraer nombre del contacto si viene en contacts array
    if (body.contacts && Array.isArray(body.contacts) && body.contacts[0]) {
      nombreContacto = body.contacts[0].profile?.name;
    }

    // =========================================
    // PROCESAR REACCIONES (flujo especial)
    // =========================================
    if (mediaType === 'reaction' && reactionMessageId) {
      const telefono = telefonoExtraido || body.telefono || body.phone || body.from;

      if (!telefono) {
        res.status(400).json({ success: false, error: 'Falta teléfono para reacción' });
        return;
      }

      const resultado = await procesarReaccionEntrante(
        telefono,
        reactionEmoji || '',
        reactionMessageId
      );

      res.json(resultado);
      return;
    }

    // =========================================
    // VALIDACIÓN DE PAYLOAD (mensajes normales)
    // =========================================
    const telefono = telefonoExtraido || body.telefono || body.phone || body.from || body.remoteJid;
    const mensaje = mensajeTexto || body.mensaje || body.message || body.text || body.body || body.contenido || '';

    if (!telefono) {
      res.status(400).json({
        success: false,
        error: 'Falta campo telefono/phone/from',
      });
      return;
    }

    if (!mensaje) {
      res.status(400).json({
        success: false,
        error: 'Falta campo mensaje/message/text/body/contenido',
      });
      return;
    }

    // =========================================
    // NORMALIZAR PAYLOAD
    // =========================================
    const incoming: WhatsAppIncoming = {
      telefono: telefono,
      mensaje: mensaje,
      nombre: nombreContacto || body.nombre || body.name || body.pushName || body.nombre_contacto,
      timestamp: body.timestamp || body.ts || new Date().toISOString(),
      messageId: wamid || body.whatsapp_message_id || body.messageId || body.message_id || body.id,
      mediaType: mediaType || body.mediaType || body.media_type || body.tipo,
      mediaUrl: mediaUrl || body.mediaUrl || body.media_url,
      mediaId: mediaId,
      contextMessageId: contextMessageId || body.whatsapp_context_id,  // NUEVO: pasar context
      linea: body.linea || body.inbox || 'wsp4',
      utm_source: body.utm_source,
      utm_campaign: body.utm_campaign,
      es_lead_meta: body.es_lead_meta || body.isLeadMeta || false,
    };

    console.log(`[Router] Mensaje tipo: ${incoming.mediaType || 'text'}, wamid: ${incoming.messageId || 'N/A'}${incoming.contextMessageId ? ', cita: ' + incoming.contextMessageId : ''}`);

    // Procesar mensaje
    const resultado = await routerController.procesarMensaje(incoming);

    res.json(resultado);

  } catch (error) {
    console.error('[Webhook] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno',
    });
  }
});

// Webhook alternativo (compatibilidad con Evolution API)
app.post('/webhook/evolution', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Evolution API envía estructura diferente
    const data = body.data || body;
    const message = data.message || {};

    // Detectar reacciones en Evolution API
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

    // Extraer context de Evolution API si existe
    let contextMessageId: string | undefined;
    if (message.extendedTextMessage?.contextInfo?.stanzaId) {
      contextMessageId = message.extendedTextMessage.contextInfo.stanzaId;
    }

    const incoming: WhatsAppIncoming = {
      telefono: data.key?.remoteJid?.replace('@s.whatsapp.net', '') || '',
      mensaje: message.conversation || message.extendedTextMessage?.text || '',
      nombre: data.pushName || '',
      timestamp: new Date().toISOString(),
      messageId: data.key?.id,
      mediaType: message.imageMessage ? 'image' : message.audioMessage ? 'audio' : undefined,
      mediaUrl: undefined,
      contextMessageId: contextMessageId,
      linea: 'wsp4',
    };

    if (!incoming.telefono || !incoming.mensaje) {
      res.json({ success: true, ignored: true });
      return;
    }

    const resultado = await routerController.procesarMensaje(incoming);
    res.json(resultado);

  } catch (error) {
    console.error('[Evolution Webhook] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno',
    });
  }
});

// Endpoint de prueba manual
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

    const resultado = await routerController.procesarMensaje({
      telefono,
      mensaje,
      linea: 'wsp4',
    });

    res.json(resultado);

  } catch (error) {
    console.error('[Test] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error interno',
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.path,
  });
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
  console.log('PSI ROUTER v2.4.0 - Soporte mensajes citados');
  console.log('='.repeat(50));

  // Verificar conexión a Supabase
  console.log('[Startup] Verificando conexión a Supabase...');
  const conectado = await verificarConexion();

  if (!conectado) {
    console.error('[Startup] ❌ No se pudo conectar a Supabase');
    process.exit(1);
  }

  // Iniciar servidor
  app.listen(PORT, () => {
    console.log(`[Startup] ✅ Servidor iniciado en puerto ${PORT}`);
    console.log(`[Startup] Ambiente: ${NODE_ENV}`);
    console.log(`[Startup] Health: http://localhost:${PORT}/health`);
    console.log(`[Startup] Webhook: http://localhost:${PORT}/webhook/whatsapp/wsp4`);
    console.log('='.repeat(50));
  });
}

// Manejar señales de terminación
process.on('SIGTERM', () => {
  console.log('[Shutdown] Recibido SIGTERM, cerrando...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Shutdown] Recibido SIGINT, cerrando...');
  process.exit(0);
});

// Iniciar
iniciar().catch(err => {
  console.error('[Startup] Error fatal:', err);
  process.exit(1);
});
