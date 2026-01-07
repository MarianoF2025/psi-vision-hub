"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PaymentController_1 = require("../controllers/PaymentController");
const router = (0, express_1.Router)();
// Providers
router.get('/api/providers', (req, res) => PaymentController_1.paymentController.getProviders(req, res));
// Pagos
router.get('/api/pagos', (req, res) => PaymentController_1.paymentController.listarPagos(req, res));
router.post('/api/pagos/crear', (req, res) => PaymentController_1.paymentController.crearPago(req, res));
router.get('/api/pagos/conversacion/:id', (req, res) => PaymentController_1.paymentController.obtenerPagosPorConversacion(req, res));
router.get('/api/pagos/:id', (req, res) => PaymentController_1.paymentController.obtenerPago(req, res));
router.post('/api/pagos/:id/cancelar', (req, res) => PaymentController_1.paymentController.cancelarPago(req, res));
// Webhooks de pasarelas
router.post('/webhook/mercadopago', (req, res) => PaymentController_1.paymentController.webhookMercadoPago(req, res));
router.post('/webhook/stripe', (req, res) => PaymentController_1.paymentController.webhookStripe(req, res));
router.post('/webhook/siro', (req, res) => PaymentController_1.paymentController.webhookSiro(req, res));
router.post('/webhook/dlocal', (req, res) => PaymentController_1.paymentController.webhookDLocal(req, res));
exports.default = router;
//# sourceMappingURL=index.js.map