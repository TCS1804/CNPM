const express = require('express');
const router = express.Router();

const { verifyToken, allowRoles } = require('../utils/authMiddleware');
const orderController = require('../controllers/orderController');

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

module.exports = router;
