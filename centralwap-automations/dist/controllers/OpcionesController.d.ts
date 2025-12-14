import { Request, Response } from 'express';
export declare class OpcionesController {
    listar(req: Request, res: Response): Promise<void>;
    obtener(req: Request, res: Response): Promise<void>;
    crear(req: Request, res: Response): Promise<void>;
    actualizar(req: Request, res: Response): Promise<void>;
    eliminar(req: Request, res: Response): Promise<void>;
    reordenar(req: Request, res: Response): Promise<void>;
    toggle(req: Request, res: Response): Promise<void>;
}
export declare const opcionesController: OpcionesController;
export default opcionesController;
//# sourceMappingURL=OpcionesController.d.ts.map