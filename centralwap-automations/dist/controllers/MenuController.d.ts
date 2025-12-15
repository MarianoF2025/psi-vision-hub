import { Request, Response } from 'express';
export declare class MenuController {
    private normalizarTelefono;
    /**
     * Calcula las fechas de fin de ventana
     */
    private calcularVentanas;
    /**
     * Busca un contacto por teléfono o lo crea si no existe
     */
    private obtenerOCrearContacto;
    /**
     * Fija una conversación en Ventas, creándola si no existe
     * CORREGIDO: Incluye telefono, contacto_id, nombre y VENTANAS
     */
    private fijarConversacionEnVentas;
    enviarMenu(req: Request, res: Response): Promise<void>;
    procesarSeleccion(req: Request, res: Response): Promise<void>;
    webhookRespuestaMenu(req: Request, res: Response): Promise<void>;
    obtenerSesion(req: Request, res: Response): Promise<void>;
    finalizarSesion(req: Request, res: Response): Promise<void>;
    enviarMenuDirecto(req: Request, res: Response): Promise<void>;
    listarCursosPorTipo(req: Request, res: Response): Promise<void>;
    procesarSeleccionDirecta(req: Request, res: Response): Promise<void>;
}
export declare const menuController: MenuController;
export default menuController;
//# sourceMappingURL=MenuController.d.ts.map