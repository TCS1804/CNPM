const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../utils/authMiddleware');
const restaurantController = require('../controllers/restaurantController');
const menuController = require('../controllers/menuController');

// ================== PUBLIC / OWNER ==================

// Danh sách nhà hàng (public – cho khách / order-service / drone map dùng)
router.get('/api/restaurants', restaurantController.list);

// Lấy chi tiết 1 nhà hàng (public – cho order-service dùng trong createOrder)
// Không cần verifyToken vì chỉ trả về thông tin cơ bản
router.get('/api/restaurants/:id', restaurantController.getByIdPublic);

// Danh sách restaurant-id (chủ nhà hàng / admin dùng)
// - restaurant: chỉ thấy nhà hàng của mình (lọc trong controller.listIds)
// - admin: thấy tất cả
router.get('/api/restaurants-id', verifyToken, restaurantController.listIds);

// Restaurant owner tự tạo nhà hàng của mình
router.post(
  '/api/restaurants',
  verifyToken,
  allowRoles('restaurant'),
  restaurantController.create
);

// ========== ADMIN – QUẢN LÝ RESTAURANT ==========

// List + lọc + phân trang
router.get(
  '/admin/restaurants',
  verifyToken,
  allowRoles('admin'),
  restaurantController.adminList
);

// Xem chi tiết
router.get(
  '/admin/restaurants/:id',
  verifyToken,
  allowRoles('admin'),
  restaurantController.adminGetById
);

// Tạo mới restaurant thay cho chủ
router.post(
  '/admin/restaurants',
  verifyToken,
  allowRoles('admin'),
  restaurantController.adminCreate
);

// Sửa thông tin / đổi owner
router.put(
  '/admin/restaurants/:id',
  verifyToken,
  allowRoles('admin'),
  restaurantController.adminUpdate
);

// Xóa (soft delete)
router.delete(
  '/admin/restaurants/:id',
  verifyToken,
  allowRoles('admin'),
  restaurantController.adminDelete
);

// Bật / tắt hoạt động
router.patch(
  '/admin/restaurants/:id/status',
  verifyToken,
  allowRoles('admin'),
  restaurantController.adminToggleActive
);

// ================== MENU ==================

// Menu của 1 nhà hàng (public)
router.get('/api/restaurants/:id/menu', menuController.getByRestaurant);

// Thêm món (chủ nhà hàng)
router.post(
  '/api/restaurants/:id/menu',
  verifyToken,
  allowRoles('restaurant'),
  menuController.addItem
);

// Sửa món
router.put(
  '/api/menu/:itemId',
  verifyToken,
  allowRoles('restaurant'),
  menuController.updateItem
);

// Xóa món
router.delete(
  '/api/menu/:itemId',
  verifyToken,
  allowRoles('restaurant'),
  menuController.deleteItem
);

// Lấy toàn bộ menu
router.get('/menu/all', menuController.getAll);

module.exports = router;
