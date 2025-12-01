// payment-service/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../utils/authMiddleware');
const paymentController = require('../controllers/paymentController');
const splitController = require('../controllers/splitController');
const connectController = require('../controllers/connectController');

// ================== Payment core ==================

// Verify & update
router.get('/verify-payment/:pi', paymentController.verifyPayment);
router.post('/update/:pi', paymentController.updatePayment);

// Stripe customer
router.post(
  '/customer',
  verifyToken,
  allowRoles('customer'),
  paymentController.createCustomer
);

// Payment Intent
router.post(
  '/create-payment-intent',
  verifyToken,
  allowRoles('customer'),
  paymentController.createPaymentIntent
);

// Methods
router.get(
  '/payment-methods',
  verifyToken,
  allowRoles('customer'),
  paymentController.listPaymentMethods
);

// Webhook (Stripe)
// Ở controller đang dùng req.body, không verify signature nên dùng json body cũng được
router.post('/webhook', paymentController.webhook);

// ================== Split config (admin) ==================
router.get(
  '/split-config',
  splitController.getActive
);

router.post(
  '/split-config',
  splitController.upsert
);

// ================== Stripe Connect ==================

// Restaurant owner onboarding
router.post(
  '/connect/restaurant/onboarding-link',
  verifyToken,
  allowRoles('restaurant', 'admin'),
  connectController.restaurantOnboardingLink
);

// Driver/shippers onboarding
router.post(
  '/connect/delivery/onboarding-link',
  verifyToken,
  allowRoles('delivery', 'driver'),
  connectController.deliveryOnboardingLink
);

// Payout cho shipper sau khi giao xong
router.post(
  '/transfer/delivery/:orderId',
  verifyToken,
  allowRoles('delivery', 'driver', 'admin'),
  paymentController.transferDelivery
);

module.exports = router;
