const deliveryService = require('../services/deliveryService');

exports.listAvailable = async (_req, res) => {
  try {
    const data = await deliveryService.listAvailable();
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to fetch available orders' });
  }
};

exports.accept = async (req, res) => {
  try {
    const { orderId } = req.params;
    const doc = await deliveryService.accept(req.user.id, orderId);
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message || 'Failed to accept order' });
  }
};

exports.complete = async (req, res) => {
  try {
    const { orderId } = req.params;
    const doc = await deliveryService.complete(req.user.id, orderId);
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message || 'Failed to complete order' });
  }
};
