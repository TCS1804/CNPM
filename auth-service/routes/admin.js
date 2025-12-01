const express = require('express');
const router = express.Router();
// const { verifyToken, allowRoles } = require('../utils/jwt'); // ❌ không dùng nữa
const adminController = require('../controllers/adminController');

// ❗ Không bắt buộc login nữa
router.get('/users', adminController.listUsers);
router.get('/restaurants', adminController.listRestaurants);
router.patch('/verify-restaurant/:id', adminController.verifyRestaurant);

module.exports = router;
