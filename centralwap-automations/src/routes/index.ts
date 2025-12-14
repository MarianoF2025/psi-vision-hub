import { Router } from 'express';
import { cursosController } from '../controllers/CursosController';
import { opcionesController } from '../controllers/OpcionesController';
import { anunciosController } from '../controllers/AnunciosController';
import { menuController } from '../controllers/MenuController';
import { statsController } from '../controllers/StatsController';

const router = Router();

// CURSOS
router.get('/cursos', (req, res) => cursosController.listar(req, res));
router.get('/cursos/:id', (req, res) => cursosController.obtener(req, res));
router.get('/cursos/:id/completo', (req, res) => cursosController.obtenerCompleto(req, res));
router.get('/cursos/codigo/:codigo', (req, res) => cursosController.obtenerPorCodigo(req, res));
router.post('/cursos', (req, res) => cursosController.crear(req, res));
router.put('/cursos/:id', (req, res) => cursosController.actualizar(req, res));
router.delete('/cursos/:id', (req, res) => cursosController.eliminar(req, res));
router.patch('/cursos/:id/toggle', (req, res) => cursosController.toggle(req, res));

// OPCIONES DE MENÚ
router.get('/cursos/:cursoId/opciones', (req, res) => opcionesController.listar(req, res));
router.post('/cursos/:cursoId/opciones', (req, res) => opcionesController.crear(req, res));
router.put('/cursos/:cursoId/opciones/reordenar', (req, res) => opcionesController.reordenar(req, res));
router.get('/opciones/:id', (req, res) => opcionesController.obtener(req, res));
router.put('/opciones/:id', (req, res) => opcionesController.actualizar(req, res));
router.delete('/opciones/:id', (req, res) => opcionesController.eliminar(req, res));
router.patch('/opciones/:id/toggle', (req, res) => opcionesController.toggle(req, res));

// ANUNCIOS
router.get('/anuncios', (req, res) => anunciosController.listar(req, res));
router.get('/anuncios/:id', (req, res) => anunciosController.obtener(req, res));
router.get('/anuncios/ad/:adId', (req, res) => anunciosController.buscarPorAdId(req, res));
router.post('/anuncios', (req, res) => anunciosController.crear(req, res));
router.put('/anuncios/:id', (req, res) => anunciosController.actualizar(req, res));
router.delete('/anuncios/:id', (req, res) => anunciosController.eliminar(req, res));
router.patch('/anuncios/:id/toggle', (req, res) => anunciosController.toggle(req, res));

// MENÚ INTERACTIVO
router.post('/menu/enviar', (req, res) => menuController.enviarMenu(req, res));
router.post('/menu/procesar', (req, res) => menuController.procesarSeleccion(req, res));
router.get('/menu/sesion/:telefono', (req, res) => menuController.obtenerSesion(req, res));
router.post('/menu/sesion/:telefono/finalizar', (req, res) => menuController.finalizarSesion(req, res));
router.post('/menu/directo', (req, res) => menuController.enviarMenuDirecto(req, res));
router.post('/menu/listar-tipo', (req, res) => menuController.listarCursosPorTipo(req, res));
router.post('/menu/procesar-directo', (req, res) => menuController.procesarSeleccionDirecta(req, res));

// ESTADÍSTICAS
router.get('/stats/dashboard', (req, res) => statsController.dashboard(req, res));
router.get('/stats/cursos', (req, res) => statsController.ctrPorCurso(req, res));
router.get('/stats/cursos/:cursoId/opciones', (req, res) => statsController.ctrPorOpcion(req, res));
router.get('/stats/cursos/:cursoId/detalle', (req, res) => statsController.detalleCurso(req, res));
router.get('/stats/automatizaciones', (req, res) => statsController.automatizaciones(req, res));
router.get('/stats/interacciones', (req, res) => statsController.interaccionesRecientes(req, res));

export default router;

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
  return menuController.enviarMenu(req, res);
});
