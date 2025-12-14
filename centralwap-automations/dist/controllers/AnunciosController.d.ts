import { Request, Response } from 'express';
export declare class AnunciosController {
    listar(req: Request, res: Response): Promise<void>;
    obtener(req: Request, res: Response): Promise<void>;
    buscarPorAdId(req: Request, res: Response): Promise<void>;
    crear(req: Request, res: Response): Promise<void>;
    actualizar(req: Request, res: Response): Promise<void>;
    eliminar(req: Request, res: Response): Promise<void>;
    toggle(req: Request, res: Response): Promise<void>;
}
export declare const anunciosController: AnunciosController;
export default anunciosController;
//# sourceMappingURL=AnunciosController.d.ts.map