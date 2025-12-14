"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.verificarConexion = verificarConexion;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos');
    process.exit(1);
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});
async function verificarConexion() {
    try {
        const { error } = await exports.supabase.from('cursos').select('count').limit(1);
        if (error) {
            console.error('❌ Error conectando a Supabase:', error.message);
            return false;
        }
        console.log('✅ Conectado a Supabase');
        return true;
    }
    catch (err) {
        console.error('❌ Error de conexión:', err);
        return false;
    }
}
exports.default = exports.supabase;
//# sourceMappingURL=supabase.js.map