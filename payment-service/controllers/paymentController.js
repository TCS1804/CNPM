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
  try {
    const payload = { orderId: req.body?.orderId };   // 👈 CHỈNH Ở ĐÂY
    const result = await paymentService.updatePayment(req.params.pi, payload);
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
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
    await paymentService.webhook(req);
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(400);
  }
};

exports.transferDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const result = await paymentService.transferDelivery(orderId, userId, role);
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e.message || 'Failed to transfer delivery payout' });
  }
};
// payment-service/controllers/paymentController.js

// // Giữ phần makeStub ở trên cho các hàm khác, riêng createCustomer dùng logic thật
// const paymentService = require('../services/paymentService');

// function makeStub(name) {
//   return async (req, res) => {
//     console.log(`[payment-controller] ${name} called`, {
//       params: req.params,
//       body: req.body,
//       user: req.user,
//     });

//     return res.json({
//       ok: true,
//       action: name,
//       params: req.params,
//       body: req.body,
//       user: req.user || null,
//     });
//   };
// }

// // Verify & update payment (chưa dùng thì cứ stub)
// exports.verifyPayment = makeStub('verifyPayment');
// exports.updatePayment = makeStub('updatePayment');

// // ✅ createCustomer: dùng logic thật
// exports.createCustomer = async (req, res) => {
//   try {
//     console.log('[payment-controller] createCustomer REAL handler', {
//       user: req.user,
//       body: req.body,
//     });

//     const result = await paymentService.createCustomer(
//       req.user.id,
//       req.body || {}
//     );
//     res.json(result);
//   } catch (e) {
//     console.error('[payment-controller] createCustomer error', e);
//     res.status(400).json({ message: e.message });
//   }
// };

// // Các handler khác tạm stub
// exports.createPaymentIntent = makeStub('createPaymentIntent');
// exports.confirmPaymentIntent = makeStub('confirmPaymentIntent');
// exports.cancelPaymentIntent = makeStub('cancelPaymentIntent');
// exports.transferDelivery = makeStub('transferDelivery');

