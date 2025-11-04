const Order = require('../models/Order');

exports.create = async (userId, { restaurantId, items, address, note }) => {
  if (!restaurantId || !Array.isArray(items) || items.length === 0) {
    throw new Error('restaurantId and items are required');
  }
  const total = items.reduce((s, it) => s + (Number(it.price) * Number(it.quantity || 1)), 0);
  const order = new Order({
    customerId: userId,
    restaurantId,
    items,
    total,
    location: {address}, // nếu UI đang gửi address, bạn có thể map vào location
    note,
    status: 'pending'
  });
  return order.save();
};

exports.getById = (id) => Order.findById(id);

exports.updateStatus = (id, status) => {
  if (!status) throw new Error('Missing status');
  return Order.findByIdAndUpdate(id, { status }, { new: true });
};

exports.listByRestaurant = (restaurantId) => {
  if (!restaurantId) throw new Error('restaurantId is required');
  // Schema đang là String => truy vấn String cho chắc chắn
  return Order.find({ restaurantId }).sort({ createdAt: -1 });
};

exports.listByCustomer = (customerId) => {
  if (!customerId) throw new Error('customerId is required');
  return Order.find({ customerId }).sort({ createdAt: -1 });
};
