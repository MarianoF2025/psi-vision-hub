import { WhatsAppListSection, MenuOpcion, Curso } from '../types';
export declare class WhatsAppService {
    enviarTexto(telefono: string, mensaje: string): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    enviarMenuInteractivo(telefono: string, curso: Curso, opciones: MenuOpcion[]): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    enviarMenuGenerico(telefono: string, bodyText: string, sections: WhatsAppListSection[], headerText?: string): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    enviarBotones(telefono: string, bodyText: string, botones: Array<{
        id: string;
        titulo: string;
    }>, headerText?: string): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    private construirSecciones;
    private normalizarTelefono;
}
export declare const whatsAppService: WhatsAppService;
export default whatsAppService;
//# sourceMappingURL=WhatsAppService.d.ts.map