const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../utils/jwt');
const adminController = require('../controllers/adminController');

// NOTE: All admin routes now require verifyToken + allowRoles('admin')
// This ensures only authenticated admins can access admin endpoints

router.get('/users', verifyToken, allowRoles('admin'), adminController.listUsers);

router.patch('/users/:id', verifyToken, allowRoles('admin'), adminController.updateUser);

// Khóa / mở khóa user (body: { isLocked: true/false })
router.patch('/users/:id/lock', verifyToken, allowRoles('admin'), adminController.lockUser);

// Soft delete user
router.delete('/users/:id', verifyToken, allowRoles('admin'), adminController.deleteUser);

// Hard delete user (nếu không có transaction history)
router.delete('/users/:id/no-transactions', verifyToken, allowRoles('admin'), adminController.deleteUserNoTransactions);

// ✅ Reset mật khẩu user
router.post('/users/:id/reset-password', verifyToken, allowRoles('admin'), adminController.resetUserPassword);

// Các route cũ cho restaurant
router.get('/restaurants', verifyToken, allowRoles('admin'), adminController.listRestaurants);
router.patch('/verify-restaurant/:id', verifyToken, allowRoles('admin'), adminController.verifyRestaurant);

module.exports = router;
