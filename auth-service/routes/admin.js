const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// NOTE: Demo hiện tại bỏ check auth/role.
// Thực tế nên dùng middleware verifyToken + allowRoles('admin').

router.get('/users', adminController.listUsers);

router.patch('/users/:id', adminController.updateUser);

// Khóa / mở khóa user (body: { isLocked: true/false })
router.patch('/users/:id/lock', adminController.lockUser);

// Soft delete user
router.delete('/users/:id', adminController.deleteUser);

// ✅ Reset mật khẩu user
router.post('/users/:id/reset-password', adminController.resetUserPassword);

// Các route cũ cho restaurant
router.get('/restaurants', adminController.listRestaurants);
router.patch('/verify-restaurant/:id', adminController.verifyRestaurant);

module.exports = router;
