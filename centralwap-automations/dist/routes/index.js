"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CursosController_1 = require("../controllers/CursosController");
const OpcionesController_1 = require("../controllers/OpcionesController");
const AnunciosController_1 = require("../controllers/AnunciosController");
const MenuController_1 = require("../controllers/MenuController");
const StatsController_1 = require("../controllers/StatsController");
const router = (0, express_1.Router)();
// CURSOS
router.get('/cursos', (req, res) => CursosController_1.cursosController.listar(req, res));
router.get('/cursos/:id', (req, res) => CursosController_1.cursosController.obtener(req, res));
router.get('/cursos/:id/completo', (req, res) => CursosController_1.cursosController.obtenerCompleto(req, res));
router.get('/cursos/codigo/:codigo', (req, res) => CursosController_1.cursosController.obtenerPorCodigo(req, res));
router.post('/cursos', (req, res) => CursosController_1.cursosController.crear(req, res));
router.put('/cursos/:id', (req, res) => CursosController_1.cursosController.actualizar(req, res));
router.delete('/cursos/:id', (req, res) => CursosController_1.cursosController.eliminar(req, res));
router.patch('/cursos/:id/toggle', (req, res) => CursosController_1.cursosController.toggle(req, res));
// OPCIONES DE MENÚ
router.get('/cursos/:cursoId/opciones', (req, res) => OpcionesController_1.opcionesController.listar(req, res));
router.post('/cursos/:cursoId/opciones', (req, res) => OpcionesController_1.opcionesController.crear(req, res));
router.put('/cursos/:cursoId/opciones/reordenar', (req, res) => OpcionesController_1.opcionesController.reordenar(req, res));
router.get('/opciones/:id', (req, res) => OpcionesController_1.opcionesController.obtener(req, res));
router.put('/opciones/:id', (req, res) => OpcionesController_1.opcionesController.actualizar(req, res));
router.delete('/opciones/:id', (req, res) => OpcionesController_1.opcionesController.eliminar(req, res));
router.patch('/opciones/:id/toggle', (req, res) => OpcionesController_1.opcionesController.toggle(req, res));
// ANUNCIOS
router.get('/anuncios', (req, res) => AnunciosController_1.anunciosController.listar(req, res));
router.get('/anuncios/:id', (req, res) => AnunciosController_1.anunciosController.obtener(req, res));
router.get('/anuncios/ad/:adId', (req, res) => AnunciosController_1.anunciosController.buscarPorAdId(req, res));
router.post('/anuncios', (req, res) => AnunciosController_1.anunciosController.crear(req, res));
router.put('/anuncios/:id', (req, res) => AnunciosController_1.anunciosController.actualizar(req, res));
router.delete('/anuncios/:id', (req, res) => AnunciosController_1.anunciosController.eliminar(req, res));
router.patch('/anuncios/:id/toggle', (req, res) => AnunciosController_1.anunciosController.toggle(req, res));
// MENÚ INTERACTIVO
router.post('/menu/enviar', (req, res) => MenuController_1.menuController.enviarMenu(req, res));
router.post('/menu/procesar', (req, res) => MenuController_1.menuController.procesarSeleccion(req, res));
router.get('/menu/sesion/:telefono', (req, res) => MenuController_1.menuController.obtenerSesion(req, res));
router.post('/menu/sesion/:telefono/finalizar', (req, res) => MenuController_1.menuController.finalizarSesion(req, res));
router.post('/menu/directo', (req, res) => MenuController_1.menuController.enviarMenuDirecto(req, res));
router.post('/menu/listar-tipo', (req, res) => MenuController_1.menuController.listarCursosPorTipo(req, res));
router.post('/menu/procesar-directo', (req, res) => MenuController_1.menuController.procesarSeleccionDirecta(req, res));
// ESTADÍSTICAS
router.get('/stats/dashboard', (req, res) => StatsController_1.statsController.dashboard(req, res));
router.get('/stats/cursos', (req, res) => StatsController_1.statsController.ctrPorCurso(req, res));
router.get('/stats/cursos/:cursoId/opciones', (req, res) => StatsController_1.statsController.ctrPorOpcion(req, res));
router.get('/stats/cursos/:cursoId/detalle', (req, res) => StatsController_1.statsController.detalleCurso(req, res));
router.get('/stats/automatizaciones', (req, res) => StatsController_1.statsController.automatizaciones(req, res));
router.get('/stats/interacciones', (req, res) => StatsController_1.statsController.interaccionesRecientes(req, res));
exports.default = router;
// TESTING (solo para desarrollo)
router.post('/test/ctwa', async (req, res) => {
    const { telefono, ad_id, curso_id } = req.body;
    if (!telefono) {
        return res.status(400).json({ success: false, error: 'telefono es requerido' });
    }
    if (!ad_id && !curso_id) {
        return res.status(400).json({ success: false, error: 'ad_id o curso_id es requerido' });
    }
    // Redirigir internamente a enviarMenu
    req.body = { telefono, ad_id, curso_id };
    return MenuController_1.menuController.enviarMenu(req, res);
});
// AUTORESPUESTAS
const AutorespuestasController_1 = require("../controllers/AutorespuestasController");
router.post('/autorespuesta/verificar', (req, res) => AutorespuestasController_1.autorespuestasController.verificar(req, res));
router.get('/autorespuesta/estado/:linea', (req, res) => AutorespuestasController_1.autorespuestasController.estado(req, res));
//# sourceMappingURL=index.js.map