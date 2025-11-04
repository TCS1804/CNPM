// order-service/controllers/orderController.js
const orderService = require('../services/orderService');
const partnerService = require('../services/partnerService');
const Order = require('../models/Order');

// Danh sách nhà hàng (proxy sang restaurant-service)
exports.listRestaurants = async (req, res) => {
  try {
    const data = await partnerService.fetchRestaurants();
    res.json(data);
  } catch (e) {
    console.error('listRestaurants error:', e);
    res.status(500).json({
      message: 'Failed to fetch restaurants',
      detail: e.message
    });
  }
};

// Menu của 1 nhà hàng
exports.getMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId is required' });
    const data = await partnerService.fetchMenu(restaurantId);
    res.json(data);
  } catch (e) {
    console.error('getMenu error:', e);
    res.status(500).json({ message: e.message || 'Failed to fetch menu' });
  }
};

// Đơn theo nhà hàng
exports.listByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId is required' });
    const data = await orderService.listByRestaurant(restaurantId);
    res.json(data);
  } catch (e) {
    console.error('listByRestaurant error:', e);
    res.status(500).json({ message: e.message || 'Failed to fetch orders' });
  }
};

// Tạo đơn
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const doc = await orderService.create(userId, req.body);
    res.status(201).json(doc);
  } catch (e) {
    console.error('createOrder error:', e);
    res.status(400).json({ message: e.message });
  }
};

// Lấy chi tiết đơn
exports.getOrder = async (req, res) => {
  try {
    const doc = await orderService.getById(req.params.orderId);
    if (!doc) return res.status(404).json({ message: 'Order not found' });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

// Cập nhật trạng thái
exports.updateStatus = async (req, res) => {
  try {
    const doc = await orderService.updateStatus(req.params.orderId, req.body.status);
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.listByCustomer = async (req, res) => {
  try {
    const docs = await orderService.listByCustomer(req.user.id);
    res.json(docs);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

// Liệt kê đơn “available” cho tài xế:
// định nghĩa: đơn chưa có deliveryPersonId và status ở trạng thái có thể nhận
exports.listAvailableForDelivery = async (req, res) => {
  try {
    const docs = await Order.find({
      deliveryPersonId: { $in: [null, '', undefined] },
      status: { $in: ['pending', 'accepted'] } // tuỳ business, có thể chỉ 'accepted'
    }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to fetch available orders' });
  }
};

// Nhận đơn (assign cho tài xế đang đăng nhập)
exports.assignToDriver = async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.deliveryPersonId) {
      return res.status(400).json({ message: 'Order already assigned' });
    }

    order.deliveryPersonId = driverId;
    // đẩy trạng thái sang 'in-transit' (tuỳ flow: có thể chuyển 'accepted' trước)
    order.status = 'in-transit';
    await order.save();

    res.json(order);
  } catch (e) {
    res.status(400).json({ message: e.message || 'Failed to assign order' });
  }
};

// Hoàn tất giao (mark delivered)
exports.markDelivered = async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (String(order.deliveryPersonId) !== String(driverId)) {
      return res.status(403).json({ message: 'You are not assigned to this order' });
    }

    order.status = 'delivered'; // khớp enum trong model
    await order.save();

    res.json(order);
  } catch (e) {
    res.status(400).json({ message: e.message || 'Failed to complete order' });
  }
};