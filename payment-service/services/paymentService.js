// payment-service/services/paymentService.js
const Stripe = require('stripe');
const Payment = require('../models/Payment');
const SplitConfig = require('../models/SplitConfig');
const axios = require('axios');

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

// URL order-service (điền theo môi trường của bạn)
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:5030/order';

async function getActiveConfig(restaurantId) {
  const filter = { active: true };
  if (restaurantId) filter.restaurantId = restaurantId;
  return await SplitConfig.findOne(filter).sort({ createdAt: -1 });
}

// ✅ TÍNH & GỬI SPLIT
async function applySplitForOrder(orderId, paymentIntentId, amountCents, currency, restaurantId) {
  // 1) lấy config đang active
  const cfg = await getActiveConfig(restaurantId);

  // fallback an toàn
  const method = cfg?.method || 'percent';
  const percent = cfg?.percent || { admin: 10, restaurant: 85, delivery: 5 };
  const fixed = cfg?.fixed || { deliveryFee: 0 };
  const cur = (cfg?.currency || currency || 'USD').toUpperCase();

  // 2) tính số tiền
  let adminCents = 0, restaurantCents = 0, deliveryCents = 0;

  if (method === 'percent') {
    adminCents = Math.floor(amountCents * (percent.admin || 0) / 100);
    deliveryCents = Math.floor(amountCents * (percent.delivery || 0) / 100);
    // phần còn lại cho restaurant để đảm bảo tổng khớp
    restaurantCents = amountCents - adminCents - deliveryCents;
  } else {
    // fixed: phí ship cố định, phần còn lại chia admin/restaurant theo % mặc định (hoặc 0/100)
    deliveryCents = Math.min(fixed.deliveryFee || 0, amountCents);
    const base = amountCents - deliveryCents;
    const pAdmin = percent.admin ?? 10;
    adminCents = Math.floor(base * pAdmin / 100);
    restaurantCents = base - adminCents;
  }

  // 3) Cập nhật Order (lưu total & shares)
  await axios.patch(`${ORDER_SERVICE_URL}/${orderId}/split`, {
    totalCents: amountCents, // ✅ thêm dòng này
    split: {
      method,
      rates: { admin: percent.admin || 0, restaurant: percent.restaurant || 0, delivery: percent.delivery || 0 },
      amounts: {
        admin: adminCents,
        restaurant: restaurantCents,
        delivery: deliveryCents
      },
      currency: (currency || 'usd').toUpperCase(),
      settledAt: new Date()
    },
    paymentIntentId
  }, {
    headers: { 'x-internal-secret': process.env.INTERNAL_SECRET || 'dev-secret' }
  });
}

exports.createCustomer = async (userId, payload) => {
  if (!stripe) throw new Error('Payment disabled (missing STRIPE_SECRET_KEY)');
  const customer = await stripe.customers.create(payload);
  return { customerId: customer.id };
};

exports.verifyPayment = async (pi) => {
  const doc = await Payment.findOne({ paymentIntentId: pi });
  if (!doc) throw new Error('Payment not found');
  return { status: doc.status };
};

exports.listPaymentMethods = async (userIdOrCustomerId, stripeCustomerId) => {
  if (!stripe) return [];
  const customer = stripeCustomerId || userIdOrCustomerId;
  if (!customer) return [];
  const methods = await stripe.paymentMethods.list({ customer, type: 'card' });
  return methods.data || [];
};

exports.updatePayment = async (pi, payload) => {
  // Chuẩn hóa payload để chắc chắn là object
  let update = {};
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    update = payload;
  } else if (payload != null) {
    // Nếu ai đó gửi 'paid' thì hiểu là cập nhật status
    update = { status: String(payload) };
  }

  const doc = await Payment.findOneAndUpdate(
    { paymentIntentId: pi },
    update,                 // ✅ đưa object phẳng, Mongoose sẽ $set giúp
    { new: true }
  );
  if (!doc) throw new Error('Payment not found');
  return doc;
};

exports.createPaymentIntent = async (userId, body) => {
  if (!stripe) throw new Error('Payment disabled (missing STRIPE_SECRET_KEY)');

  const { amount, currency = 'VND', customerId, orderId, restaurantId, metadata = {} } = body || {};
  if (!amount) throw new Error('Missing amount');
  if (!customerId) throw new Error('Missing customerId');

  const intAmount = Math.round(Number(amount));
  if (intAmount <= 0) throw new Error('Amount must be > 0');

  const pi = await stripe.paymentIntents.create({
    amount: intAmount,
    currency,
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: { ...metadata, orderId, restaurantId }
  });

  await Payment.create({
    paymentIntentId: pi.id,
    userId,
    stripeCustomerId: customerId,
    amount: intAmount,
    currency,
    status: pi.status || 'requires_confirmation',
    orderId,
    metadata: { orderId, restaurantId }
  });

  return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
};

exports.webhook = async (req) => {
  // NOTE: ở môi trường thực tế hãy verify chữ ký Stripe
  const event = req.body;

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;

      const paymentDoc = await Payment.findOneAndUpdate(
        { paymentIntentId: pi.id },
        { status: 'succeeded' },
        { new: true }
      );

      // ✅ Cập nhật Order status + lưu paymentIntentId (tuỳ API order-service của bạn)
      if (paymentDoc?.orderId) {
        try {
          await axios.patch(`${ORDER_SERVICE_URL}/${paymentDoc.orderId}`, {
            status: 'paid',
            paymentIntentId: pi.id
          });
        } catch (e) {
          // log mềm để không chặn webhook
          console.error('Failed to update order status:', e?.response?.data || e.message);
        }

        // Split (giữ nguyên logic cũ)
        const amount = pi.amount_received || pi.amount || paymentDoc.amount;
        const currency = (pi.currency || paymentDoc.currency || 'VND').toUpperCase();
        const restaurantId = paymentDoc?.metadata?.restaurantId;
        await applySplitForOrder(paymentDoc.orderId, pi.id, amount, currency, restaurantId);
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      await Payment.findOneAndUpdate(
        { paymentIntentId: pi.id },
        { status: 'requires_payment_method' }
      );
      break;
    }
    default:
      break;
  }
};

exports.handleStripeWebhook = async (event) => {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object; // Stripe PI
      // cập nhật Payment của bạn nếu có
      const payDoc = await Payment.findOneAndUpdate(
        { paymentIntentId: pi.id },
        { status: 'succeeded' },
        { new: true }
      );

      // LẤY orderId & restaurantId từ Payment (hoặc metadata của PI)
      const orderId = payDoc?.orderId || pi.metadata?.orderId;
      const restaurantId = payDoc?.restaurantId || pi.metadata?.restaurantId;

      // Tính & gửi split
      const amountCents = pi.amount_received ?? pi.amount; // integer, cents
      const currency = (pi.currency || 'usd').toUpperCase();

      if (orderId && amountCents > 0) {
        await applySplitForOrder(orderId, pi.id, amountCents, currency, restaurantId);
      }
      break;
    }
    // các case khác giữ nguyên...
  }
};