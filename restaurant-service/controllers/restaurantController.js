const restaurantService = require('../services/restaurantService');

exports.list = async (_req, res) => {
  try {
    const data = await restaurantService.list();
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.listIds = async (_req, res) => {
  try {
    const data = await restaurantService.listIds();
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    // đảm bảo có owner lấy từ token
    const payload = {
      name: (req.body.name || '').trim(),
      owner: req.user?.id,             // <-- thêm dòng này
    };
    if (!payload.name) throw new Error('name is required');
    if (!payload.owner) throw new Error('owner is required');
    const doc = await restaurantService.create(payload);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
