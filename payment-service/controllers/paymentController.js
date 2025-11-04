const paymentService = require('../services/paymentService');

exports.createCustomer = async (req, res) => {
  try {
    const result = await paymentService.createCustomer(req.user.id, req.body || {});
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.createPaymentIntent = async (req, res) => {
  try {
    const result = await paymentService.createPaymentIntent(req.user.id, req.body || {});
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try { res.json(await paymentService.verifyPayment(req.params.pi)); }
  catch (e) { res.status(400).json({ message: e.message }); }
};

exports.updatePayment = async (req, res) => {
  try { await paymentService.updatePayment(req.params.pi, req.body?.orderId); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ message: e.message }); }
};

exports.listPaymentMethods = async (req, res) => {
  try {
    const methods = await paymentService.listPaymentMethods(req.query.customerId);
    res.json({ paymentMethods: methods });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.webhook = async (req, res) => {
  try {
    await paymentService.handleWebhook(req);
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(400);
  }
};
