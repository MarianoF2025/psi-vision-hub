export const whatsappConfig = {
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

export function validateWhatsAppConfig(): boolean {
  if (!whatsappConfig.accessToken) {
    console.warn('⚠️ WHATSAPP_ACCESS_TOKEN no configurado');
    return false;
  }
  if (!whatsappConfig.phoneNumberIdVentas) {
    console.warn('⚠️ WHATSAPP_PHONE_NUMBER_ID_VENTAS no configurado');
    return false;
  }
  console.log('✅ WhatsApp Cloud API configurado');
  return true;
}

export default whatsappConfig;
