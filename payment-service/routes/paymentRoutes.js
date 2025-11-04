// payment-service/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../utils/authMiddleware');
const paymentController = require('../controllers/paymentController');

// Verify & update (public endpoints nếu bạn muốn)
router.get('/verify-payment/:pi', paymentController.verifyPayment);
router.post('/update/:pi', paymentController.updatePayment);

// Create Stripe customer for logged-in user
router.post('/customer', verifyToken, allowRoles('customer'), paymentController.createCustomer);

// Create Payment Intent
router.post('/create-payment-intent', verifyToken, allowRoles('customer'), paymentController.createPaymentIntent);

// Webhook (không auth; Stripe ký request)
router.post('/webhook', paymentController.webhook);

// routes/paymentRoutes.js
router.get('/payment-methods', verifyToken, allowRoles('customer'), paymentController.listPaymentMethods);

module.exports = router;
