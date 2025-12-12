// ===========================================
// PSI ROUTER - SERVIDOR PRINCIPAL
// Versión 3.4.0 - Endpoints líneas secundarias + mensaje educativo
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

    // Extraer teléfono con jerarquía correcta
    let telefonoRaw: string | null = null;

    // 1. remoteJidAlt con @s.whatsapp.net
    if (key.remoteJidAlt && key.remoteJidAlt.includes('@s.whatsapp.net')) {
      telefonoRaw = key.remoteJidAlt;
    }
    // 2. sender con @s.whatsapp.net
    else if (data.sender && data.sender.includes('@s.whatsapp.net')) {
      telefonoRaw = data.sender;
    }
    // 3. remoteJid con @s.whatsapp.net (NO @lid)
    else if (key.remoteJid && key.remoteJid.includes('@s.whatsapp.net')) {
      telefonoRaw = key.remoteJid;
    }

    if (!telefonoRaw) {
      console.error(`[${linea}] No se pudo extraer teléfono válido`);
      return null;
    }

    const telefono = '+' + telefonoRaw.replace('@s.whatsapp.net', '');
    const nombre = data.pushName || '';
    const messageId = key.id || '';

    // Extraer mensaje
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

    // Context (mensaje citado)
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

    // 1. Buscar conversación existente para esta línea
    const conversacionExistente = await conversacionService.buscarPorTelefonoYLinea(
      payload.telefono,
      linea
    );

    // 2. Determinar si debemos enviar mensaje educativo
    let enviarEducativo = true;

    if (conversacionExistente) {
      const iniciadoPorAgente = conversacionExistente.iniciado_por === 'agente';
      const ventanaActiva = conversacionExistente.ventana_24h_activa &&
        conversacionExistente.ventana_24h_fin &&
        new Date(conversacionExistente.ventana_24h_fin) > new Date();

      if (iniciadoPorAgente && ventanaActiva) {
        enviarEducativo = false;
        console.log(`[${linea}] Conversación iniciada por agente, ventana activa. NO enviar educativo.`);

        // Renovar ventana 24h
        await conversacionService.renovarVentana24h(conversacionExistente.id);
      }
    }

    // 3. Obtener o crear conversación
    const { conversacion } = await conversacionService.obtenerOCrear({
      telefono: payload.telefono,
      linea_origen: linea,
      area: linea,
      estado: 'activa',
      iniciado_por: 'usuario',
    });

    // 4. Guardar mensaje entrante
    const mensajeData: MensajeInsert = {
      conversacion_id: conversacion.id,
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

    // 5. Actualizar último mensaje
    await conversacionService.actualizarUltimoMensaje(conversacion.id, payload.mensaje);

    // 6. Enviar mensaje educativo si corresponde
    if (enviarEducativo) {
      console.log(`[${linea}] Enviando mensaje educativo a ${payload.telefono}`);

      const resultadoEnvio = await webhookService.enviarMensajeViaWebhook({
        linea: linea,
        telefono: payload.telefono,
        mensaje: MENSAJE_EDUCATIVO,
        conversacion_id: conversacion.id,
        tipo: 'text',
        remitente: 'sistema',
      });

      if (resultadoEnvio.success) {
        // Guardar mensaje saliente (educativo)
        await supabase.from('mensajes').insert({
          conversacion_id: conversacion.id,
          mensaje: MENSAJE_EDUCATIVO,
          tipo: 'text',
          direccion: 'saliente',
          remitente_tipo: 'sistema',
        });
      }

      return { success: true, action: 'mensaje_educativo', enviado_educativo: true };
    }

    return { success: true, action: 'mensaje_guardado', enviado_educativo: false };

  } catch (error) {
    console.error(`[${linea}] Error procesando mensaje:`, error);
    return { success: false, action: 'error', enviado_educativo: false };
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
      version: '3.4.0',
      environment: NODE_ENV,
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
    let mediaType: string | undefined;
    let mediaId: string | undefined;
    let mediaUrl: string | undefined;
    let wamid: string | undefined;
    let nombreContacto: string | undefined;
    let telefonoExtraido: string | undefined;
    let reactionMessageId: string | undefined;
    let reactionEmoji: string | undefined;
    let contextMessageId: string | undefined;

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
      }
    }

    if (body.contacts && Array.isArray(body.contacts) && body.contacts[0]) {
      nombreContacto = body.contacts[0].profile?.name;
    }

    // Procesar reacciones
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

    const incoming: WhatsAppIncoming = {
      telefono: telefono,
      mensaje: mensaje,
      nombre: nombreContacto || body.nombre || body.name || body.pushName,
      timestamp: body.timestamp || new Date().toISOString(),
      messageId: wamid || body.whatsapp_message_id || body.messageId,
      mediaType: mediaType || body.mediaType,
      mediaUrl: mediaUrl || body.mediaUrl,
      mediaId: mediaId,
      contextMessageId: contextMessageId || body.whatsapp_context_id,
      linea: 'wsp4',
      utm_source: body.utm_source,
      utm_campaign: body.utm_campaign,
      es_lead_meta: body.es_lead_meta || false,
    };

    const resultado = await routerController.procesarMensaje(incoming);
    res.json(resultado);

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
    const payload = normalizarCloudAPIPayload(req.body);

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
    const payload = normalizarEvolutionPayload(req.body, 'administracion');

    if (!payload || !payload.telefono || !payload.mensaje) {
      res.json({ success: true, ignored: true, reason: 'Payload vacío o inválido' });
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
    const payload = normalizarEvolutionPayload(req.body, 'alumnos');

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
    const payload = normalizarEvolutionPayload(req.body, 'comunidad');

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
// WEBHOOK EVOLUTION GENÉRICO (LEGACY)
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
    console.error('[Evolution] Error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error interno' });
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

    const resultado = await routerController.procesarMensaje({ telefono, mensaje, linea: 'wsp4' });
    res.json(resultado);

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
  console.log('PSI ROUTER v3.4.0 - Líneas secundarias');
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
