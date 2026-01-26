interface AuditLogEntry {
    accion: string;
    tabla_afectada: string;
    registro_id?: string;
    valores_anteriores?: any;
    valores_nuevos?: any;
    user_name?: string;
    user_id?: string;
    origen?: string;
    motivo?: string;
    detalles?: string;
}
export declare class AuditService {
    log(entry: AuditLogEntry): Promise<void>;
    logCursoCreado(cursoId: string, cursoData: any, userName?: string): Promise<void>;
    logCursoActualizado(cursoId: string, antes: any, despues: any, userName?: string): Promise<void>;
    logCursoEliminado(cursoId: string, cursoData: any, userName?: string): Promise<void>;
    logCursoToggle(cursoId: string, codigo: string, nuevoEstado: boolean, userName?: string): Promise<void>;
    logOpcionCreada(opcionId: string, opcionData: any, userName?: string): Promise<void>;
    logOpcionActualizada(opcionId: string, antes: any, despues: any, userName?: string): Promise<void>;
    logOpcionEliminada(opcionId: string, opcionData: any, userName?: string): Promise<void>;
    logOpcionToggle(opcionId: string, titulo: string, nuevoEstado: boolean, userName?: string): Promise<void>;
    logAnuncioVinculado(anuncioId: string, anuncioData: any, userName?: string): Promise<void>;
    logAnuncioDesvinculado(anuncioId: string, anuncioData: any, userName?: string): Promise<void>;
}
export declare const auditService: AuditService;
export default auditService;
//# sourceMappingURL=AuditService.d.ts.map