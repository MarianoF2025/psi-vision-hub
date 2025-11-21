"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAnon = exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const environment_1 = require("./environment");
exports.supabaseAdmin = (0, supabase_js_1.createClient)(environment_1.Env.supabase.url, environment_1.Env.supabase.serviceKey, {
    auth: {
        persistSession: false,
    },
});
exports.supabaseAnon = (0, supabase_js_1.createClient)(environment_1.Env.supabase.url, environment_1.Env.supabase.anonKey, {
    auth: {
        persistSession: false,
    },
});
