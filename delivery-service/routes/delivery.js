const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../utils/authMiddleware');
const deliveryController = require('../controllers/deliveryController');

// --- Routes "mới"
router.get('/orders/available',
  verifyToken, allowRoles('driver', 'delivery'),  // hỗ trợ cả 2 nếu cần
  deliveryController.listAvailable
);

router.post('/orders/:orderId/accept',
  verifyToken, allowRoles('driver', 'delivery'),
  deliveryController.accept
);

router.post('/orders/:orderId/complete',
  verifyToken, allowRoles('driver', 'delivery'),
  deliveryController.complete
);

// --- Alias để tương thích client cũ
router.get('/orders',
  verifyToken, allowRoles('driver', 'delivery'),
  deliveryController.listAvailable
);

router.get('/all',
  verifyToken, allowRoles('driver', 'delivery'),
  deliveryController.listAvailable
);

router.patch('/order/:id',
  verifyToken, allowRoles('driver', 'delivery'),
  (req, res) => {
    const { id } = req.params;
    const status = (req.body && req.body.status || '').toLowerCase();

    // Map status cũ -> hành vi mới
    if (status === 'in-transit' || status === 'accepted' || status === 'assign') {
      req.params.orderId = id;              // 🔧 đồng bộ tên tham số
      return deliveryController.accept(req, res);
    }
    if (status === 'completed' || status === 'complete' || status === 'done') {
      req.params.orderId = id;              // 🔧 đồng bộ tên tham số
      return deliveryController.complete(req, res);
    }
    return res.status(400).json({ message: 'Unsupported status' });
  }
);

// API “mới”
router.get('/orders/available', verifyToken, allowRoles('driver', 'delivery'), deliveryController.listAvailable);
router.post('/orders/:orderId/accept', verifyToken, allowRoles('driver', 'delivery'), deliveryController.accept);
router.post('/orders/:orderId/complete', verifyToken, allowRoles('driver', 'delivery'), deliveryController.complete);

// === Legacy alias để không phải sửa FE cũ ===
router.get('/all',   verifyToken, allowRoles('driver', 'delivery'), deliveryController.listAvailable);
router.get('/orders', verifyToken, allowRoles('driver', 'delivery'), deliveryController.listAvailable);

module.exports = router;
