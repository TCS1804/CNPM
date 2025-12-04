const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, allowRoles } = require('../utils/jwt');

// Register
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Quên mật khẩu (gửi email với link reset)
router.post('/forgot-password', authController.forgotPassword);

// Đặt lại mật khẩu bằng token
router.post('/reset-password', authController.resetPassword);

// Đổi mật khẩu (đã đăng nhập)
router.post(
  '/change-password',
  verifyToken,
  allowRoles('customer', 'restaurant', 'delivery'),
  authController.changePassword
);

module.exports = router;
