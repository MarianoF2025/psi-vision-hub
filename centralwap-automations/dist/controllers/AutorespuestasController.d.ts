import { Request, Response } from 'express';
declare class AutorespuestasController {
    /**
     * Verifica si debe enviar autorespuesta y retorna el mensaje
     * POST /api/autorespuesta/verificar
     * Body: { telefono, linea }
     */
    verificar(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Determina la franja horaria actual
     */
    private determinarFranja;
    /**
     * Procesa variables dinámicas en el mensaje
     */
    private procesarVariables;
    /**
     * Obtiene el estado actual de autorespuestas
     * GET /api/autorespuesta/estado/:linea
     */
    estado(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const autorespuestasController: AutorespuestasController;
export {};
//# sourceMappingURL=AutorespuestasController.d.ts.map