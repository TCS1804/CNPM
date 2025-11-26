// payment-service/services/paymentService.js
const Stripe = require('stripe');
const Payment = require('../models/Payment');
const SplitConfig = require('../models/SplitConfig');
const connectService = require('./connectService');
const axios = require('axios');

// ========== CONFIG CHUNG ==========
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || 'http://order-service:5003';

const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'dev-secret';
const CONNECT_ENABLED = process.env.STRIPE_CONNECT_ENABLED === '1';

// 👉 TỪ GIỜ TEST BẰNG USD
// Nếu sau này muốn chuyển qua VND: chỉ cần đổi giá trị này thành 'vnd'
const PLATFORM_CURRENCY = (process.env.PLATFORM_CURRENCY || 'usd').toLowerCase();

// ========== HELPERS ==========

async function getActiveConfig(restaurantId) {
  const filter = { active: true };
  if (restaurantId) filter.restaurantId = restaurantId;
  return await SplitConfig.findOne(filter).sort({ createdAt: -1 });
}

/**
 * Tính chia tiền theo config
 * amountCents: tổng tiền (integer, đang coi như "cents" của PLATFORM_CURRENCY)
 */
async function computeSplit(amountCents, restaurantId) {
  const cfg = await getActiveConfig(restaurantId);
  const method = cfg?.method || 'percent';
  const percent = cfg?.percent || { admin: 10, restaurant: 85, delivery: 5 };
  const fixed = cfg?.fixed || { deliveryFee: 0 };
  const cur = (cfg?.currency || PLATFORM_CURRENCY).toUpperCase(); // ví dụ: USD

  let adminCents = 0;
  let restaurantCents = 0;
  let deliveryCents = 0;

  if (method === 'percent') {
    adminCents = Math.floor((amountCents * (percent.admin || 0)) / 100);
    deliveryCents = Math.floor((amountCents * (percent.delivery || 0)) / 100);
    restaurantCents = amountCents - adminCents - deliveryCents;
  } else {
    // method = 'fixed' : phí ship cố định, phần còn lại chia admin/restaurant
    deliveryCents = Math.min(fixed.deliveryFee || 0, amountCents);
    const base = amountCents - deliveryCents;
    const pAdmin = percent.admin ?? 10;
    adminCents = Math.floor((base * pAdmin) / 100);
    restaurantCents = base - adminCents;
  }

  if (restaurantCents < 0) restaurantCents = 0;

  return {
    method,
    currency: cur,
    rates: {
      admin: percent.admin || 0,
      restaurant: percent.restaurant || 0,
      delivery: percent.delivery || 0,
    },
    amounts: { adminCents, restaurantCents, deliveryCents },
  };
}

/**
 * Sau khi payment thành công:
 *  - Tính & lưu split vào Order
 *  - Nếu bật Stripe Connect: chuyển tiền cho restaurant từ PLATFORM balance
 *  - KHÔNG chuyển tiền cho delivery ở đây (để dành cho /transfer/delivery)
 */
async function applySplitForOrder(
  orderId,
  paymentIntentId,
  amountCents,
  currencyIgnored, // luôn dùng PLATFORM_CURRENCY
  restaurantId
) {
  console.log(
    '[applySplitForOrder] orderId=',
    orderId,
    'amount=',
    amountCents,
    'restaurantId=',
    restaurantId
  );

  // 1) Tính chia tiền (theo PLATFORM_CURRENCY -> USD)
  const split = await computeSplit(amountCents, restaurantId);
  const { method, currency, rates, amounts } = split;
  const { adminCents, restaurantCents, deliveryCents } = amounts;

  // 2) Lưu split vào Order
  const splitPayload = {
    method,
    rates,
    amounts: {
      admin: adminCents,
      restaurant: restaurantCents,
      delivery: deliveryCents,
    },
    currency, // ví dụ: "USD"
    settledAt: new Date(),
  };

  await axios.patch(
    `${ORDER_SERVICE_URL}/order/${orderId}`,
    {
      totalCents: amountCents,
      split: splitPayload,
      paymentIntentId,
    },
    {
      headers: { 'x-internal-secret': INTERNAL_SECRET },
    }
  );

  // 3) Nếu không có Stripe / không bật Connect thì dừng tại đây
  if (!stripe || !CONNECT_ENABLED) {
    return splitPayload;
  }

  // 4) Chuyển tiền cho restaurant từ PLATFORM balance
  if (restaurantId && restaurantCents > 0) {
    try {
      const restaurantAccountId = await connectService.getStripeAccountId(
        'restaurant',
        restaurantId
      );

      if (restaurantAccountId) {
        const transfer = await stripe.transfers.create({
          amount: restaurantCents,
          currency: PLATFORM_CURRENCY, // 'usd'
          destination: restaurantAccountId,
          metadata: {
            orderId: String(orderId),
            role: 'restaurant',
          },
        });

        console.log('[applySplitForOrder] transferred to restaurant', {
          orderId,
          restaurantId,
          amount: restaurantCents,
          transferId: transfer.id,
        });
      } else {
        console.warn(
          '[applySplitForOrder] Restaurant has no Stripe account:',
          restaurantId
        );
      }
    } catch (e) {
      console.error(
        '[applySplitForOrder] Transfer to restaurant failed:',
        e?.message || e
      );
    }
  }

  // deliveryCents sẽ được dùng trong transferDelivery khi đơn delivered
  return splitPayload;
}

// ========== PUBLIC SERVICES ==========

exports.createCustomer = async (userId, payload) => {
  // Nếu chưa cấu hình Stripe thì trả mock
  if (!stripe) {
    console.warn('[payment-service] Stripe disabled, returning mock customer id');
    return {
      customerId: 'mock_' + userId,
      mock: true,
      reason: 'stripe_not_configured',
      payload,
    };
  }

  try {
    console.log('[payment-service] creating Stripe customer for user', userId);
    const customer = await stripe.customers.create(payload);
    return { customerId: customer.id, mock: false };
  } catch (err) {
    console.error('[payment-service] createCustomer Stripe error', err);

    // 👉 Nếu lỗi do không kết nối được Stripe (như log của bạn)
    const isConnError =
      err.type === 'StripeConnectionError' ||
      err.code === 'ECONNREFUSED' ||
      err?.detail?.code === 'ECONNREFUSED';

    if (isConnError) {
      // KHÔNG throw nữa: degrade thành mock, nhưng báo rõ là đang offline
      console.warn(
        '[payment-service] Stripe connection failed, returning MOCK customer instead'
      );
      return {
        customerId: 'mock_' + userId,
        mock: true,
        reason: 'stripe_connection_error',
        message: err.message,
      };
    }

    // Các lỗi khác (key sai, payload sai, ...) thì vẫn quăng lỗi để biết
    throw new Error('Failed to create Stripe customer');
  }
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
  const methods = await stripe.paymentMethods.list({
    customer,
    type: 'card',
  });
  return methods.data || [];
};

/**
 * Cập nhật Payment sau khi frontend báo kết quả PaymentIntent
 * Nếu PI đã succeeded thì sẽ gọi applySplitForOrder
 */
exports.updatePayment = async (pi, payload = {}) => {
  let update = {};
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    update = payload;
  } else if (payload != null) {
    update = { status: String(payload) };
  }

  // 1) Cập nhật Payment document
  let doc = await Payment.findOneAndUpdate(
    { paymentIntentId: pi },
    update,
    { new: true }
  );
  if (!doc) throw new Error('Payment not found');

  let finalStatus = doc.status;
  let piStripe = null;

  // 2) Đồng bộ trạng thái thật từ Stripe
  if (stripe) {
    try {
      piStripe = await stripe.paymentIntents.retrieve(pi);

      if (piStripe?.status && piStripe.status !== doc.status) {
        finalStatus = piStripe.status;
        doc.status = finalStatus;

        await Payment.updateOne(
          { _id: doc._id },
          { status: finalStatus }
        );
      }
    } catch (e) {
      console.error('Could not sync status from Stripe:', e.message);
    }
  }

  console.log(
    '[updatePayment] pi=',
    pi,
    'status=',
    finalStatus,
    'orderId=',
    doc.orderId
  );

  // 3) Nếu PaymentIntent đã succeed & có orderId => chia tiền + chuyển restaurant
  try {
    const isSucceeded =
      finalStatus === 'succeeded' ||
      piStripe?.status === 'succeeded';

    if (doc.orderId && isSucceeded) {
      let restaurantId = payload.restaurantId;
      if (!restaurantId && piStripe?.metadata?.restaurantId) {
        restaurantId = piStripe.metadata.restaurantId;
      }

      const amountCents =
        typeof doc.amount === 'number'
          ? doc.amount
          : Number(doc.amount || 0);

      const currency = PLATFORM_CURRENCY; // luôn dùng 'usd' khi test

      console.log('[updatePayment] calling applySplitForOrder with', {
        orderId: doc.orderId,
        amountCents,
        currency,
        restaurantId,
      });

      await applySplitForOrder(
        doc.orderId,
        pi,
        amountCents,
        currency,
        restaurantId
      );
    }
  } catch (e) {
    console.error(
      'applySplitForOrder from updatePayment failed:',
      e?.response?.data || e.message
    );
  }

  return doc;
};

/**
 * Tạo PaymentIntent: tiền đi vào PLATFORM account (USD)
 * -> KHÔNG dùng transfer_data.destination
 * -> KHÔNG dùng application_fee_amount
 */
exports.createPaymentIntent = async (userId, body = {}) => {
  if (!stripe) throw new Error('Payment disabled (missing STRIPE_SECRET_KEY)');

  let {
    amount,
    // currency từ client cho vui thôi, ta bỏ qua và dùng PLATFORM_CURRENCY
    customerId,
    orderId,
    restaurantId,
    metadata = {},
  } = body;

  if (amount == null) throw new Error('Missing amount');
  if (!customerId) throw new Error('Missing customerId');
  if (!restaurantId) throw new Error('Missing restaurantId');

  const amountNumber = Number(amount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    throw new Error('Amount must be > 0');
  }

  // Convert dollars -> cents
  const amountCents = Math.round(amountNumber * 100);

  // Tính split theo cents
  const split = await computeSplit(amountCents, restaurantId);
  const { adminCents, restaurantCents, deliveryCents } = split.amounts;

  const pi = await stripe.paymentIntents.create({
    amount: amountCents,             // cent
    currency: PLATFORM_CURRENCY,     // 'usd'
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: {
      ...metadata,
      orderId,
      restaurantId,
      userId,
      adminCents,
      restaurantCents,
      deliveryCents,
      platformCurrency: PLATFORM_CURRENCY.toUpperCase(),
    },
  });

  await Payment.create({
    paymentIntentId: pi.id,
    userId,
    stripeCustomerId: customerId,
    amount: amountCents,                     // cent
    currency: PLATFORM_CURRENCY.toUpperCase(),
    status: pi.status || 'requires_confirmation',
    orderId,
    createdAt: new Date(),
  });

  return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
};

/**
 * Chuyển tiền cho shipper (delivery) từ PLATFORM balance (USD)
 * Được gọi khi đơn đã complete/delivered
 */
exports.transferDelivery = async (orderId, userId, role) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }
  if (!CONNECT_ENABLED) {
    throw new Error('Stripe Connect transfers disabled');
  }

  // 1) Lấy order để biết split + deliveryPersonId + paymentIntentId
  let order;
  try {
    const { data } = await axios.get(
      `${ORDER_SERVICE_URL}/order/id/${orderId}`,
      {
        headers: {
          'x-internal-secret': INTERNAL_SECRET,
        },
      }
    );
    order = data;
  } catch (e) {
    throw new Error('Cannot fetch order for payout');
  }

  if (!order.paymentIntentId) {
    throw new Error('Order has no paymentIntentId');
  }

  const deliveryAmount =
    order.split?.amounts?.delivery != null
      ? Number(order.split.amounts.delivery)
      : 0;

  if (!deliveryAmount || deliveryAmount <= 0) {
    throw new Error('Order has no delivery split amount');
  }

  if (!order.deliveryPersonId) {
    throw new Error('Order has no assigned delivery person');
  }

  // 2) Quyền: nếu là delivery/driver thì chỉ được rút tiền cho đơn của chính mình
  if (role === 'delivery' || role === 'driver') {
    if (String(order.deliveryPersonId) !== String(userId)) {
      throw new Error('You are not assigned to this order');
    }
  }

  // 3) Lấy Stripe account của shipper
  const driverAccountId = await connectService.getStripeAccountId(
    'delivery',
    order.deliveryPersonId
  );
  if (!driverAccountId) {
    throw new Error('Delivery user has no Stripe account');
  }

  // 4) Currency: luôn dùng PLATFORM_CURRENCY (usd)
  const currency = PLATFORM_CURRENCY;

  // 5) Tạo transfer cho shipper từ PLATFORM balance
  const transfer = await stripe.transfers.create({
    amount: deliveryAmount,
    currency,
    destination: driverAccountId,
    metadata: {
      orderId: String(orderId),
      role: 'delivery',
    },
  });

  console.log('[transferDelivery] success', {
    orderId,
    deliveryPersonId: order.deliveryPersonId,
    amount: deliveryAmount,
    transferId: transfer.id,
  });

  return { ok: true, transferId: transfer.id };
};

/**
 * Webhook sync trạng thái Payment
 * (không tự chia tiền ở đây, việc chia nằm trong updatePayment)
 */
exports.webhook = async (req) => {
  const event = req.body;

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;

      const paymentDoc = await Payment.findOneAndUpdate(
        { paymentIntentId: pi.id },
        { status: 'succeeded' },
        { new: true }
      );

      if (paymentDoc?.orderId) {
        try {
          await axios.patch(
            `${ORDER_SERVICE_URL}/order/${paymentDoc.orderId}`,
            {
              status: 'accepted',
              paymentIntentId: pi.id,
            },
            {
              headers: { 'x-internal-secret': INTERNAL_SECRET },
            }
          );
        } catch (e) {
          console.error(
            'Failed to update order status from webhook:',
            e?.response?.data || e.message
          );
        }
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
