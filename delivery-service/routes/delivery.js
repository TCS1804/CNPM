const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../utils/authMiddleware');
const deliveryController = require('../controllers/deliveryController');

// --- Routes "mới": làm việc với order-service ---
router.get(
  '/orders/available',
  verifyToken,
  allowRoles('driver', 'delivery'),
  deliveryController.listAvailable   // đơn CHƯA có tài xế (available)
);

router.post(
  '/orders/:orderId/accept',
  verifyToken,
  allowRoles('driver', 'delivery'),
  deliveryController.accept          // nhận đơn -> assign cho tài xế hiện tại
);

router.post(
  '/orders/:orderId/complete',
  verifyToken,
  allowRoles('driver', 'delivery'),
  deliveryController.complete        // giao xong -> delivered
);

// --- Alias cho FE cũ ---
// /delivery/all -> danh sách đơn available (để tài xế lựa chọn)
router.get(
  '/all',
  verifyToken,
  allowRoles('driver', 'delivery'),
  deliveryController.listAvailable
);

// /delivery/orders -> danh sách ĐƠN CỦA TÀI XẾ HIỆN TẠI
router.get(
  '/orders',
  verifyToken,
  allowRoles('driver', 'delivery'),
  deliveryController.listMine
);

// Mapping API cũ: PATCH /delivery/order/:id { status }
router.patch(
  '/order/:id',
  verifyToken,
  allowRoles('driver', 'delivery'),
  (req, res) => {
    const { id } = req.params;
    const status = (req.body && req.body.status || '').toLowerCase();

    // Map status cũ -> hành vi mới
    if (status === 'in-transit' || status === 'accepted' || status === 'assign') {
      req.params.orderId = id;      // đồng bộ tên param cho accept()
      return deliveryController.accept(req, res);
    }
    if (status === 'completed' || status === 'complete' || status === 'done' || status === 'delivered') {
      req.params.orderId = id;      // đồng bộ tên param cho complete()
      return deliveryController.complete(req, res);
    }
    return res.status(400).json({ message: 'Unsupported status' });
  }
);

// Admin delivery: list deliveries (KHÔNG yêu cầu login theo yêu cầu hiện tại)
router.get(
  '/admin/deliveries',
  deliveryController.adminListDeliveries
);

// Admin delivery: delete (soft delete) một đơn (KHÔNG yêu cầu login)
router.delete(
  '/admin/deliveries/:orderId',
  deliveryController.adminDeleteOrder
);

module.exports = router;
