import { Request, Response } from 'express';
export declare class MenuController {
    private normalizarTelefono;
    private calcularVentanas;
    private obtenerOCrearContacto;
    private fijarConversacionEnVentas;
    private extraerSufijoWamid;
    private buscarMensajePorSufijo;
    private procesarReaccion;
    private buscarMensajeCitadoId;
    private crearOActualizarSesion;
    private incrementarInteracciones;
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