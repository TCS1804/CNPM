const deliveryService = require('../services/deliveryService');

// Lấy danh sách đơn khả dụng (available orders)
exports.listAvailable = async (req, res) => {
  try {
    // Lấy token từ request gốc để forward sang order-service
    const auth = req.headers.authorization || '';
    const data = await deliveryService.listAvailable(auth);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to fetch available orders' });
  }
};

exports.listMine = async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const data = await deliveryService.listMine(auth);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to fetch driver orders' });
  }
};

// exports.getAll = async (req, res) => {
//   try {
//     const auth = req.headers.authorization;
//     const driverId = req.user.id; // lấy từ token

//     const response = await axios.get(`${ORDER_URL}?assignedTo=${driverId}`, {
//       headers: { Authorization: auth }
//     });
//     res.json(response.data);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// Nhận đơn (assign cho tài xế)
exports.accept = async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const { orderId } = req.params;
    const data = await deliveryService.accept(auth, orderId);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to accept order' });
  }
};

// Hoàn tất đơn (mark delivered)
exports.complete = async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const { orderId } = req.params;
    const data = await deliveryService.complete(auth, orderId);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to complete order' });
  }
};

// Admin: list deliveries
exports.adminListDeliveries = async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const data = await deliveryService.adminListDeliveries(auth, req.query);
    res.json(data);
  } catch (e) {
    console.error('adminListDeliveries error', e.response?.data || e.message);
    res.status(500).json({ message: e.message || 'Failed to fetch deliveries' });
  }
};

// Admin: delete order (soft delete)
exports.adminDeleteOrder = async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const { orderId } = req.params;
    const data = await deliveryService.adminDeleteOrder(auth, orderId);
    res.json(data);
  } catch (e) {
    console.error('adminDeleteOrder error', e.response?.data || e.message);
    // forward error code nếu có
    const status = e.response?.status || 500;
    res.status(status).json({
      message: e.response?.data?.message || e.message || 'Failed to delete order',
    });
  }
};