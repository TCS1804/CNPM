const express = require('express');
const router = express.Router();
const notifyController = require('../controllers/notifyController');

// Send email notification
router.post('/email', notifyController.email);

// Send SMS notification
router.post('/sms', notifyController.sms);
// Web/browser notifications (internal)
router.post('/web', notifyController.webPush);
router.get('/web', notifyController.webFetch);

module.exports = router;
