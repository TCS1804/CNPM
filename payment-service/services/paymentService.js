const Stripe = require('stripe');
const Payment = require('../models/Payment');

const stripeKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

exports.createCustomer = async (userId, payload) => {
  if (!stripe) throw new Error('Payment disabled (missing STRIPE_SECRET_KEY)');
  const customer = await stripe.customers.create(payload);
  return { customerId: customer.id };
};

exports.verifyPayment = async (pi) => {
  // nếu có Stripe: lấy trạng thái thật từ Stripe; tạm thời đọc từ DB
  const doc = await Payment.findOne({ paymentIntentId: pi });
  return { status: doc?.status || 'unknown' };
};

exports.updatePayment = async (pi, orderId) => {
  await Payment.findOneAndUpdate({ paymentIntentId: pi }, { orderId }, { upsert: false });
};

exports.createPaymentIntent = async (userId, { amount, currency = 'usd', customerId, billingDetails = {}, metadata = {} }) => {
  if (!stripe) throw new Error('Payment disabled (missing STRIPE_SECRET_KEY)');
  if (!amount || !Number.isFinite(amount)) throw new Error('Missing amount');
  amount = Math.round(Number(amount)); // integer (cents)
  if (amount <= 0) throw new Error('Amount must be > 0');
  
  // BẮT BUỘC có customerId để phù hợp schema stripeCustomerId
  if (!customerId) throw new Error('Missing customerId');
  const pi = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata 
  });
  await Payment.create({
    paymentIntentId: pi.id,
    userId,
    stripeCustomerId: String(pi.customer || customerId),
    amount,
    currency,
    status: pi.status, // ex: 'requires_payment_method'
    billingName: billingDetails.name,
    billingEmail: billingDetails.email,
    billingAddress: billingDetails.address
  });
  return { clientSecret: pi.client_secret, paymentIntentId: pi.id, customerId: String(pi.customer || customerId) };
};

exports.listPaymentMethods = async (customerId) => {
  if (!stripe) throw new Error('Payment disabled');
  if (!customerId) throw new Error('Missing customerId');
  const { data } = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
  return data;
};

exports.handleWebhook = async (req) => {
  // If server is configured to use raw body for /webhook, you can verify signature here:
  // const sig = req.headers['stripe-signature'];
  // const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  // For simplicity (and if you cannot use raw body), treat it as already parsed:
  const event = req.body;

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      await Payment.findOneAndUpdate({ paymentIntentId: pi.id }, { status: 'succeeded' });
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      await Payment.findOneAndUpdate({ paymentIntentId: pi.id }, { status: 'requires_payment_method' });
      break;
    }
    default:
      // ignore others
      break;
  }
};
