// payment-service/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../utils/authMiddleware');
const paymentController = require('../controllers/paymentController');
const splitController = require('../controllers/splitController');

// Verify & update
router.get('/verify-payment/:pi', paymentController.verifyPayment);
router.post('/update/:pi', paymentController.updatePayment);

// Stripe customer
router.post('/customer', verifyToken, allowRoles('customer'), paymentController.createCustomer);

// Payment Intent
router.post('/create-payment-intent', verifyToken, allowRoles('customer'), paymentController.createPaymentIntent);

// Webhook
router.post('/webhook', paymentController.webhook);

// Methods
router.get('/payment-methods', verifyToken, allowRoles('customer'), paymentController.listPaymentMethods);

// NEW: Split config for admin
router.get('/split-config', verifyToken, allowRoles('admin'), splitController.getActive);
router.post('/split-config', verifyToken, allowRoles('admin'), splitController.upsert);

module.exports = router;
