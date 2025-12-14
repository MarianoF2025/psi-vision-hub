"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappConfig = void 0;
exports.validateWhatsAppConfig = validateWhatsAppConfig;
exports.whatsappConfig = {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberIdVentas: process.env.WHATSAPP_PHONE_NUMBER_ID_VENTAS || '',
    apiVersion: 'v18.0',
    get baseUrl() {
        return `https://graph.facebook.com/${this.apiVersion}`;
    },
    get messagesUrl() {
        return `${this.baseUrl}/${this.phoneNumberIdVentas}/messages`;
    },
    get headers() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };
    }
};
function validateWhatsAppConfig() {
    if (!exports.whatsappConfig.accessToken) {
        console.warn('⚠️ WHATSAPP_ACCESS_TOKEN no configurado');
        return false;
    }
    if (!exports.whatsappConfig.phoneNumberIdVentas) {
        console.warn('⚠️ WHATSAPP_PHONE_NUMBER_ID_VENTAS no configurado');
        return false;
    }
    console.log('✅ WhatsApp Cloud API configurado');
    return true;
}
exports.default = exports.whatsappConfig;
//# sourceMappingURL=whatsapp.js.map