const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../utils/jwt');
const adminController = require('../controllers/adminController');

// Get all users (admin only)
router.get('/users', verifyToken, allowRoles('admin'), adminController.listUsers);

// Get all restaurants (admin only)
router.get('/restaurants', verifyToken, allowRoles('admin'), adminController.listRestaurants);

// Approve a restaurant
router.patch('/verify-restaurant/:id', verifyToken, allowRoles('admin'), adminController.verifyRestaurant);

module.exports = router;
