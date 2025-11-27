const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../utils/authMiddleware');
const restaurantController = require('../controllers/restaurantController');
const menuController = require('../controllers/menuController');

// Restaurants
router.get('/api/restaurants', restaurantController.list);
router.get('/api/restaurants-id', verifyToken, restaurantController.listIds);
router.post('/api/restaurants', verifyToken, allowRoles('restaurant'), restaurantController.create);

// Menu
router.get('/api/restaurants/:id/menu', menuController.getByRestaurant);
router.post('/api/restaurants/:id/menu', verifyToken, allowRoles('restaurant'), menuController.addItem);
router.put('/api/menu/:itemId', verifyToken, allowRoles('restaurant'), menuController.updateItem);
router.delete('/api/menu/:itemId', verifyToken, allowRoles('restaurant'), menuController.deleteItem);
router.get('/menu/all', menuController.getAll);

router.get(
  '/api/restaurants-id',
  verifyToken,
  allowRoles('restaurant', 'admin'),
  restaurantController.listIds
);

module.exports = router;
