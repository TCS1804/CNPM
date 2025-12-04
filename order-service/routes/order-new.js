const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { verifyToken, verifyTokenOrInternal, allowRoles } = require('../utils/authMiddleware');
const orderController = require('../controllers/orderController');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { sendEmail, sendWeb } = require('../services/notificationClient'); // 👈 THÊM

const PLATFORM_CURRENCY = (process.env.PLATFORM_CURRENCY || 'USD').toUpperCase();

// Browse restaurants & menus (via partner service)
router.get('/restaurants', verifyToken, allowRoles('customer'), orderController.listRestaurants);
router.get('/restaurant/:restaurantId/menu', verifyToken, allowRoles('customer'), orderController.getMenu);

// 🔹 NEW: danh sách đơn theo nhà hàng
router.get(
  '/restaurant',
  verifyToken,
  allowRoles('restaurant', 'admin'),
  orderController.listByRestaurant
);

// Order CRUD-ish
router.post('/create', verifyToken, allowRoles('customer'), orderController.createOrder);

// Customer huỷ đơn
router.post(
  '/:orderId/cancel',
  verifyToken,
  allowRoles('customer', 'admin'),
  orderController.cancelOrder
);

// 🔸 Đổi đường dẫn động để tránh nuốt "/restaurant"
router.get('/id/:orderId', verifyTokenOrInternal, orderController.getOrder);
router.patch('/id/:orderId/status', verifyToken, allowRoles('restaurant', 'admin'), orderController.updateStatus)

router.get('/customer/orders', verifyToken, allowRoles('customer'), orderController.listByCustomer);

// ================== CART (giỏ hàng) cho customer ==================

// GET /order/cart  → lấy giỏ hàng của user hiện tại
router.get(
  '/cart',
  verifyToken,
  allowRoles('customer'),
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;

      let cart = await Cart.findOne({ userId });

      // Nếu chưa có giỏ hàng thì tạo rỗng cho tiện FE
      if (!cart) {
        cart = await Cart.create({ userId, items: [] });
      }

      res.json(cart);
    } catch (e) {
      console.error('GET /order/cart error:', e);
      res.status(500).json({ message: e.message || 'Failed to get cart' });
    }
  }
);

// PUT /order/cart  → ghi đè toàn bộ items trong giỏ hàng
router.put(
  '/cart',
  verifyToken,
  allowRoles('customer'),
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const { items } = req.body || {};

      if (!Array.isArray(items)) {
        return res.status(400).json({ message: 'items must be an array' });
      }

      // Chuẩn hoá dữ liệu để lưu
      const normalized = items.map((it) => ({
        menuItemId: it._id || it.menuItemId || it.menuId || null,
        restaurantId: it.restaurantId || null,
        name: it.name,
        price: Number(it.price || 0),
        quantity: Number(it.quantity || 1),
        restaurantName: it.restaurantName || '',
      }));

      const cart = await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: normalized } },
        { upsert: true, new: true }
      );

      res.json(cart);
    } catch (e) {
      console.error('PUT /order/cart error:', e);
      res.status(500).json({ message: e.message || 'Failed to update cart' });
    }
  }
);

// === Thêm mới cho delivery-service ===
router.get(
  '/available',
  verifyToken,
  allowRoles('driver', 'delivery', 'admin'),
  orderController.listAvailableForDelivery
);

router.post(
  '/:orderId/assign',
  verifyToken,
  allowRoles('driver', 'delivery', 'admin'),
  orderController.assignToDriver
);

router.post(
  '/:orderId/complete',
  verifyToken,
  allowRoles('driver', 'delivery', 'admin'),
  orderController.markDelivered
);

// Customer confirms they have received the order
router.post(
  '/:orderId/confirm-received',
  verifyToken,
  allowRoles('customer'),
  orderController.confirmReceived
);

router.get(
  '/driver/orders',
  verifyToken,
  allowRoles('driver', 'delivery', 'admin'),
  orderController.listOrdersForDriver
);

router.get('/', async (req, res) => {
  const { assignedTo } = req.query;
  const query = {};

  if (assignedTo) query.assignedTo = assignedTo;

  const orders = await Order.find(query).populate('assignedTo');
  res.json(orders);
});

// NEW: endpoint để payment-service ghi kết quả chia tiền vào đơn
router.patch('/:id/split', verifyTokenOrInternal, async (req, res) => {
  try {
    const { id } = req.params;
    const { split, paymentIntentId } = req.body || {};
    if (!split || !paymentIntentId) {
      return res.status(400).json({ message: 'Missing split or paymentIntentId' });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      {
        $set: {
          split,
          paymentIntentId
        }
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: 'Order not found' });
    return res.json(order);
  } catch (e) {
    console.error('PATCH /:id/split error:', e);
    res.status(400).json({ message: e.message });
  }
});

// Tổng quan cho Admin (thống kê cơ bản + đơn gần đây)
router.get('/admin/overview', async (req, res) => {
  try {
    const baseMatch = { isDeleted: { $ne: true } };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      pendingOrders,
      acceptedOrders,
      inTransitOrders,
      deliveredOrders,
      todayOrders,
      recentOrders,
      revenueAgg,
    ] = await Promise.all([
      // tổng số đơn (không tính đã xoá)
      Order.countDocuments(baseMatch),
      Order.countDocuments({ ...baseMatch, status: 'pending' }),
      Order.countDocuments({ ...baseMatch, status: 'accepted' }),
      Order.countDocuments({ ...baseMatch, status: 'in-transit' }),
      Order.countDocuments({ ...baseMatch, status: 'delivered' }),
      Order.countDocuments({ ...baseMatch, createdAt: { $gte: startOfToday } }),

      // 5 đơn gần nhất
      Order.find(baseMatch)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id status total currency createdAt'),

      // tổng doanh thu đã settle chia theo vai trò
      Order.aggregate([
        {
          $match: {
            ...baseMatch,
            'split.settledAt': { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            admin: { $sum: '$split.amounts.admin' },
            restaurant: { $sum: '$split.amounts.restaurant' },
            delivery: { $sum: '$split.amounts.delivery' },
          },
        },
      ]),
    ]);

    const revenueRow = revenueAgg[0] || {};
    const currency = PLATFORM_CURRENCY; // hoặc lấy từ revenueRow nếu bạn muốn

    res.json({
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        accepted: acceptedOrders,
        inTransit: inTransitOrders,
        delivered: deliveredOrders,
        today: todayOrders,
      },
      revenue: {
        admin: revenueRow.admin || 0,
        restaurant: revenueRow.restaurant || 0,
        delivery: revenueRow.delivery || 0,
        currency,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o._id,
        status: o.status,
        total: o.total,
        currency: o.currency || currency,
        createdAt: o.createdAt,
      })),
    });
  } catch (e) {
    console.error('[order-service] GET /admin/overview error', e);
    res.status(500).json({ message: 'internal_error' });
  }
});

router.get('/admin/summary', async (req, res) => {
  try {
    const orders = await Order.find({ 'split.settledAt': { $exists: true } });
    const total = orders.reduce((acc, o) => {
      acc.admin += o?.split?.amounts?.admin || 0;
      acc.restaurant += o?.split?.amounts?.restaurant || 0;
      acc.delivery += o?.split?.amounts?.delivery || 0;
      return acc;
    }, { admin: 0, restaurant: 0, delivery: 0 });

    res.json({ count: orders.length, total, currency: orders[0]?.split?.currency || PLATFORM_CURRENCY });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ✅ Thêm danh sách đơn cho admin
router.get('/admin/list', async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to get orders' });
  }
});

// Internal: count orders for a restaurant (used by other services)
router.get(
  '/internal/restaurant/:id/orders-count',
  verifyTokenOrInternal,
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log('[order-service] Counting orders for restaurantId:', id);
      
      // Try both string and ObjectId formats
      let count = 0;
      try {
        // Try as string first
        count = await Order.countDocuments({ restaurantId: id });
        if (count === 0 && mongoose.Types.ObjectId.isValid(id)) {
          // If no results with string, try as ObjectId
          count = await Order.countDocuments({ restaurantId: new mongoose.Types.ObjectId(id) });
        }
      } catch (innerErr) {
        console.error('[order-service] error counting orders:', innerErr.message);
      }
      
      console.log('[order-service] Found', count, 'orders for restaurantId:', id);
      res.json({ count });
    } catch (e) {
      console.error('[order-service] GET /internal/restaurant/:id/orders-count error', e);
      res.status(500).json({ message: e.message || 'internal_error' });
    }
  }
);

router.patch('/:id', verifyTokenOrInternal, async (req, res) => {
  const { id } = req.params;
  const { totalCents, currency, split, paymentIntentId, status } = req.body || {};

  const update = {};
  if (typeof totalCents === 'number') update.totalCents = totalCents;
  if (currency) update.currency = String(currency).toUpperCase();
  if (split && typeof split === 'object') update.split = split;
  if (paymentIntentId) update.paymentIntentId = paymentIntentId;
  if (status) update.status = status;

  // Nếu tổng tiền chưa có trong order, mà split.amounts đã có đủ -> tự tính totalCents
  if (update.totalCents == null && update.split?.amounts) {
    const a = update.split.amounts;
    const sum = Number(a.admin || 0) + Number(a.restaurant || 0) + Number(a.delivery || 0);
    if (sum > 0) update.totalCents = sum;
  }

  const doc = await Order.findByIdAndUpdate(id, update, { new: true });
  if (!doc) return res.status(404).json({ message: 'Order not found' });
  res.json(doc);
});

// Admin: list đơn giao hàng (có filter, search) - không yêu cầu login trong bài tập này
router.get(
  '/admin/deliveries',
  orderController.adminListDeliveries
);

// Admin: xóa (soft delete) một đơn - không yêu cầu login
router.delete(
  '/admin/deliveries/:orderId',
  orderController.adminDeleteOrder
);

router.patch('/internal/:orderId/drone-mission', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { missionId, mode, status } = req.body || {};

    const update = {};

    if (missionId) {
      update['delivery.missionId'] = String(missionId);
    }

    if (mode) {
      update['delivery.mode'] = mode;
      update.transportMode = mode;
    }

    if (status) {
      update.status = status;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const doc = await Order.findByIdAndUpdate(
      orderId,
      { $set: update },
      { new: true }
    );

    if (!doc) return res.status(404).json({ message: 'Order not found' });

    // 🔔 Nếu drone báo delivered thì gửi email cho khách
    if (doc.status === 'delivered' && doc.customerContact?.email) {
      await sendEmail({
        to: doc.customerContact.email,
        subject: `Đơn hàng ${doc._id} đã được drone giao thành công`,
        text: `Đơn hàng của bạn đã được drone giao tới địa chỉ: ${doc.location?.address || 'không xác định'}.`,
      });
    }
    // Also send web notification to customer
    try {
      sendWeb({
        target: { userId: doc.customerId },
        title: 'Đơn hàng đã được giao bởi drone',
        body: `Đơn #${doc._id?.toString().slice(-6) || ''} đã được drone giao thành công.`,
        data: { orderId: doc._id },
      });
    } catch (e) {}

    res.json(doc);
  } catch (e) {
    console.error(
      '[order-service] PATCH /internal/:orderId/drone-mission error',
      e
    );
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
