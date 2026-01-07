import { Router } from 'express';
import { paymentController } from '../controllers/PaymentController';

const router = Router();

// Providers
router.get('/api/providers', (req, res) => paymentController.getProviders(req, res));

// Pagos
router.get('/api/pagos', (req, res) => paymentController.listarPagos(req, res));
router.post('/api/pagos/crear', (req, res) => paymentController.crearPago(req, res));
router.get('/api/pagos/conversacion/:id', (req, res) => paymentController.obtenerPagosPorConversacion(req, res));
router.get('/api/pagos/:id', (req, res) => paymentController.obtenerPago(req, res));
router.post('/api/pagos/:id/cancelar', (req, res) => paymentController.cancelarPago(req, res));

// Webhooks de pasarelas
router.post('/webhook/mercadopago', (req, res) => paymentController.webhookMercadoPago(req, res));
router.post('/webhook/stripe', (req, res) => paymentController.webhookStripe(req, res));
router.post('/webhook/siro', (req, res) => paymentController.webhookSiro(req, res));
router.post('/webhook/dlocal', (req, res) => paymentController.webhookDLocal(req, res));

export default router;
