const express = require('express');
const router = express.Router();

const { verifyToken, verifyTokenOrInternal, allowRoles } = require('../utils/authMiddleware');
const orderController = require('../controllers/orderController');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { sendEmail } = require('../services/notificationClient'); // 👈 THÊM

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

router.get('/admin/summary', verifyToken, allowRoles('admin'), async (req, res) => {
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
router.get('/admin/list', verifyToken, allowRoles('admin'), async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to get orders' });
  }
});

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
