import { Request, Response } from 'express';
export declare class CursosController {
    listar(req: Request, res: Response): Promise<void>;
    obtener(req: Request, res: Response): Promise<void>;
    obtenerPorCodigo(req: Request, res: Response): Promise<void>;
    crear(req: Request, res: Response): Promise<void>;
    actualizar(req: Request, res: Response): Promise<void>;
    eliminar(req: Request, res: Response): Promise<void>;
    toggle(req: Request, res: Response): Promise<void>;
    obtenerCompleto(req: Request, res: Response): Promise<void>;
}
export declare const cursosController: CursosController;
export default cursosController;
//# sourceMappingURL=CursosController.d.ts.map