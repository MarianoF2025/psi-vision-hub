"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseService = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const enums_1 = require("../models/enums");
class DatabaseService {
    async buscarOCrearContacto(telefono, datos) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('contactos')
            .select('*')
            .eq('telefono', telefono)
            .maybeSingle();
        if (error) {
            logger_1.Logger.error('Error buscando contacto', { error });
            throw error;
        }
        if (data)
            return data;
        const nuevo = {
            telefono,
            nombre: datos?.nombre || telefono,
            ...datos,
        };
        const { data: insertData, error: insertError } = await supabase_1.supabaseAdmin
            .from('contactos')
            .insert(nuevo)
            .select()
            .single();
        if (insertError) {
            logger_1.Logger.error('Error creando contacto', { insertError });
            throw insertError;
        }
        return insertData;
    }
    async buscarOCrearConversacion(telefono, numeroOrigen, area = enums_1.Area.PSI_PRINCIPAL) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('conversaciones')
            .select('*')
            .eq('telefono', telefono)
            .order('ts_ultimo_mensaje', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) {
            logger_1.Logger.error('Error buscando conversaci�n', { error });
            throw error;
        }
        if (data)
            return data;
        const contacto = await this.buscarOCrearContacto(telefono, {});
        // Mapear área a inbox_id
        // WSP4 (ADMINISTRACION) usa inbox_id 79828
        // VENTAS1 usa inbox_id 81935
        const inboxIdMap = {
            [enums_1.Area.PSI_PRINCIPAL]: null,
            [enums_1.Area.ADMINISTRACION]: 79828, // WSP4 inbox_id
            [enums_1.Area.VENTAS1]: 81935,
        };
        const inbox_id = inboxIdMap[area] || null;
        const inbox_destino = area === enums_1.Area.PSI_PRINCIPAL ? 'psi_principal' : area;
        const { data: convData, error: convError } = await supabase_1.supabaseAdmin
            .from('conversaciones')
            .insert({
            contacto_id: contacto.id,
            telefono,
            area,
            numero_origen: numeroOrigen,
            numero_activo: numeroOrigen,
            ts_ultimo_mensaje: new Date().toISOString(),
            estado: 'nueva',
            router_estado: 'PSI Principal',
            inbox_id: inbox_id,
            inbox_destino,
            derivado_a: area === enums_1.Area.PSI_PRINCIPAL ? null : area,
        })
            .select()
            .single();
        if (convError) {
            logger_1.Logger.error('Error creando conversaci�n', { convError });
            throw convError;
        }
        return convData;
    }
    async saveMessage(message) {
        // Determinar si es mensaje del usuario o del sistema
        const isSystem = message.remitente === 'system';
        const direccion = isSystem ? 'outbound' : 'inbound';
        const remitente_tipo = isSystem ? 'system' : 'user';
        // Obtener el teléfono: del mensaje o de la conversación
        let telefono = message.telefono;
        if (!telefono) {
            // Si no viene en el mensaje, obtenerlo de la conversación
            const { data: conv } = await supabase_1.supabaseAdmin
                .from('conversaciones')
                .select('telefono')
                .eq('id', message.conversacion_id)
                .single();
            telefono = conv?.telefono || message.remitente;
        }
        // Timestamp: usar el del mensaje o el actual
        const timestamp = message.timestamp || new Date().toISOString();
        const mensajeData = {
            conversacion_id: message.conversacion_id,
            remitente: message.remitente,
            tipo: message.tipo,
            mensaje: message.mensaje || '',
            telefono: telefono,
            direccion: direccion,
            remitente_tipo: remitente_tipo,
            timestamp: timestamp,
            whatsapp_message_id: message.whatsapp_message_id,
            metadata: message.metadata || {},
            created_at: timestamp,
        };
        const { data, error } = await supabase_1.supabaseAdmin
            .from('mensajes')
            .insert(mensajeData)
            .select()
            .single();
        if (error) {
            logger_1.Logger.error('Error guardando mensaje', { error, message: mensajeData });
            throw error;
        }
        logger_1.Logger.info('Mensaje guardado en Supabase', {
            mensajeId: data?.id,
            conversacionId: message.conversacion_id,
            remitente: message.remitente,
            remitente_tipo,
            direccion,
            telefono,
            tipo: message.tipo,
        });
        await supabase_1.supabaseAdmin
            .from('conversaciones')
            .update({
            ts_ultimo_mensaje: timestamp,
            updated_at: new Date().toISOString(),
            ultimo_mensaje: message.mensaje || '',
        })
            .eq('id', message.conversacion_id);
        return data;
    }
    async updateConversacion(id, updates) {
        // Filtrar solo campos válidos de Conversacion para evitar errores de tipo
        const validFields = [
            'area',
            'estado',
            'router_estado',
            'submenu_actual',
            'bypass_wsp4',
            'numero_origen',
            'numero_activo',
            'ventana_24h_activa',
            'ventana_24h_inicio',
            'ventana_72h_activa',
            'ventana_72h_inicio',
            'es_lead_meta',
            'metadata',
            'ultimo_menu_enviado',
            'ticket_id',
            'countdown_24h',
            'ts_derivacion',
            'derivado_a',
            'inbox_destino',
            'inbox_id',
        ];
        // Campos que son timestamps y deben ser strings ISO válidos
        const timestampFields = ['ventana_24h_inicio', 'ventana_72h_inicio', 'countdown_24h', 'ts_derivacion'];
        const filteredUpdates = {
            updated_at: new Date().toISOString(),
        };
        // Solo incluir campos válidos del tipo Conversacion
        for (const key of validFields) {
            if (key in updates && updates[key] !== undefined) {
                const value = updates[key];
                // Validar que los campos timestamp sean strings ISO válidos
                if (timestampFields.includes(key)) {
                    if (typeof value === 'string' && value !== '') {
                        // Verificar que sea una fecha válida
                        const date = new Date(value);
                        if (isNaN(date.getTime())) {
                            logger_1.Logger.warn(`Campo timestamp inválido ignorado: ${key} = ${value}`, { id, updates });
                            continue; // Saltar este campo
                        }
                        filteredUpdates[key] = value;
                    }
                    else if (value === null) {
                        filteredUpdates[key] = null;
                    }
                    else {
                        logger_1.Logger.warn(`Valor no válido para timestamp ${key}: ${value}`, { id, updates });
                        continue; // Saltar este campo
                    }
                }
                else {
                    // Para campos no-timestamp, validar que no sean strings asignados a campos timestamp
                    // Esto previene asignar 'principal' a campos como ts_principal si existieran
                    filteredUpdates[key] = value;
                }
            }
        }
        // Log detallado antes del update para debugging
        logger_1.Logger.info('Actualizando conversación', {
            id,
            camposActualizados: Object.keys(filteredUpdates),
            valores: Object.fromEntries(Object.entries(filteredUpdates).map(([k, v]) => [
                k,
                typeof v === 'string' && v.length > 50 ? v.substring(0, 50) + '...' : v
            ]))
        });
        const { data, error } = await supabase_1.supabaseAdmin
            .from('conversaciones')
            .update(filteredUpdates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            logger_1.Logger.error('Error actualizando conversaci�n', { error });
            throw error;
        }
        return data;
    }
    async checkAntiLoop(conversacionId, windowMinutes) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('mensajes')
            .select('created_at')
            .eq('conversacion_id', conversacionId)
            .order('created_at', { ascending: false })
            .limit(1);
        if (error) {
            logger_1.Logger.error('Error verificando anti-loop', { error });
            return false;
        }
        if (!data || !data.length)
            return false;
        const last = new Date(data[0].created_at);
        const diffMinutes = (Date.now() - last.getTime()) / 60000;
        return diffMinutes < windowMinutes;
    }
    async registrarAuditLog(entry) {
        const payload = {
            ...entry,
            metadata: entry.metadata || {},
            created_at: new Date().toISOString(),
        };
        const { error } = await supabase_1.supabaseAdmin.from('audit_log').insert(payload);
        if (error) {
            logger_1.Logger.error('Error registrando audit log', { error, payload });
            throw error;
        }
        return payload;
    }
}
exports.databaseService = new DatabaseService();
