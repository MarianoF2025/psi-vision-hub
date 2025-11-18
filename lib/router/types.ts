// Tipos para Router WSP4

export type MenuArea =
  | 'Administración'
  | 'Alumnos'
  | 'Inscripciones'
  | 'Comunidad'
  | 'Otra consulta';

export interface MenuOption {
  code: string;
  label: string;
  area?: MenuArea;
  submenu?: SubMenuOption[];
}

export interface SubMenuOption {
  code: string;
  label: string;
  area: MenuArea;
  subarea?: string;
}

export interface MenuState {
  conversationId: string;
  currentMenu: 'main' | MenuArea;
  lastInteraction: Date;
  selectedOption?: string;
  selectedSubOption?: string;
}

export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'link';

export interface WhatsAppMedia {
  id: string;
  url?: string;
  mimeType?: string;
  sha256?: string;
  fileName?: string;
  caption?: string;
  size?: number;
  duration?: number;
  thumbnailBase64?: string;
}

export interface AttributionData {
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_page?: string;
  click_timestamp?: string;
  referral_url?: string;
}

export interface WhatsAppMessage {
  from: string;
  to: string;
  message: string;
  messageId?: string;
  timestamp?: string;
  type?: WhatsAppMessageType;
  media?: WhatsAppMedia;
  attribution?: AttributionData;
  referral?: any;
  raw?: any;
}

export interface RouterResponse {
  success: boolean;
  message?: string;
  conversationId?: string;
  area?: MenuArea;
  subarea?: string;
}

