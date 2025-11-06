const express = require('express');
const router = express.Router();

const { verifyToken, verifyTokenOrInternal, allowRoles } = require('../utils/authMiddleware');
const orderController = require('../controllers/orderController');
const Order = require('../models/Order');

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

// 🔸 Đổi đường dẫn động để tránh nuốt "/restaurant"
router.get('/id/:orderId', verifyToken, orderController.getOrder);
router.patch('/id/:orderId/status', verifyToken, allowRoles('restaurant', 'admin'), orderController.updateStatus)

router.get('/customer/orders', verifyToken, allowRoles('customer'), orderController.listByCustomer);

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

    res.json({ count: orders.length, total, currency: orders[0]?.split?.currency || 'VND' });
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

module.exports = router;
