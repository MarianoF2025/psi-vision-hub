"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autorespuestasController = void 0;
const supabase_1 = require("../config/supabase");
class AutorespuestasController {
    /**
     * Verifica si debe enviar autorespuesta y retorna el mensaje
     * POST /api/autorespuesta/verificar
     * Body: { telefono, linea }
     */
    async verificar(req, res) {
        try {
            const { telefono, linea = 'ventas_api' } = req.body;
            if (!telefono) {
                return res.status(400).json({ success: false, error: 'telefono es requerido' });
            }
            console.log(`[Autorespuesta] Verificando para ${telefono} en ${linea}`);
            // 1. Obtener configuración
            const { data: config, error: configError } = await supabase_1.supabase
                .from('config_autorespuestas')
                .select('*')
                .eq('linea', linea)
                .single();
            if (configError || !config) {
                console.log(`[Autorespuesta] No hay configuración para ${linea}`);
                return res.json({ enviar: false, razon: 'sin_configuracion' });
            }
            // 2. Verificar si autorespuestas están activas
            if (!config.activo) {
                console.log(`[Autorespuesta] Desactivadas para ${linea}`);
                return res.json({ enviar: false, razon: 'desactivadas' });
            }
            // 3. Determinar franja horaria
            const franja = this.determinarFranja(config.corte_activo);
            console.log(`[Autorespuesta] Franja actual: ${franja}`);
            // 4. Verificar cooldown (no enviar si ya se envió recientemente)
            const cooldownHoras = config.cooldown_horas || 2;
            const { data: enviosRecientes } = await supabase_1.supabase
                .from('autorespuestas_enviadas')
                .select('id, enviado_at')
                .eq('telefono', telefono)
                .eq('linea', linea)
                .gte('enviado_at', new Date(Date.now() - cooldownHoras * 60 * 60 * 1000).toISOString())
                .order('enviado_at', { ascending: false })
                .limit(1);
            if (enviosRecientes && enviosRecientes.length > 0) {
                console.log(`[Autorespuesta] Cooldown activo - ya se envió hace menos de ${cooldownHoras}h`);
                return res.json({ enviar: false, razon: 'cooldown', ultimo_envio: enviosRecientes[0].enviado_at });
            }
            // 5. Verificar si un agente respondió recientemente
            const minutosAgente = config.no_enviar_si_agente_respondio_min || 30;
            const { data: respuestasAgente } = await supabase_1.supabase
                .from('mensajes')
                .select('id, created_at')
                .eq('telefono', telefono)
                .eq('direccion', 'saliente')
                .eq('remitente_tipo', 'agente')
                .gte('created_at', new Date(Date.now() - minutosAgente * 60 * 1000).toISOString())
                .limit(1);
            if (respuestasAgente && respuestasAgente.length > 0) {
                console.log(`[Autorespuesta] Agente respondió hace menos de ${minutosAgente} min`);
                return res.json({ enviar: false, razon: 'agente_respondio', ultima_respuesta: respuestasAgente[0].created_at });
            }
            // 6. Obtener mensaje según franja
            const mensajeKey = `mensaje_franja_${franja}`;
            let mensaje = config[mensajeKey];
            if (!mensaje) {
                console.log(`[Autorespuesta] No hay mensaje configurado para franja ${franja}`);
                return res.json({ enviar: false, razon: 'sin_mensaje' });
            }
            // 7. Reemplazar variables dinámicas
            mensaje = this.procesarVariables(mensaje);
            // 8. Registrar que se va a enviar
            await supabase_1.supabase.from('autorespuestas_enviadas').insert({
                telefono,
                linea,
                franja,
                mensaje
            });
            console.log(`[Autorespuesta] ✅ Enviar mensaje de franja ${franja}`);
            return res.json({
                enviar: true,
                mensaje,
                franja,
                linea
            });
        }
        catch (error) {
            console.error('[Autorespuesta] Error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * Determina la franja horaria actual
     */
    determinarFranja(corteActivo) {
        if (corteActivo) {
            return 4; // Post Atención
        }
        const ahora = new Date();
        // Ajustar a hora Argentina (UTC-3)
        const horaArgentina = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
        const hora = horaArgentina.getHours();
        if (hora >= 22 || hora < 7) {
            return 1; // Descanso
        }
        if (hora >= 7 && hora < 9) {
            return 2; // Preparación
        }
        return 3; // Atención Activa
    }
    /**
     * Procesa variables dinámicas en el mensaje
     */
    procesarVariables(mensaje) {
        const ahora = new Date();
        const horaArgentina = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
        const hora = horaArgentina.getHours();
        // {dia_tarde} -> "día" antes de las 13, "tarde" después
        const diaTarde = hora < 13 ? 'día' : 'tarde';
        mensaje = mensaje.replace(/{dia_tarde}/g, diaTarde);
        return mensaje;
    }
    /**
     * Obtiene el estado actual de autorespuestas
     * GET /api/autorespuesta/estado/:linea
     */
    async estado(req, res) {
        try {
            const { linea } = req.params;
            const { data: config, error } = await supabase_1.supabase
                .from('config_autorespuestas')
                .select('*')
                .eq('linea', linea)
                .single();
            if (error || !config) {
                return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
            }
            const franja = this.determinarFranja(config.corte_activo);
            return res.json({
                success: true,
                linea,
                activo: config.activo,
                franja,
                corte_activo: config.corte_activo,
                corte_timestamp: config.corte_timestamp,
                corte_usuario: config.corte_usuario_nombre
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}
exports.autorespuestasController = new AutorespuestasController();
//# sourceMappingURL=AutorespuestasController.js.map