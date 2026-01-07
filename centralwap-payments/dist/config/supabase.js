"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const environment_1 = require("./environment");
exports.supabase = (0, supabase_js_1.createClient)(environment_1.config.supabase.url, environment_1.config.supabase.serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
//# sourceMappingURL=supabase.js.map