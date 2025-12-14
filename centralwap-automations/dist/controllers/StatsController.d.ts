import { Request, Response } from 'express';
export declare class StatsController {
    dashboard(req: Request, res: Response): Promise<void>;
    ctrPorCurso(req: Request, res: Response): Promise<void>;
    ctrPorOpcion(req: Request, res: Response): Promise<void>;
    automatizaciones(req: Request, res: Response): Promise<void>;
    interaccionesRecientes(req: Request, res: Response): Promise<void>;
    detalleCurso(req: Request, res: Response): Promise<void>;
}
export declare const statsController: StatsController;
export default statsController;
//# sourceMappingURL=StatsController.d.ts.map